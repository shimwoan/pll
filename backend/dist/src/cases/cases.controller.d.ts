import { PrismaService } from '../prisma/prisma.service';
export declare class CasesController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(search?: string): import("@prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        caseNumber: string;
        claimNumbers: string[];
        clientName: string;
        handler: string;
        stage: string;
        dateOfLoss: Date | null;
        dueDate: Date | null;
    }[]>;
    findOne(id: string): import("@prisma/client").Prisma.Prisma__CaseClient<({
        emails: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            actionCategory: string | null;
            aiSummary: string | null;
            matchedCaseId: string | null;
            matchMethod: string | null;
            messageId: string;
            subject: string;
            bodyPreview: string;
            body: string | null;
            fromAddress: string;
            fromName: string;
            toAddress: string;
            receivedAt: Date;
            aiCategory: string | null;
            aiConfidence: number | null;
            aiReason: string | null;
            finalCategory: string | null;
            workTypeTitle: string | null;
            status: import("@prisma/client").$Enums.EmailStatus;
            reviewedBy: string | null;
            reviewedAt: Date | null;
            webLink: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        caseNumber: string;
        claimNumbers: string[];
        clientName: string;
        handler: string;
        stage: string;
        dateOfLoss: Date | null;
        dueDate: Date | null;
    }) | null, null, import("@prisma/client/runtime/client").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
}
