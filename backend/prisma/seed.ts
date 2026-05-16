import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.case.createMany({
    data: [
      { caseNumber: '2026-PI-001', claimNumber: 'SF-2024-8821', clientName: 'Robert Johnson', handler: 'John Doe', stage: 'Claim' },
      { caseNumber: '2026-PI-002', claimNumber: 'SF-2024-9012', clientName: 'Lisa Chen', handler: 'Sarah Klein', stage: 'Medical Collection' },
      { caseNumber: '2026-PI-003', claimNumber: 'AL-2025-1122', clientName: 'Carlos Martinez', handler: 'Michael Brown', stage: 'Demand' },
      { caseNumber: '2026-PI-004', claimNumber: 'GE-2025-3344', clientName: 'David Williams', handler: 'Sarah Klein', stage: 'Negotiation' },
      { caseNumber: '2026-PI-005', claimNumber: 'PR-2025-5566', clientName: 'Maria Rodriguez', handler: 'John Doe', stage: 'Settlement' },
    ],
    skipDuplicates: true,
  });
  console.log('Seeded 5 cases');
}

main().catch(console.error).finally(() => prisma.$disconnect());
