import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GraphService } from './graph.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebhookRenewalService {
  private readonly logger = new Logger(WebhookRenewalService.name);

  constructor(
    private readonly graph: GraphService,
    private readonly prisma: PrismaService,
  ) {}

  // Run every 6 hours
  @Cron(CronExpression.EVERY_6_HOURS)
  async renewWebhookSubscriptions() {
    const webhookUrl = process.env.WEBHOOK_NOTIFICATION_URL;
    if (!webhookUrl || webhookUrl.includes('replace-with-ngrok')) {
      this.logger.warn('Webhook URL not configured — skipping renewal');
      return;
    }

    const token = await this.prisma.userToken.findFirst({
      orderBy: { updatedAt: 'desc' },
      where: { expiresAt: { gt: new Date() } },
    });

    if (!token) {
      this.logger.warn('No valid token for webhook renewal');
      return;
    }

    try {
      const subscriptions = await this.graph.listSubscriptions(token.accessToken);
      const pllSubs = subscriptions.filter((s) => s.clientState === 'pll-email-webhook');

      if (pllSubs.length === 0) {
        this.logger.log('No active PLL subscriptions — creating new one');
        await this.graph.createSubscription(token.accessToken);
        return;
      }

      for (const sub of pllSubs) {
        await this.graph.renewSubscription(token.accessToken, sub.id);
        this.logger.log(`Renewed webhook subscription ${sub.id}`);
      }
    } catch (err) {
      this.logger.error(`Webhook renewal failed: ${err?.message}`);
    }
  }
}
