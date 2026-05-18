import { Client } from '@microsoft/microsoft-graph-client';
export declare class GraphService {
    getClient(accessToken: string): Client;
    getMessages(accessToken: string, top?: number): Promise<any>;
    getMessage(accessToken: string, messageId: string): Promise<any>;
    createSubscription(accessToken: string): Promise<any>;
    listSubscriptions(accessToken: string): Promise<any[]>;
    renewSubscription(accessToken: string, subscriptionId: string): Promise<any>;
    getUserProfile(accessToken: string): Promise<any>;
}
