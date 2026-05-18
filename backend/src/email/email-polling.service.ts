import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EmailService } from './email.service';
import { PrismaService } from '../prisma/prisma.service';
import { GraphService } from '../graph/graph.service';

@Injectable()
export class EmailPollingService {
  private readonly logger = new Logger(EmailPollingService.name);
  private isPolling = false;

  constructor(
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
    private readonly graph: GraphService,
  ) {}

  @Cron('0 */5 * * * *')
  async pollNewEmails() {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      const token = await this.prisma.userToken.findFirst({
        orderBy: { updatedAt: 'desc' },
        where: { expiresAt: { gt: new Date() } },
      });

      if (!token) return;

      const fiveMinutes = 5 * 60 * 1000;
      if (token.expiresAt.getTime() - Date.now() < fiveMinutes) {
        this.logger.warn('Access token expires within 5 minutes — polling may stop working soon');
      }

      const messages = await this.graph.getMessages(token.accessToken, 50);
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
