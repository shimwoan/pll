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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuthController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const graph_service_1 = require("../graph/graph.service");
const prisma_service_1 = require("../prisma/prisma.service");
let AuthController = AuthController_1 = class AuthController {
    authService;
    graphService;
    prisma;
    logger = new common_1.Logger(AuthController_1.name);
    constructor(authService, graphService, prisma) {
        this.authService = authService;
        this.graphService = graphService;
        this.prisma = prisma;
    }
    async login(res) {
        const authUrl = await this.authService.getAuthUrl();
        res.redirect(authUrl);
    }
    async callback(code, error, req, res) {
        if (error) {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=${encodeURIComponent(error)}`);
        }
        if (!code) {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=missing_code`);
        }
        try {
            const result = await this.authService.exchangeCodeForToken(code);
            req.session.userEmail = result.account?.username;
            req.session.userName = result.account?.name;
            await this.prisma.userToken.upsert({
                where: { userEmail: result.account?.username || '' },
                create: {
                    userEmail: result.account?.username || '',
                    accessToken: result.accessToken,
                    refreshToken: result.refreshToken ?? null,
                    expiresAt: result.expiresOn || new Date(Date.now() + 3600000),
                },
                update: {
                    accessToken: result.accessToken,
                    refreshToken: result.refreshToken ?? null,
                    expiresAt: result.expiresOn || new Date(Date.now() + 3600000),
                },
            });
            if (process.env.WEBHOOK_NOTIFICATION_URL && !process.env.WEBHOOK_NOTIFICATION_URL.includes('replace-with-ngrok')) {
                this.graphService.createSubscription(result.accessToken).catch((err) => {
                    this.logger.warn('Could not create Graph subscription', err?.message);
                });
            }
            res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
        }
        catch (err) {
            this.logger.error('OAuth callback failed', err);
            res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
        }
    }
    async me(req) {
        const session = req.session;
        if (session.userEmail) {
            const token = await this.prisma.userToken.findUnique({ where: { userEmail: session.userEmail } });
            if (token)
                return { authenticated: true, email: session.userEmail, name: session.userName };
        }
        const token = await this.prisma.userToken.findFirst({ orderBy: { updatedAt: 'desc' } });
        if (!token)
            return { authenticated: false };
        const freshToken = await this.authService.acquireSilent(token.userEmail).catch(() => null);
        if (!freshToken)
            return { authenticated: false };
        session.userEmail = token.userEmail;
        session.userName = freshToken.account?.name ?? token.userEmail;
        return { authenticated: true, email: session.userEmail, name: session.userName };
    }
    logout(req, res) {
        req.session.destroy(() => {
            res.clearCookie('connect.sid');
            res.redirect(`${process.env.FRONTEND_URL}/login`);
        });
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Get)('login'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Get)('callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('error')),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "callback", null);
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "me", null);
__decorate([
    (0, common_1.Get)('logout'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "logout", null);
exports.AuthController = AuthController = AuthController_1 = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        graph_service_1.GraphService,
        prisma_service_1.PrismaService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map