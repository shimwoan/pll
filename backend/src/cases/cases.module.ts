import { Module } from '@nestjs/common';
import { CasesController } from './cases.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CasesController],
})
export class CasesModule {}
