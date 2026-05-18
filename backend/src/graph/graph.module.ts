import { Module } from '@nestjs/common';
import { GraphService } from './graph.service';
import { WebhookRenewalService } from './webhook-renewal.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [GraphService, WebhookRenewalService],
  exports: [GraphService],
})
export class GraphModule {}
