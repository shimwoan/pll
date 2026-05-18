import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { EmailService } from './email.service';
import { AuthService } from '../auth/auth.service';
import { EditEmailDto } from './dto/edit-email.dto';

@Controller('emails')
export class EmailController {
  constructor(
    private readonly emailService: EmailService,
    private readonly authService: AuthService,
  ) {}

  @Post('sync')
  async sync(@Req() req: Request) {
    const session = req.session as any;

    if (session.userEmail) {
      // Silently refresh if token is expired or close to expiry (within 5 min)
      const expiry: Date | undefined = session.tokenExpiresAt ? new Date(session.tokenExpiresAt) : undefined;
      const needsRefresh = !expiry || expiry <= new Date(Date.now() + 5 * 60 * 1000);
      if (needsRefresh) {
        try {
          const fresh = await this.authService.acquireSilent(session.userEmail);
          if (fresh) {
            session.accessToken = fresh.accessToken;
            session.tokenExpiresAt = fresh.expiresOn?.toISOString();
          }
        } catch {}
      }
      return this.emailService.syncEmails(session.accessToken);
    }

    // No session — fall back to DB-stored token (handles server restarts)
    return this.emailService.syncEmails();
  }

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.emailService.findAll({ status, category, search });
  }

  @Get('unclassified')
  findUnclassified() {
    return this.emailService.findUnclassified();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    const accessToken = (req.session as any).accessToken;
    return this.emailService.findOne(id, accessToken);
  }

  @Patch(':id/confirm')
  confirm(@Param('id') id: string, @Req() req: Request) {
    const reviewedBy = (req.session as any).userEmail || 'unknown';
    return this.emailService.confirm(id, reviewedBy);
  }

  @Patch(':id/edit')
  edit(@Param('id') id: string, @Body() dto: EditEmailDto, @Req() req: Request) {
    const reviewedBy = (req.session as any).userEmail || 'unknown';
    return this.emailService.edit(id, dto, reviewedBy);
  }

  @Patch(':id/unclassify')
  unclassify(@Param('id') id: string, @Req() req: Request) {
    const reviewedBy = (req.session as any).userEmail || 'unknown';
    return this.emailService.unclassify(id, reviewedBy);
  }

  @Post('webhook')
  async webhook(@Query('validationToken') validationToken: string, @Body() body: any, @Res() res: Response) {
    if (validationToken) {
      res.setHeader('Content-Type', 'text/plain');
      return res.send(validationToken);
    }
    const result = await this.emailService.handleWebhook(body);
    return res.json(result);
  }
}
