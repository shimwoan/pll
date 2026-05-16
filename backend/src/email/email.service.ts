import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GraphService } from '../graph/graph.service';
import { ClassificationService } from '../classification/classification.service';
import { EditEmailDto } from './dto/edit-email.dto';

@Injectable()
export class EmailService {
  constructor(
    private prisma: PrismaService,
    private graph: GraphService,
    private classification: ClassificationService,
  ) {}

  async syncEmails(accessToken: string) {
    const messages = await this.graph.getMessages(accessToken, 50);

    for (const msg of messages) {
      const existing = await this.prisma.email.findUnique({
        where: { messageId: msg.id },
      });
      if (existing) continue;

      const fromAddress = msg.from?.emailAddress?.address || '';
      const fromName = msg.from?.emailAddress?.name || '';
      const toAddress = msg.toRecipients?.[0]?.emailAddress?.address || '';
      const bodyPreview = msg.bodyPreview?.slice(0, 500) || '';

      const result = await this.classification.classify({
        subject: msg.subject || '(no subject)',
        bodyPreview,
        fromAddress,
      });

      const status = result.matchedCaseId ? 'PENDING_REVIEW' : 'UNCLASSIFIED';

      await this.prisma.email.create({
        data: {
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
          status: status as any,
        },
      });
    }

    return { synced: messages.length };
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
    return this.prisma.email.update({
      where: { id },
      data: {
        status: 'CONFIRMED' as any,
        finalCategory: email?.aiCategory,
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

  async handleWebhook(body: any) {
    if (body.validationToken) return body.validationToken;
    return { received: true };
  }
}
