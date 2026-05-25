import { Controller, Get, Logger, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { GraphService } from '../graph/graph.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly graphService: GraphService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('login')
  async login(@Res() res: Response) {
    const authUrl = await this.authService.getAuthUrl();
    res.redirect(authUrl);
  }

  @Get('callback')
  async callback(@Query('code') code: string, @Query('error') error: string, @Req() req: Request, @Res() res: Response) {
    if (error) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=${encodeURIComponent(error)}`);
    }
    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=missing_code`);
    }
    try {
      const result = await this.authService.exchangeCodeForToken(code);

(req.session as any).userEmail = result.account?.username;
      (req.session as any).userName = result.account?.name;

      // Persist token for webhook use
      await this.prisma.userToken.upsert({
        where: { userEmail: result.account?.username || '' },
        create: {
          userEmail: result.account?.username || '',
          accessToken: result.accessToken,
          refreshToken: (result as any).refreshToken ?? null,
          expiresAt: result.expiresOn || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        update: {
          accessToken: result.accessToken,
          refreshToken: (result as any).refreshToken ?? null,
          expiresAt: result.expiresOn || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // Register webhook subscription (best-effort)
      if (process.env.WEBHOOK_NOTIFICATION_URL && !process.env.WEBHOOK_NOTIFICATION_URL.includes('replace-with-ngrok')) {
        this.graphService.createSubscription(result.accessToken).catch((err) => {
          this.logger.warn('Could not create Graph subscription', err?.message);
        });
      }

      res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
    } catch (err) {
      this.logger.error('OAuth callback failed', err);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
  }

  @Get('me')
  async me(@Req() req: Request) {
    const session = req.session as any;

    // Session intact — fast path
    if (session.userEmail) {
      const token = await this.prisma.userToken.findUnique({ where: { userEmail: session.userEmail } });
      if (token) return { authenticated: true, email: session.userEmail, name: session.userName };
    }

    // Session lost but token exists in DB — restore session silently
    const token = await this.prisma.userToken.findFirst({ orderBy: { updatedAt: 'desc' } });
    if (!token) return { authenticated: false };

    // Try to get a fresh token to confirm the account is still valid
    const freshToken = await this.authService.acquireSilent(token.userEmail).catch(() => null);
    if (!freshToken) return { authenticated: false };

    // Restore session
    session.userEmail = token.userEmail;
    session.userName = freshToken.account?.name ?? token.userEmail;

    return { authenticated: true, email: session.userEmail, name: session.userName };
  }

  @Get('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    const userEmail = (req.session as any).userEmail;
    if (userEmail) {
      await this.prisma.userToken.deleteMany({ where: { userEmail } }).catch(() => {});
    }
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.redirect(`${process.env.FRONTEND_URL}/login`);
    });
  }
}
