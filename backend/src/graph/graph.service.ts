import { Injectable } from '@nestjs/common';
import { Client } from '@microsoft/microsoft-graph-client';

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
    expiryDate.setHours(expiryDate.getHours() + 23);

    return client.api('/subscriptions').post({
      changeType: 'created',
      notificationUrl: process.env.WEBHOOK_NOTIFICATION_URL,
      resource: '/me/mailFolders/inbox/messages',
      expirationDateTime: expiryDate.toISOString(),
      clientState: 'pll-email-webhook',
    });
  }

  async getUserProfile(accessToken: string) {
    const client = this.getClient(accessToken);
    return client.api('/me').select('displayName,mail,userPrincipalName').get();
  }
}
