import type { Request, Response } from 'express';
import { EmailService } from './email.service';
import { EditEmailDto } from './dto/edit-email.dto';
export declare class EmailController {
    private readonly emailService;
    constructor(emailService: EmailService);
    sync(req: Request): Promise<{
        synced: any;
    } | {
        error: string;
    }>;
    findAll(status?: string, category?: string, search?: string): Promise<({
        case: {
            caseNumber: string;
            clientName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        matchedCaseId: string | null;
        matchMethod: string | null;
        messageId: string;
        subject: string;
        bodyPreview: string;
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
        updatedAt: Date;
    })[]>;
    findUnclassified(): Promise<{
        id: string;
        createdAt: Date;
        matchedCaseId: string | null;
        matchMethod: string | null;
        messageId: string;
        subject: string;
        bodyPreview: string;
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
        updatedAt: Date;
    }[]>;
    findOne(id: string): Promise<({
        case: {
            id: string;
            caseNumber: string;
            claimNumber: string | null;
            clientName: string;
            handler: string;
            stage: string;
            createdAt: Date;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        matchedCaseId: string | null;
        matchMethod: string | null;
        messageId: string;
        subject: string;
        bodyPreview: string;
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
        updatedAt: Date;
    }) | null>;
    confirm(id: string, req: Request): Promise<{
        id: string;
        createdAt: Date;
        matchedCaseId: string | null;
        matchMethod: string | null;
        messageId: string;
        subject: string;
        bodyPreview: string;
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
        updatedAt: Date;
    }>;
    edit(id: string, dto: EditEmailDto, req: Request): Promise<{
        id: string;
        createdAt: Date;
        matchedCaseId: string | null;
        matchMethod: string | null;
        messageId: string;
        subject: string;
        bodyPreview: string;
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
        updatedAt: Date;
    }>;
    webhook(validationToken: string, body: any, res: Response): Promise<Response<any, Record<string, any>>>;
}
