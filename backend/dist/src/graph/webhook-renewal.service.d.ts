import { GraphService } from './graph.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class WebhookRenewalService {
    private readonly graph;
    private readonly prisma;
    private readonly logger;
    constructor(graph: GraphService, prisma: PrismaService);
    renewWebhookSubscriptions(): Promise<void>;
}
