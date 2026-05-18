import { Injectable } from '@nestjs/common';
import * as msal from '@azure/msal-node';
import * as fs from 'fs';
import * as path from 'path';

const CACHE_FILE = path.join(process.cwd(), '.msal-cache.json');

const cachePlugin: msal.ICachePlugin = {
  beforeCacheAccess: async (ctx) => {
    if (fs.existsSync(CACHE_FILE)) {
      ctx.tokenCache.deserialize(fs.readFileSync(CACHE_FILE, 'utf8'));
    }
  },
  afterCacheAccess: async (ctx) => {
    if (ctx.cacheHasChanged) {
      fs.writeFileSync(CACHE_FILE, ctx.tokenCache.serialize());
    }
  },
};

@Injectable()
export class AuthService {
  private msalClient: msal.ConfidentialClientApplication;

  constructor() {
    this.msalClient = new msal.ConfidentialClientApplication({
      auth: {
        clientId: process.env.AZURE_CLIENT_ID!,
        clientSecret: process.env.AZURE_CLIENT_SECRET!,
        authority: `https://login.microsoftonline.com/common`,
      },
      cache: { cachePlugin },
    });
  }

  async getAuthUrl(): Promise<string> {
    return this.msalClient.getAuthCodeUrl({
      scopes: ['Mail.Read', 'User.Read', 'offline_access'],
      redirectUri: process.env.MICROSOFT_REDIRECT_URI!,
      prompt: 'select_account',
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

  async acquireSilent(userEmail: string): Promise<msal.AuthenticationResult | null> {
    const accounts = await this.msalClient.getTokenCache().getAllAccounts();
    const account = accounts.find(a => a.username?.toLowerCase() === userEmail.toLowerCase());
    if (!account) return null;
    return this.msalClient.acquireTokenSilent({
      account,
      scopes: ['Mail.Read', 'User.Read', 'offline_access'],
      forceRefresh: true,
    });
  }
}
