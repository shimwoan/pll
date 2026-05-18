import { PrismaService } from '../prisma/prisma.service';
export interface ClassificationResult {
    category: string;
    confidence: number;
    reason: string;
    actionCategory: string;
    aiSummary: string;
    matchedCaseId: string | null;
    matchMethod: string | null;
}
export declare class ClassificationService {
    private prisma;
    private genai;
    constructor(prisma: PrismaService);
    classify(email: {
        subject: string;
        body: string;
        fromName?: string;
        fromAddress: string;
    }): Promise<ClassificationResult>;
    private matchCase;
    private classifyWithAI;
}
