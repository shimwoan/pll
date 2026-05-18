import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { sseClients } from '../main';
import { PrismaService } from '../prisma/prisma.service';
import { GraphService } from '../graph/graph.service';
import { ClassificationService } from '../classification/classification.service';
import { AuthService } from '../auth/auth.service';
import { EditEmailDto } from './dto/edit-email.dto';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private pushSseUpdate() {
    this.logger.log(`Pushing SSE to ${sseClients.size} clients`);
    for (const res of sseClients) {
      res.write('data: new_email\n\n');
    }
  }

  constructor(
    private prisma: PrismaService,
    private graph: GraphService,
    private classification: ClassificationService,
    private auth: AuthService,
  ) {}

  private async getFreshToken(userEmail: string): Promise<string | null> {
    const stored = await this.prisma.userToken.findUnique({ where: { userEmail } });
    if (!stored) return null;
    if (stored.expiresAt > new Date()) return stored.accessToken;

    // Try MSAL silent refresh first (uses internal cache)
    try {
      const silent = await this.auth.acquireSilent(userEmail);
      if (silent) {
        await this.prisma.userToken.update({
          where: { userEmail },
          data: {
            accessToken: silent.accessToken,
            expiresAt: silent.expiresOn || new Date(Date.now() + 3600000),
          },
        });
        return silent.accessToken;
      }
    } catch {}

    // Fallback to stored refresh token
    if (!stored.refreshToken) return null;
    try {
      const result = await this.auth.refreshToken(stored.refreshToken);
      if (!result) return null;
      await this.prisma.userToken.update({
        where: { userEmail },
        data: {
          accessToken: result.accessToken,
          refreshToken: (result as any).refreshToken ?? stored.refreshToken,
          expiresAt: result.expiresOn || new Date(Date.now() + 3600000),
        },
      });
      return result.accessToken;
    } catch {
      return null;
    }
  }

  async ingestMessage(msg: any) {
    const fromAddress = msg.from?.emailAddress?.address || '';
    const fromName = msg.from?.emailAddress?.name || '';
    const toAddress = msg.toRecipients?.[0]?.emailAddress?.address || '';
    const bodyPreview = msg.bodyPreview?.slice(0, 500) || '';

    const body = msg.body?.content || bodyPreview;

    const result = await this.classification.classify({
      subject: msg.subject || '(no subject)',
      body,
      fromAddress,
      fromName,
    });

    const status = (result.matchedCaseId || result.matchMethod === 'sender_domain')
      ? 'PENDING_REVIEW'
      : 'UNCLASSIFIED';

    await this.prisma.email.upsert({
      where: { messageId: msg.id },
      create: {
        messageId: msg.id,
        subject: msg.subject || '(no subject)',
        bodyPreview,
        fromAddress,
        fromName,
        toAddress,
        receivedAt: new Date(msg.receivedDateTime),
        aiCategory: result.category,
        aiConfidence: result.confidence,
        aiReason: result.reason,
        matchedCaseId: result.matchedCaseId,
        matchMethod: result.matchMethod,
        webLink: msg.webLink || null,
        status: status as any,
      },
      update: {},
    });
  }

  async syncEmails(accessToken?: string) {
    if (!accessToken) {
      const stored = await this.prisma.userToken.findFirst({ orderBy: { updatedAt: 'desc' } });
      if (stored) accessToken = await this.getFreshToken(stored.userEmail) ?? undefined;
    }
    if (!accessToken) {
      return { synced: 0, error: 'No access token available. Please log in first.' };
    }
    let messages: any[];
    try {
      messages = await this.graph.getMessages(accessToken, 50);
    } catch (err: any) {
      const status = err?.statusCode ?? err?.code;
      if (status === 401 || status === 'InvalidAuthenticationToken') {
        return { synced: 0, error: 'Token expired. Please log out and log in again.' };
      }
      return { synced: 0, error: `Graph API error: ${err?.message ?? 'Unknown error'}` };
    }
    let ingested = 0;

    for (const msg of messages) {
      const existing = await this.prisma.email.findUnique({ where: { messageId: msg.id } });
      if (existing) continue;
      await this.ingestMessage(msg);
      ingested++;
    }

    return { synced: ingested };
  }

  async findAll(filters: { status?: string; category?: string; search?: string }) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.category) where.aiCategory = filters.category;
    if (filters.search) {
      where.OR = [
        { subject: { contains: filters.search, mode: 'insensitive' } },
        { fromName: { contains: filters.search, mode: 'insensitive' } },
        { fromAddress: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.email.findMany({
      where,
      include: { case: { select: { caseNumber: true, clientName: true } } },
      orderBy: { receivedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.email.findUnique({
      where: { id },
      include: { case: true },
    });
  }

  async findUnclassified() {
    return this.prisma.email.findMany({
      where: { status: 'UNCLASSIFIED' as any },
      orderBy: { receivedAt: 'desc' },
    });
  }

  async confirm(id: string, reviewedBy: string) {
    const email = await this.prisma.email.findUnique({ where: { id } });
    if (!email) throw new NotFoundException('Email not found');
    return this.prisma.email.update({
      where: { id },
      data: {
        status: 'CONFIRMED' as any,
        finalCategory: email.aiCategory,
        reviewedBy,
        reviewedAt: new Date(),
      },
    });
  }

  async edit(id: string, dto: EditEmailDto, reviewedBy: string) {
    return this.prisma.email.update({
      where: { id },
      data: {
        status: 'EDITED' as any,
        finalCategory: dto.finalCategory,
        workTypeTitle: dto.workTypeTitle,
        matchedCaseId: dto.matchedCaseId,
        reviewedBy,
        reviewedAt: new Date(),
      },
    });
  }

  async unclassify(id: string, reviewedBy: string) {
    return this.prisma.email.update({
      where: { id },
      data: {
        status: 'UNCLASSIFIED' as any,
        finalCategory: null,
        workTypeTitle: null,
        matchedCaseId: null,
        matchMethod: null,
        reviewedBy,
        reviewedAt: new Date(),
      },
    });
  }

  async handleWebhook(body: any) {
    this.logger.log(`Webhook received: ${body?.value?.length ?? 0} notifications`);
    if (!Array.isArray(body?.value)) return { received: true };

    const stored = await this.prisma.userToken.findFirst({ orderBy: { updatedAt: 'desc' } });
    const accessToken = stored ? await this.getFreshToken(stored.userEmail) : null;

    if (!accessToken) {
      this.logger.warn('No valid access token for webhook processing');
      return { received: true };
    }

    for (const notification of body.value) {
      if (notification.clientState !== (process.env.WEBHOOK_CLIENT_STATE || 'pll-email-webhook')) {
        this.logger.warn('Webhook clientState mismatch — ignoring');
        continue;
      }

      const messageId = notification.resourceData?.id;
      if (!messageId) continue;

      try {
        const msg = await this.graph.getMessage(accessToken, messageId);
        await this.ingestMessage(msg);
        this.pushSseUpdate();
      } catch (err) {
        this.logger.error(`Failed to ingest webhook message ${messageId}`, err);
      }
    }

    return { received: true };
  }
}
