import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
