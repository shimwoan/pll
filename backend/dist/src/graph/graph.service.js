"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphService = void 0;
const common_1 = require("@nestjs/common");
const microsoft_graph_client_1 = require("@microsoft/microsoft-graph-client");
let GraphService = class GraphService {
    getClient(accessToken) {
        return microsoft_graph_client_1.Client.init({
            authProvider: (done) => done(null, accessToken),
        });
    }
    async getMessages(accessToken, top = 50) {
        const client = this.getClient(accessToken);
        const result = await client
            .api('/me/messages')
            .select('id,subject,bodyPreview,from,toRecipients,receivedDateTime,body,webLink')
            .top(top)
            .orderby('receivedDateTime desc')
            .get();
        return result.value;
    }
    async getMessage(accessToken, messageId) {
        const client = this.getClient(accessToken);
        return client.api(`/me/messages/${messageId}`).get();
    }
    async createSubscription(accessToken) {
        const client = this.getClient(accessToken);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 2);
        return client.api('/subscriptions').post({
            changeType: 'created',
            notificationUrl: process.env.WEBHOOK_NOTIFICATION_URL,
            resource: '/me/mailFolders/inbox/messages',
            expirationDateTime: expiryDate.toISOString(),
            clientState: process.env.WEBHOOK_CLIENT_STATE || 'pll-email-webhook',
        });
    }
    async listSubscriptions(accessToken) {
        const client = this.getClient(accessToken);
        const result = await client.api('/subscriptions').get();
        return result.value;
    }
    async renewSubscription(accessToken, subscriptionId) {
        const client = this.getClient(accessToken);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 2);
        return client.api(`/subscriptions/${subscriptionId}`).patch({
            expirationDateTime: expiryDate.toISOString(),
        });
    }
    async getUserProfile(accessToken) {
        const client = this.getClient(accessToken);
        return client.api('/me').select('displayName,mail,userPrincipalName').get();
    }
};
exports.GraphService = GraphService;
exports.GraphService = GraphService = __decorate([
    (0, common_1.Injectable)()
], GraphService);
//# sourceMappingURL=graph.service.js.map