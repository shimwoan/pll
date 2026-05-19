import type { Response } from 'express';
export declare const sseClients: Set<Response<any, Record<string, any>>>;
export interface SseEmailPayload {
    id: string;
    actionCategory: string;
    aiSummary: string;
    subject: string;
    fromName: string;
    receivedAt: string;
    matchedCaseId: string | null;
}
export declare function broadcastSse(payload: SseEmailPayload): void;
