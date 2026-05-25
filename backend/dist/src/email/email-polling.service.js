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
var EmailPollingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailPollingService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const email_service_1 = require("./email.service");
const prisma_service_1 = require("../prisma/prisma.service");
const graph_service_1 = require("../graph/graph.service");
const auth_service_1 = require("../auth/auth.service");
let EmailPollingService = EmailPollingService_1 = class EmailPollingService {
    emailService;
    prisma;
    graph;
    auth;
    logger = new common_1.Logger(EmailPollingService_1.name);
    isPolling = false;
    constructor(emailService, prisma, graph, auth) {
        this.emailService = emailService;
        this.prisma = prisma;
        this.graph = graph;
        this.auth = auth;
    }
    async pollNewEmails() {
        if (this.isPolling)
            return;
        this.isPolling = true;
        try {
            const stored = await this.prisma.userToken.findFirst({
                orderBy: { updatedAt: 'desc' },
            });
            if (!stored)
                return;
            const accessToken = await this.emailService.getFreshToken(stored.userEmail);
            if (!accessToken) {
                this.logger.warn('No valid access token — re-login required');
                return;
            }
            const messages = await this.graph.getMessages(accessToken, 50);
            for (const msg of messages) {
                const existing = await this.prisma.email.findUnique({ where: { messageId: msg.id } });
                if (existing)
                    continue;
                await this.emailService.ingestMessage(msg);
                this.logger.log(`Polled new email: ${msg.subject}`);
            }
        }
        catch (err) {
            this.logger.warn(`Polling failed: ${err?.message}`);
        }
        finally {
            this.isPolling = false;
        }
    }
};
exports.EmailPollingService = EmailPollingService;
__decorate([
    (0, schedule_1.Cron)('*/10 * * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EmailPollingService.prototype, "pollNewEmails", null);
exports.EmailPollingService = EmailPollingService = EmailPollingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [email_service_1.EmailService,
        prisma_service_1.PrismaService,
        graph_service_1.GraphService,
        auth_service_1.AuthService])
], EmailPollingService);
//# sourceMappingURL=email-polling.service.js.map