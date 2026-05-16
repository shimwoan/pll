import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { GraphModule } from '../graph/graph.module';
import { ClassificationModule } from '../classification/classification.module';

@Module({
  imports: [GraphModule, ClassificationModule],
  providers: [EmailService],
  controllers: [EmailController],
})
export class EmailModule {}
