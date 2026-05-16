import { Controller, Get, Logger, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { GraphService } from '../graph/graph.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly graphService: GraphService,
  ) {}

  @Get('login')
  async login(@Res() res: Response) {
    const authUrl = await this.authService.getAuthUrl();
    res.redirect(authUrl);
  }

  @Get('callback')
  async callback(@Query('code') code: string, @Req() req: Request, @Res() res: Response) {
    const result = await this.authService.exchangeCodeForToken(code);
    (req.session as any).accessToken = result.accessToken;
    (req.session as any).refreshToken = (result as any).refreshToken;
    (req.session as any).userEmail = result.account?.username;
    (req.session as any).userName = result.account?.name;

    // Register webhook subscription to auto-ingest new emails (best-effort)
    if (process.env.WEBHOOK_NOTIFICATION_URL && !process.env.WEBHOOK_NOTIFICATION_URL.includes('replace-with-ngrok')) {
      this.graphService.createSubscription(result.accessToken).catch((err) => {
        this.logger.warn('Could not create Graph subscription (ngrok URL may not be set)', err?.message);
      });
    }

    res.redirect(`${process.env.FRONTEND_URL}/emails`);
  }

  @Get('me')
  me(@Req() req: Request) {
    const session = req.session as any;
    if (!session.accessToken) return { authenticated: false };
    return {
      authenticated: true,
      email: session.userEmail,
      name: session.userName,
    };
  }

  @Get('logout')
  logout(@Req() req: Request, @Res() res: Response) {
    req.session.destroy(() => {});
    res.redirect(`${process.env.FRONTEND_URL}`);
  }
}
