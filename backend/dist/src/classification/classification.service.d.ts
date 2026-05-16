import { PrismaService } from '../prisma/prisma.service';
export interface ClassificationResult {
    category: string;
    confidence: number;
    reason: string;
    matchedCaseId: string | null;
    matchMethod: string | null;
}
export declare class ClassificationService {
    private prisma;
    private anthropic;
    constructor(prisma: PrismaService);
    classify(email: {
        subject: string;
        bodyPreview: string;
        fromAddress: string;
    }): Promise<ClassificationResult>;
    private matchCase;
    private classifyWithAI;
}
