import { Controller, Get, Param, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EMAIL_CUTOFF } from '../config';

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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.prisma.case.findUnique({
      where: { id },
      include: {
        emails: {
          where: { receivedAt: { gte: EMAIL_CUTOFF } },
          orderBy: { receivedAt: 'desc' },
          take: 20,
        },
      },
    });
  }
}
