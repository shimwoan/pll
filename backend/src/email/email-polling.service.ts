import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EmailService } from './email.service';
import { PrismaService } from '../prisma/prisma.service';
import { GraphService } from '../graph/graph.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class EmailPollingService {
  private readonly logger = new Logger(EmailPollingService.name);
  private isPolling = false;

  constructor(
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
    private readonly graph: GraphService,
    private readonly auth: AuthService,
  ) {}

  @Cron('*/10 * * * * *')
  async pollNewEmails() {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      const stored = await this.prisma.userToken.findFirst({
        orderBy: { updatedAt: 'desc' },
      });

      if (!stored) return;

      // Always go through getFreshToken so expired tokens are silently refreshed via MSAL cache
      const accessToken = await this.emailService.getFreshToken(stored.userEmail);
      if (!accessToken) {
        this.logger.warn('No valid access token — re-login required');
        return;
      }

      const messages = await this.graph.getMessages(accessToken, 50);
      for (const msg of messages) {
        const existing = await this.prisma.email.findUnique({ where: { messageId: msg.id } });
        if (existing) continue;
        await this.emailService.ingestMessage(msg);
        this.logger.log(`Polled new email: ${msg.subject}`);
      }
    } catch (err) {
      this.logger.warn(`Polling failed: ${err?.message}`);
    } finally {
      this.isPolling = false;
    }
  }
}
