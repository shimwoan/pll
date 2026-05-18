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
}
