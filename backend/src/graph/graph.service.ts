import { Injectable } from '@nestjs/common';
import { Client } from '@microsoft/microsoft-graph-client';
import { EMAIL_CUTOFF } from '../config';

@Injectable()
export class GraphService {
  getClient(accessToken: string): Client {
    return Client.init({
      authProvider: (done) => done(null, accessToken),
    });
  }

  async getMessages(accessToken: string, top = 50) {
    const client = this.getClient(accessToken);
    const result = await client
      .api('/me/messages')
      .select('id,subject,bodyPreview,from,toRecipients,receivedDateTime,body,webLink')
      .filter(`receivedDateTime ge ${EMAIL_CUTOFF.toISOString()}`)
      .top(top)
      .orderby('receivedDateTime desc')
      .get();
    return result.value;
  }

  async getMessage(accessToken: string, messageId: string) {
    const client = this.getClient(accessToken);
    return client.api(`/me/messages/${messageId}`).get();
  }

  async createSubscription(accessToken: string) {
    const client = this.getClient(accessToken);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 2); // max 3 days, use 2 to be safe

    return client.api('/subscriptions').post({
      changeType: 'created',
      notificationUrl: process.env.WEBHOOK_NOTIFICATION_URL,
      resource: '/me/mailFolders/inbox/messages',
      expirationDateTime: expiryDate.toISOString(),
      clientState: process.env.WEBHOOK_CLIENT_STATE || 'pll-email-webhook',
    });
  }

  async listSubscriptions(accessToken: string) {
    const client = this.getClient(accessToken);
    const result = await client.api('/subscriptions').get();
    return result.value as any[];
  }

  async renewSubscription(accessToken: string, subscriptionId: string) {
    const client = this.getClient(accessToken);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 2);
    return client.api(`/subscriptions/${subscriptionId}`).patch({
      expirationDateTime: expiryDate.toISOString(),
    });
  }

  async getUserProfile(accessToken: string) {
    const client = this.getClient(accessToken);
    return client.api('/me').select('displayName,mail,userPrincipalName').get();
  }
}
