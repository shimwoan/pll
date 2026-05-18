import { EmailService } from './email.service';
import { PrismaService } from '../prisma/prisma.service';
import { GraphService } from '../graph/graph.service';
export declare class EmailPollingService {
    private readonly emailService;
    private readonly prisma;
    private readonly graph;
    private readonly logger;
    private isPolling;
    constructor(emailService: EmailService, prisma: PrismaService, graph: GraphService);
    pollNewEmails(): Promise<void>;
}
