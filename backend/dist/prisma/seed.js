"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const adapter = new adapter_pg_1.PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    await prisma.case.createMany({
        data: [
            { caseNumber: 'PI251201', claimNumbers: ['SF-2024-8821'], clientName: 'Robert Johnson', handler: 'John Doe', stage: 'Claim', dateOfLoss: new Date('2025-12-15'), dueDate: new Date('2026-12-15') },
            { caseNumber: 'PI251002', claimNumbers: ['SF-2024-9012'], clientName: 'Lisa Chen', handler: 'Sarah Klein', stage: 'Medical Collection', dateOfLoss: new Date('2025-10-03'), dueDate: new Date('2027-10-03') },
            { caseNumber: 'PI250803', claimNumbers: ['AL-2025-1122'], clientName: 'Carlos Martinez', handler: 'Michael Brown', stage: 'Demand', dateOfLoss: new Date('2025-08-21'), dueDate: new Date('2027-08-21') },
            { caseNumber: 'PI250604', claimNumbers: ['GE-2025-3344'], clientName: 'David Williams', handler: 'Sarah Klein', stage: 'Negotiation', dateOfLoss: new Date('2025-06-14'), dueDate: new Date('2027-06-14') },
            { caseNumber: 'PI250405', claimNumbers: ['PR-2025-5566'], clientName: 'Maria Rodriguez', handler: 'John Doe', stage: 'Settlement', dateOfLoss: new Date('2025-04-09'), dueDate: new Date('2027-04-09') },
            { caseNumber: 'PI241106', claimNumbers: ['TT-2025-7788'], clientName: 'James Park', handler: 'Michael Brown', stage: 'Litigation', dateOfLoss: new Date('2024-11-30'), dueDate: new Date('2026-11-30') },
            { caseNumber: 'PI260107', claimNumbers: ['AA-2025-9900'], clientName: 'Angela Nguyen', handler: 'John Doe', stage: 'Claim', dateOfLoss: new Date('2026-01-22'), dueDate: new Date('2028-01-22') },
            { caseNumber: 'PI250908', claimNumbers: ['LB-2025-2233'], clientName: 'Kevin Thompson', handler: 'Sarah Klein', stage: 'Medical Collection', dateOfLoss: new Date('2025-09-17'), dueDate: new Date('2027-09-17') },
            {
                caseNumber: 'PI240312',
                claimNumbers: ['24-6123424', '7007451196-1'],
                clientName: 'Roberto Perez Hernandez',
                handler: 'Karla Barrientos',
                stage: 'Claim',
                dateOfLoss: new Date('2024-03-10'),
                dueDate: new Date('2026-03-10'),
            },
        ],
        skipDuplicates: true,
    });
    console.log('Seeded cases');
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map