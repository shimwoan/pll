import { Injectable } from '@nestjs/common';
import * as msal from '@azure/msal-node';

@Injectable()
export class AuthService {
  private msalClient: msal.ConfidentialClientApplication;

  constructor() {
    this.msalClient = new msal.ConfidentialClientApplication({
      auth: {
        clientId: process.env.AZURE_CLIENT_ID!,
        clientSecret: process.env.AZURE_CLIENT_SECRET!,
        authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
      },
    });
  }

  async getAuthUrl(): Promise<string> {
    return this.msalClient.getAuthCodeUrl({
      scopes: ['Mail.Read', 'User.Read', 'offline_access'],
      redirectUri: process.env.MICROSOFT_REDIRECT_URI!,
    });
  }

  async exchangeCodeForToken(code: string): Promise<msal.AuthenticationResult> {
    return this.msalClient.acquireTokenByCode({
      code,
      scopes: ['Mail.Read', 'User.Read', 'offline_access'],
      redirectUri: process.env.MICROSOFT_REDIRECT_URI!,
    });
  }

  async refreshToken(refreshToken: string): Promise<msal.AuthenticationResult | null> {
    return this.msalClient.acquireTokenByRefreshToken({
      refreshToken,
      scopes: ['Mail.Read', 'User.Read', 'offline_access'],
    });
  }
}
