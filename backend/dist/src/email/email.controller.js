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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailController = void 0;
const common_1 = require("@nestjs/common");
const email_service_1 = require("./email.service");
const edit_email_dto_1 = require("./dto/edit-email.dto");
let EmailController = class EmailController {
    emailService;
    constructor(emailService) {
        this.emailService = emailService;
    }
    async sync(req) {
        const accessToken = req.session.accessToken;
        if (!accessToken)
            return { error: 'Not authenticated' };
        return this.emailService.syncEmails(accessToken);
    }
    findAll(status, category, search) {
        return this.emailService.findAll({ status, category, search });
    }
    findUnclassified() {
        return this.emailService.findUnclassified();
    }
    findOne(id) {
        return this.emailService.findOne(id);
    }
    confirm(id, req) {
        const reviewedBy = req.session.userEmail || 'unknown';
        return this.emailService.confirm(id, reviewedBy);
    }
    edit(id, dto, req) {
        const reviewedBy = req.session.userEmail || 'unknown';
        return this.emailService.edit(id, dto, reviewedBy);
    }
    async webhook(validationToken, body, res) {
        if (validationToken) {
            res.setHeader('Content-Type', 'text/plain');
            return res.send(validationToken);
        }
        const result = await this.emailService.handleWebhook(body);
        return res.json(result);
    }
};
exports.EmailController = EmailController;
__decorate([
    (0, common_1.Post)('sync'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "sync", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('category')),
    __param(2, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], EmailController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('unclassified'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], EmailController.prototype, "findUnclassified", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EmailController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/confirm'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], EmailController.prototype, "confirm", null);
__decorate([
    (0, common_1.Patch)(':id/edit'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, edit_email_dto_1.EditEmailDto, Object]),
    __metadata("design:returntype", void 0)
], EmailController.prototype, "edit", null);
__decorate([
    (0, common_1.Post)('webhook'),
    __param(0, (0, common_1.Query)('validationToken')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "webhook", null);
exports.EmailController = EmailController = __decorate([
    (0, common_1.Controller)('emails'),
    __metadata("design:paramtypes", [email_service_1.EmailService])
], EmailController);
//# sourceMappingURL=email.controller.js.map