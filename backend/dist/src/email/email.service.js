"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const main_1 = require("../main");
const prisma_service_1 = require("../prisma/prisma.service");
const graph_service_1 = require("../graph/graph.service");
const classification_service_1 = require("../classification/classification.service");
const auth_service_1 = require("../auth/auth.service");
let EmailService = EmailService_1 = class EmailService {
    prisma;
    graph;
    classification;
    auth;
    logger = new common_1.Logger(EmailService_1.name);
    constructor(prisma, graph, classification, auth) {
        this.prisma = prisma;
        this.graph = graph;
        this.classification = classification;
        this.auth = auth;
    }
    async getFreshToken(userEmail) {
        const stored = await this.prisma.userToken.findUnique({ where: { userEmail } });
        if (!stored)
            return null;
        if (stored.expiresAt > new Date())
            return stored.accessToken;
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
        }
        catch { }
        if (!stored.refreshToken)
            return null;
        try {
            const result = await this.auth.refreshToken(stored.refreshToken);
            if (!result)
                return null;
            await this.prisma.userToken.update({
                where: { userEmail },
                data: {
                    accessToken: result.accessToken,
                    refreshToken: result.refreshToken ?? stored.refreshToken,
                    expiresAt: result.expiresOn || new Date(Date.now() + 3600000),
                },
            });
            return result.accessToken;
        }
        catch {
            return null;
        }
    }
    async ingestMessage(msg) {
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
        const saved = await this.prisma.email.upsert({
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
                actionCategory: result.actionCategory,
                aiSummary: result.aiSummary,
                matchedCaseId: result.matchedCaseId,
                matchMethod: result.matchMethod,
                webLink: msg.webLink || null,
                status: status,
            },
            update: {},
        });
        (0, main_1.broadcastSse)({
            id: saved.id,
            actionCategory: result.actionCategory,
            aiSummary: result.aiSummary,
            subject: msg.subject || '(no subject)',
            fromName,
            receivedAt: saved.receivedAt.toISOString(),
        });
    }
    async syncEmails(accessToken) {
        if (!accessToken) {
            const stored = await this.prisma.userToken.findFirst({ orderBy: { updatedAt: 'desc' } });
            if (stored)
                accessToken = await this.getFreshToken(stored.userEmail) ?? undefined;
        }
        if (!accessToken) {
            return { synced: 0, error: 'No access token available. Please log in first.' };
        }
        let messages;
        try {
            messages = await this.graph.getMessages(accessToken, 50);
        }
        catch (err) {
            const status = err?.statusCode ?? err?.code;
            if (status === 401 || status === 'InvalidAuthenticationToken') {
                return { synced: 0, error: 'Token expired. Please log out and log in again.' };
            }
            return { synced: 0, error: `Graph API error: ${err?.message ?? 'Unknown error'}` };
        }
        let ingested = 0;
        for (const msg of messages) {
            const existing = await this.prisma.email.findUnique({ where: { messageId: msg.id } });
            if (existing)
                continue;
            await this.ingestMessage(msg);
            ingested++;
        }
        return { synced: ingested };
    }
    async findAll(filters) {
        const where = {};
        if (filters.status)
            where.status = filters.status;
        if (filters.category)
            where.aiCategory = filters.category;
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
    async findOne(id) {
        return this.prisma.email.findUnique({
            where: { id },
            include: { case: true },
        });
    }
    async findUnclassified() {
        return this.prisma.email.findMany({
            where: { status: 'UNCLASSIFIED' },
            orderBy: { receivedAt: 'desc' },
        });
    }
    async confirm(id, reviewedBy) {
        const email = await this.prisma.email.findUnique({ where: { id } });
        if (!email)
            throw new common_1.NotFoundException('Email not found');
        return this.prisma.email.update({
            where: { id },
            data: {
                status: 'CONFIRMED',
                finalCategory: email.aiCategory,
                reviewedBy,
                reviewedAt: new Date(),
            },
        });
    }
    async edit(id, dto, reviewedBy) {
        return this.prisma.email.update({
            where: { id },
            data: {
                status: 'EDITED',
                finalCategory: dto.finalCategory,
                workTypeTitle: dto.workTypeTitle,
                matchedCaseId: dto.matchedCaseId,
                reviewedBy,
                reviewedAt: new Date(),
            },
        });
    }
    async unclassify(id, reviewedBy) {
        return this.prisma.email.update({
            where: { id },
            data: {
                status: 'UNCLASSIFIED',
                finalCategory: null,
                workTypeTitle: null,
                matchedCaseId: null,
                matchMethod: null,
                reviewedBy,
                reviewedAt: new Date(),
            },
        });
    }
    async handleWebhook(body) {
        this.logger.log(`Webhook received: ${body?.value?.length ?? 0} notifications`);
        if (!Array.isArray(body?.value))
            return { received: true };
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
            if (!messageId)
                continue;
            try {
                const msg = await this.graph.getMessage(accessToken, messageId);
                await this.ingestMessage(msg);
            }
            catch (err) {
                this.logger.error(`Failed to ingest webhook message ${messageId}`, err);
            }
        }
        return { received: true };
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        graph_service_1.GraphService,
        classification_service_1.ClassificationService,
        auth_service_1.AuthService])
], EmailService);
//# sourceMappingURL=email.service.js.map