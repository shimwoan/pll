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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const graph_service_1 = require("../graph/graph.service");
const classification_service_1 = require("../classification/classification.service");
let EmailService = class EmailService {
    prisma;
    graph;
    classification;
    constructor(prisma, graph, classification) {
        this.prisma = prisma;
        this.graph = graph;
        this.classification = classification;
    }
    async syncEmails(accessToken) {
        const messages = await this.graph.getMessages(accessToken, 50);
        for (const msg of messages) {
            const existing = await this.prisma.email.findUnique({
                where: { messageId: msg.id },
            });
            if (existing)
                continue;
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
                    status: status,
                },
            });
        }
        return { synced: messages.length };
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
        return this.prisma.email.update({
            where: { id },
            data: {
                status: 'CONFIRMED',
                finalCategory: email?.aiCategory,
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
    async handleWebhook(body) {
        if (body.validationToken)
            return body.validationToken;
        return { received: true };
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        graph_service_1.GraphService,
        classification_service_1.ClassificationService])
], EmailService);
//# sourceMappingURL=email.service.js.map