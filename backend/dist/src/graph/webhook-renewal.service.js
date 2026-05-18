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
var WebhookRenewalService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookRenewalService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const graph_service_1 = require("./graph.service");
const prisma_service_1 = require("../prisma/prisma.service");
let WebhookRenewalService = WebhookRenewalService_1 = class WebhookRenewalService {
    graph;
    prisma;
    logger = new common_1.Logger(WebhookRenewalService_1.name);
    constructor(graph, prisma) {
        this.graph = graph;
        this.prisma = prisma;
    }
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
        }
        catch (err) {
            this.logger.error(`Webhook renewal failed: ${err?.message}`);
        }
    }
};
exports.WebhookRenewalService = WebhookRenewalService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_6_HOURS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WebhookRenewalService.prototype, "renewWebhookSubscriptions", null);
exports.WebhookRenewalService = WebhookRenewalService = WebhookRenewalService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [graph_service_1.GraphService,
        prisma_service_1.PrismaService])
], WebhookRenewalService);
//# sourceMappingURL=webhook-renewal.service.js.map