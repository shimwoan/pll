import * as msal from '@azure/msal-node';
export declare class AuthService {
    private msalClient;
    constructor();
    getAuthUrl(): Promise<string>;
    exchangeCodeForToken(code: string): Promise<msal.AuthenticationResult>;
    refreshToken(refreshToken: string): Promise<msal.AuthenticationResult | null>;
    acquireSilent(userEmail: string): Promise<msal.AuthenticationResult | null>;
}
