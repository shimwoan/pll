import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('cases')
export class CasesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    const where: any = search
      ? {
          OR: [
            { caseNumber: { contains: search, mode: 'insensitive' } },
            { clientName: { contains: search, mode: 'insensitive' } },
            { handler: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined;

    return this.prisma.case.findMany({ where, orderBy: { createdAt: 'desc' } });
  }
}
