import { EmailService } from './email.service';
import { PrismaService } from '../prisma/prisma.service';
import { GraphService } from '../graph/graph.service';
import { AuthService } from '../auth/auth.service';
export declare class EmailPollingService {
    private readonly emailService;
    private readonly prisma;
    private readonly graph;
    private readonly auth;
    private readonly logger;
    private isPolling;
    constructor(emailService: EmailService, prisma: PrismaService, graph: GraphService, auth: AuthService);
    pollNewEmails(): Promise<void>;
}
