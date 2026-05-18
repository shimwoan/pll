import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { EmailPollingService } from './email-polling.service';
import { GraphModule } from '../graph/graph.module';
import { ClassificationModule } from '../classification/classification.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [GraphModule, ClassificationModule, PrismaModule, AuthModule],
  providers: [EmailService, EmailPollingService],
  controllers: [EmailController],
})
export class EmailModule {}
