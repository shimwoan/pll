# Email Auto-Classification System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a PI Law Firm email auto-ingestion and classification system where Outlook emails are received via Microsoft Graph API webhook, classified by Claude Haiku 4.5, and reviewed by CMs via a React frontend.

**Architecture:** NestJS backend handles Microsoft OAuth login, Graph API webhook ingestion, Prisma/PostgreSQL persistence, and Claude Haiku classification. React frontend (Vite) renders email list, detail, and unclassified pages using Zustand for state and shadcn/ui + Tailwind for UI.

**Tech Stack:** NestJS 11, React 19, Vite 6, Zustand 5, TailwindCSS 4, shadcn/ui, React Hook Form 7, Prisma 6, PostgreSQL, @anthropic-ai/sdk, @azure/msal-node 3, @microsoft/microsoft-graph-client 3

---

## File Map

### Backend (`backend/`)
```
src/
├── main.ts
├── app.module.ts
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   └── auth.service.ts
├── graph/
│   ├── graph.module.ts
│   └── graph.service.ts
├── classification/
│   ├── classification.module.ts
│   └── classification.service.ts
└── email/
    ├── email.module.ts
    ├── email.controller.ts
    ├── email.service.ts
    └── dto/
        ├── edit-email.dto.ts
        └── confirm-email.dto.ts
prisma/
└── schema.prisma
.env
```

### Frontend (`frontend/`)
```
src/
├── main.tsx
├── App.tsx
├── lib/
│   └── api.ts
├── store/
│   └── emailStore.ts
├── components/
│   ├── Layout.tsx
│   ├── Header.tsx
│   ├── EmailTable.tsx
│   ├── EmailStatusBadge.tsx
│   ├── CategoryBadge.tsx
│   ├── ClassificationPanel.tsx
│   └── WorkTypeSelect.tsx
└── pages/
    ├── EmailsPage.tsx
    ├── EmailDetailPage.tsx
    └── UnclassifiedPage.tsx
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `backend/` (NestJS project)
- Create: `frontend/` (Vite + React project)
- Create: `backend/.env`
- Create: `frontend/.env`

- [ ] **Step 1: Scaffold NestJS backend**

```bash
cd /Users/jaemu/workspace/pll
npx @nestjs/cli@latest new backend --package-manager npm --skip-git
```

Expected: `backend/` directory created with NestJS 11 boilerplate.

- [ ] **Step 2: Install backend dependencies**

```bash
cd /Users/jaemu/workspace/pll/backend
npm install @prisma/client prisma
npm install @azure/msal-node @microsoft/microsoft-graph-client
npm install @anthropic-ai/sdk
npm install @nestjs/config express-session
npm install -D @types/express-session
npx prisma init
```

- [ ] **Step 3: Scaffold React frontend**

```bash
cd /Users/jaemu/workspace/pll
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

- [ ] **Step 4: Install frontend dependencies**

```bash
cd /Users/jaemu/workspace/pll/frontend
npm install zustand react-hook-form @hookform/resolvers zod
npm install axios react-router-dom
npm install tailwindcss @tailwindcss/vite
npm install lucide-react class-variance-authority clsx tailwind-merge
npx shadcn@latest init
```

When prompted by shadcn init:
- Style: Default
- Base color: Zinc
- CSS variables: Yes

- [ ] **Step 5: Install shadcn components**

```bash
cd /Users/jaemu/workspace/pll/frontend
npx shadcn@latest add button badge input select table tabs card separator
```

- [ ] **Step 6: Create backend .env**

Create `backend/.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pll_email"
ANTHROPIC_API_KEY=sk-ant-replace-me
AZURE_CLIENT_ID=replace-me
AZURE_CLIENT_SECRET=replace-me
AZURE_TENANT_ID=replace-me
MICROSOFT_REDIRECT_URI=http://localhost:3001/auth/callback
WEBHOOK_NOTIFICATION_URL=https://replace-with-ngrok.ngrok.io/emails/webhook
SESSION_SECRET=replace-me-with-random-string
FRONTEND_URL=http://localhost:5173
PORT=3001
```

- [ ] **Step 7: Create frontend .env**

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:3001
```

- [ ] **Step 8: Commit**

```bash
cd /Users/jaemu/workspace/pll
git init
git add backend/package.json frontend/package.json backend/.env.example frontend/.env
git commit -m "feat: scaffold NestJS backend and React frontend"
```

---

## Task 2: Database Schema & Prisma Setup

**Files:**
- Create: `backend/prisma/schema.prisma`
- Create: `backend/src/prisma/prisma.module.ts`
- Create: `backend/src/prisma/prisma.service.ts`

- [ ] **Step 1: Write Prisma schema**

Replace `backend/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Case {
  id          String   @id @default(cuid())
  caseNumber  String   @unique
  claimNumber String?
  clientName  String
  handler     String
  stage       String   @default("Claim")
  emails      Email[]
  createdAt   DateTime @default(now())
}

model Email {
  id             String      @id @default(cuid())
  messageId      String      @unique
  subject        String
  bodyPreview    String
  fromAddress    String
  fromName       String
  toAddress      String
  receivedAt     DateTime

  aiCategory     String?
  aiConfidence   Float?
  aiReason       String?
  finalCategory  String?
  workTypeTitle  String?

  matchedCaseId  String?
  matchMethod    String?
  case           Case?       @relation(fields: [matchedCaseId], references: [id])

  status         EmailStatus @default(PENDING_REVIEW)
  reviewedBy     String?
  reviewedAt     DateTime?

  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
}

enum EmailStatus {
  PENDING_REVIEW
  CONFIRMED
  EDITED
  UNCLASSIFIED
}
```

- [ ] **Step 2: Create PostgreSQL database and run migration**

```bash
createdb pll_email
cd /Users/jaemu/workspace/pll/backend
npx prisma migrate dev --name init
npx prisma generate
```

Expected: `backend/prisma/migrations/` created, client generated.

- [ ] **Step 3: Create PrismaService**

Create `backend/src/prisma/prisma.service.ts`:
```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

- [ ] **Step 4: Create PrismaModule**

Create `backend/src/prisma/prisma.module.ts`:
```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 5: Seed mock Case data**

Create `backend/prisma/seed.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
  console.log('Seeded cases');
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

Add to `backend/package.json`:
```json
"prisma": {
  "seed": "ts-node prisma/seed.ts"
}
```

```bash
cd /Users/jaemu/workspace/pll/backend
npx prisma db seed
```

- [ ] **Step 6: Commit**

```bash
cd /Users/jaemu/workspace/pll/backend
git add prisma/ src/prisma/
git commit -m "feat: add Prisma schema, PrismaModule, and seed data"
```

---

## Task 3: App Module & Config Setup

**Files:**
- Modify: `backend/src/app.module.ts`
- Modify: `backend/src/main.ts`

- [ ] **Step 1: Update main.ts**

Replace `backend/src/main.ts`:
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as session from 'express-session';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'dev-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 },
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  await app.listen(process.env.PORT || 3001);
  console.log(`Backend running on http://localhost:${process.env.PORT || 3001}`);
}
bootstrap();
```

- [ ] **Step 2: Update app.module.ts**

Replace `backend/src/app.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { GraphModule } from './graph/graph.module';
import { ClassificationModule } from './classification/classification.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    GraphModule,
    ClassificationModule,
    EmailModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/jaemu/workspace/pll/backend
git add src/main.ts src/app.module.ts
git commit -m "feat: configure NestJS app with session, CORS, and modules"
```

---

## Task 4: Auth Module (MSAL + Microsoft OAuth)

**Files:**
- Create: `backend/src/auth/auth.module.ts`
- Create: `backend/src/auth/auth.controller.ts`
- Create: `backend/src/auth/auth.service.ts`

- [ ] **Step 1: Create AuthService**

Create `backend/src/auth/auth.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import * as msal from '@azure/msal-node';

@Injectable()
export class AuthService {
  private msalClient: msal.ConfidentialClientApplication;

  constructor() {
    this.msalClient = new msal.ConfidentialClientApplication({
      auth: {
        clientId: process.env.AZURE_CLIENT_ID!,
        clientSecret: process.env.AZURE_CLIENT_SECRET!,
        authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
      },
    });
  }

  async getAuthUrl(): Promise<string> {
    return this.msalClient.getAuthCodeUrl({
      scopes: ['Mail.Read', 'Mail.Send', 'User.Read', 'offline_access'],
      redirectUri: process.env.MICROSOFT_REDIRECT_URI!,
    });
  }

  async exchangeCodeForToken(code: string): Promise<msal.AuthenticationResult> {
    return this.msalClient.acquireTokenByCode({
      code,
      scopes: ['Mail.Read', 'Mail.Send', 'User.Read', 'offline_access'],
      redirectUri: process.env.MICROSOFT_REDIRECT_URI!,
    });
  }

  async refreshToken(refreshToken: string): Promise<msal.AuthenticationResult> {
    return this.msalClient.acquireTokenByRefreshToken({
      refreshToken,
      scopes: ['Mail.Read', 'Mail.Send', 'User.Read', 'offline_access'],
    });
  }
}
```

- [ ] **Step 2: Create AuthController**

Create `backend/src/auth/auth.controller.ts`:
```typescript
import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('login')
  async login(@Res() res: Response) {
    const authUrl = await this.authService.getAuthUrl();
    res.redirect(authUrl);
  }

  @Get('callback')
  async callback(@Query('code') code: string, @Req() req: Request, @Res() res: Response) {
    const result = await this.authService.exchangeCodeForToken(code);
    (req.session as any).accessToken = result.accessToken;
    (req.session as any).refreshToken = (result as any).refreshToken;
    (req.session as any).userEmail = result.account?.username;
    (req.session as any).userName = result.account?.name;
    res.redirect(`${process.env.FRONTEND_URL}/emails`);
  }

  @Get('me')
  me(@Req() req: Request) {
    const session = req.session as any;
    if (!session.accessToken) return { authenticated: false };
    return {
      authenticated: true,
      email: session.userEmail,
      name: session.userName,
    };
  }

  @Get('logout')
  logout(@Req() req: Request, @Res() res: Response) {
    req.session.destroy(() => {});
    res.redirect(`${process.env.FRONTEND_URL}`);
  }
}
```

- [ ] **Step 3: Create AuthModule**

Create `backend/src/auth/auth.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/jaemu/workspace/pll/backend
git add src/auth/
git commit -m "feat: add MSAL OAuth auth module for Microsoft login"
```

---

## Task 5: Graph Module (Microsoft Graph API)

**Files:**
- Create: `backend/src/graph/graph.module.ts`
- Create: `backend/src/graph/graph.service.ts`

- [ ] **Step 1: Create GraphService**

Create `backend/src/graph/graph.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { Client } from '@microsoft/microsoft-graph-client';

@Injectable()
export class GraphService {
  getClient(accessToken: string): Client {
    return Client.init({
      authProvider: (done) => done(null, accessToken),
    });
  }

  async getMessages(accessToken: string, top = 50) {
    const client = this.getClient(accessToken);
    const result = await client
      .api('/me/messages')
      .select('id,subject,bodyPreview,from,toRecipients,receivedDateTime,body')
      .top(top)
      .orderby('receivedDateTime desc')
      .get();
    return result.value;
  }

  async getMessage(accessToken: string, messageId: string) {
    const client = this.getClient(accessToken);
    return client.api(`/me/messages/${messageId}`).get();
  }

  async createSubscription(accessToken: string) {
    const client = this.getClient(accessToken);
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 23);

    return client.api('/subscriptions').post({
      changeType: 'created',
      notificationUrl: process.env.WEBHOOK_NOTIFICATION_URL,
      resource: '/me/mailFolders/inbox/messages',
      expirationDateTime: expiryDate.toISOString(),
      clientState: 'pll-email-webhook',
    });
  }

  async getUserProfile(accessToken: string) {
    const client = this.getClient(accessToken);
    return client.api('/me').select('displayName,mail,userPrincipalName').get();
  }
}
```

- [ ] **Step 2: Create GraphModule**

Create `backend/src/graph/graph.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { GraphService } from './graph.service';

@Module({
  providers: [GraphService],
  exports: [GraphService],
})
export class GraphModule {}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/jaemu/workspace/pll/backend
git add src/graph/
git commit -m "feat: add Microsoft Graph API service for email ingestion"
```

---

## Task 6: Classification Module (Claude Haiku 4.5)

**Files:**
- Create: `backend/src/classification/classification.module.ts`
- Create: `backend/src/classification/classification.service.ts`

- [ ] **Step 1: Create ClassificationService**

Create `backend/src/classification/classification.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma/prisma.service';

export interface ClassificationResult {
  category: string;
  confidence: number;
  reason: string;
  matchedCaseId: string | null;
  matchMethod: string | null;
}

const INSURANCE_DOMAINS = [
  'statefarm.com', 'allstate.com', 'geico.com', 'progressive.com',
  'farmers.com', 'usaa.com', 'libertymutual.com', 'nationwide.com',
  'travelers.com', 'aig.com',
];

const MEDICAL_DOMAINS = [
  'cedars-sinai.org', 'ucla.edu', 'usc.edu', 'kaiserpermanente.org',
];

@Injectable()
export class ClassificationService {
  private anthropic: Anthropic;

  constructor(private prisma: PrismaService) {
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async classify(email: {
    subject: string;
    bodyPreview: string;
    fromAddress: string;
  }): Promise<ClassificationResult> {
    const matchResult = await this.matchCase(email);
    const aiResult = await this.classifyWithAI(email);

    return {
      ...aiResult,
      matchedCaseId: matchResult.caseId,
      matchMethod: matchResult.method,
    };
  }

  private async matchCase(email: { subject: string; bodyPreview: string; fromAddress: string }) {
    const text = `${email.subject} ${email.bodyPreview}`;

    // Match by case number pattern e.g. 2026-PI-001
    const caseNumberMatch = text.match(/\b(\d{4}-PI-\d{3,})\b/i);
    if (caseNumberMatch) {
      const found = await this.prisma.case.findUnique({
        where: { caseNumber: caseNumberMatch[1].toUpperCase() },
      });
      if (found) return { caseId: found.id, method: 'case_number' };
    }

    // Match by claim number pattern e.g. SF-2024-8821
    const claimMatch = text.match(/\b([A-Z]{2}-\d{4}-\d{4,})\b/i);
    if (claimMatch) {
      const found = await this.prisma.case.findFirst({
        where: { claimNumber: claimMatch[1].toUpperCase() },
      });
      if (found) return { caseId: found.id, method: 'claim_number' };
    }

    // Match by sender domain
    const domain = email.fromAddress.split('@')[1]?.toLowerCase();
    if (domain) {
      const isInsurance = INSURANCE_DOMAINS.some((d) => domain.includes(d));
      const isMedical = MEDICAL_DOMAINS.some((d) => domain.includes(d));
      if (isInsurance || isMedical) {
        return { caseId: null, method: 'sender_domain' };
      }
    }

    return { caseId: null, method: null };
  }

  private async classifyWithAI(email: { subject: string; bodyPreview: string }) {
    const message = await this.anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `You are an email classifier for a Personal Injury law firm.
Classify the email into exactly one category:
- Settlement: settlement offers, negotiation, release documents
- Medical: medical records, billing, treatment, provider communication
- Client: client updates, questions, calls, personal communication
- Insurance: adjuster communication, coverage, liability, LOR
- Police: police reports, DMV, government agencies
- Other: anything else

Email Subject: ${email.subject}
Email Preview: ${email.bodyPreview}

Respond with JSON only: {"category": "Settlement|Medical|Client|Insurance|Police|Other", "confidence": 0.0, "reason": "..."}`,
        },
      ],
    });

    try {
      const text = (message.content[0] as any).text;
      const parsed = JSON.parse(text);
      return {
        category: parsed.category || 'Other',
        confidence: parsed.confidence || 0.5,
        reason: parsed.reason || '',
      };
    } catch {
      return { category: 'Other', confidence: 0.3, reason: 'Classification failed' };
    }
  }
}
```

- [ ] **Step 2: Create ClassificationModule**

Create `backend/src/classification/classification.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ClassificationService } from './classification.service';

@Module({
  providers: [ClassificationService],
  exports: [ClassificationService],
})
export class ClassificationModule {}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/jaemu/workspace/pll/backend
git add src/classification/
git commit -m "feat: add Claude Haiku 4.5 email classification service"
```

---

## Task 7: Email Module (NestJS REST API)

**Files:**
- Create: `backend/src/email/dto/edit-email.dto.ts`
- Create: `backend/src/email/email.service.ts`
- Create: `backend/src/email/email.controller.ts`
- Create: `backend/src/email/email.module.ts`

- [ ] **Step 1: Create DTOs**

Create `backend/src/email/dto/edit-email.dto.ts`:
```typescript
export class EditEmailDto {
  finalCategory?: string;
  workTypeTitle?: string;
  matchedCaseId?: string;
}
```

- [ ] **Step 2: Create EmailService**

Create `backend/src/email/email.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GraphService } from '../graph/graph.service';
import { ClassificationService } from '../classification/classification.service';
import { EditEmailDto } from './dto/edit-email.dto';
import { EmailStatus } from '@prisma/client';

@Injectable()
export class EmailService {
  constructor(
    private prisma: PrismaService,
    private graph: GraphService,
    private classification: ClassificationService,
  ) {}

  async syncEmails(accessToken: string) {
    const messages = await this.graph.getMessages(accessToken, 50);

    for (const msg of messages) {
      const existing = await this.prisma.email.findUnique({
        where: { messageId: msg.id },
      });
      if (existing) continue;

      const fromAddress = msg.from?.emailAddress?.address || '';
      const fromName = msg.from?.emailAddress?.name || '';
      const toAddress = msg.toRecipients?.[0]?.emailAddress?.address || '';
      const bodyPreview = msg.bodyPreview?.slice(0, 500) || '';

      const result = await this.classification.classify({
        subject: msg.subject || '(no subject)',
        bodyPreview,
        fromAddress,
      });

      const status = result.matchedCaseId
        ? EmailStatus.PENDING_REVIEW
        : EmailStatus.UNCLASSIFIED;

      await this.prisma.email.create({
        data: {
          messageId: msg.id,
          subject: msg.subject || '(no subject)',
          bodyPreview,
          fromAddress,
          fromName,
          toAddress,
          receivedAt: new Date(msg.receivedDateTime),
          aiCategory: result.category,
          aiConfidence: result.confidence,
          aiReason: result.reason,
          matchedCaseId: result.matchedCaseId,
          matchMethod: result.matchMethod,
          status,
        },
      });
    }

    return { synced: messages.length };
  }

  async findAll(filters: { status?: string; category?: string; search?: string }) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.category) where.aiCategory = filters.category;
    if (filters.search) {
      where.OR = [
        { subject: { contains: filters.search, mode: 'insensitive' } },
        { fromName: { contains: filters.search, mode: 'insensitive' } },
        { fromAddress: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.email.findMany({
      where,
      include: { case: { select: { caseNumber: true, clientName: true } } },
      orderBy: { receivedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.email.findUnique({
      where: { id },
      include: { case: true },
    });
  }

  async findUnclassified() {
    return this.prisma.email.findMany({
      where: { status: EmailStatus.UNCLASSIFIED },
      orderBy: { receivedAt: 'desc' },
    });
  }

  async confirm(id: string, reviewedBy: string) {
    return this.prisma.email.update({
      where: { id },
      data: {
        status: EmailStatus.CONFIRMED,
        finalCategory: (await this.prisma.email.findUnique({ where: { id } }))?.aiCategory,
        reviewedBy,
        reviewedAt: new Date(),
      },
    });
  }

  async edit(id: string, dto: EditEmailDto, reviewedBy: string) {
    return this.prisma.email.update({
      where: { id },
      data: {
        status: EmailStatus.EDITED,
        finalCategory: dto.finalCategory,
        workTypeTitle: dto.workTypeTitle,
        matchedCaseId: dto.matchedCaseId,
        reviewedBy,
        reviewedAt: new Date(),
      },
    });
  }

  async handleWebhook(body: any) {
    // Webhook validation handshake
    if (body.validationToken) return body.validationToken;
    // Full ingestion handled by syncEmails on demand in sample
    return { received: true };
  }
}
```

- [ ] **Step 3: Create EmailController**

Create `backend/src/email/email.controller.ts`:
```typescript
import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { EmailService } from './email.service';
import { EditEmailDto } from './dto/edit-email.dto';

@Controller('emails')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('sync')
  async sync(@Req() req: Request) {
    const accessToken = (req.session as any).accessToken;
    if (!accessToken) return { error: 'Not authenticated' };
    return this.emailService.syncEmails(accessToken);
  }

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.emailService.findAll({ status, category, search });
  }

  @Get('unclassified')
  findUnclassified() {
    return this.emailService.findUnclassified();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.emailService.findOne(id);
  }

  @Patch(':id/confirm')
  confirm(@Param('id') id: string, @Req() req: Request) {
    const reviewedBy = (req.session as any).userEmail || 'unknown';
    return this.emailService.confirm(id, reviewedBy);
  }

  @Patch(':id/edit')
  edit(@Param('id') id: string, @Body() dto: EditEmailDto, @Req() req: Request) {
    const reviewedBy = (req.session as any).userEmail || 'unknown';
    return this.emailService.edit(id, dto, reviewedBy);
  }

  @Post('webhook')
  async webhook(@Query('validationToken') validationToken: string, @Body() body: any, @Res() res: Response) {
    if (validationToken) {
      res.setHeader('Content-Type', 'text/plain');
      return res.send(validationToken);
    }
    const result = await this.emailService.handleWebhook(body);
    return res.json(result);
  }
}
```

- [ ] **Step 4: Create EmailModule**

Create `backend/src/email/email.module.ts`:
```typescript
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
```

- [ ] **Step 5: Start backend and verify it runs**

```bash
cd /Users/jaemu/workspace/pll/backend
npm run start:dev
```

Expected: `Backend running on http://localhost:3001` with no errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/jaemu/workspace/pll/backend
git add src/email/
git commit -m "feat: add email REST API with sync, list, detail, confirm, edit endpoints"
```

---

## Task 8: Frontend — Tailwind & Global Config

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/vite.config.ts`
- Create: `frontend/src/lib/api.ts`

- [ ] **Step 1: Configure Tailwind with brand colors**

Replace `frontend/src/index.css`:
```css
@import "tailwindcss";

:root {
  --gold: #B8960C;
  --gold-light: #D4AF37;
  --gold-border: #8B6914;
}

body {
  font-family: 'Inter', system-ui, sans-serif;
  background-color: #f8f9fa;
}
```

- [ ] **Step 2: Update vite.config.ts**

Replace `frontend/vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

- [ ] **Step 3: Create API client**

Create `frontend/src/lib/api.ts`:
```typescript
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
})

export interface Email {
  id: string
  messageId: string
  subject: string
  bodyPreview: string
  fromAddress: string
  fromName: string
  toAddress: string
  receivedAt: string
  aiCategory: string | null
  aiConfidence: number | null
  aiReason: string | null
  finalCategory: string | null
  workTypeTitle: string | null
  matchedCaseId: string | null
  matchMethod: string | null
  status: 'PENDING_REVIEW' | 'CONFIRMED' | 'EDITED' | 'UNCLASSIFIED'
  reviewedBy: string | null
  reviewedAt: string | null
  case?: { caseNumber: string; clientName: string } | null
}

export const emailApi = {
  list: (params?: { status?: string; category?: string; search?: string }) =>
    api.get<Email[]>('/emails', { params }).then((r) => r.data),

  get: (id: string) =>
    api.get<Email>(`/emails/${id}`).then((r) => r.data),

  unclassified: () =>
    api.get<Email[]>('/emails/unclassified').then((r) => r.data),

  sync: () =>
    api.post<{ synced: number }>('/emails/sync').then((r) => r.data),

  confirm: (id: string) =>
    api.patch<Email>(`/emails/${id}/confirm`).then((r) => r.data),

  edit: (id: string, data: { finalCategory?: string; workTypeTitle?: string; matchedCaseId?: string }) =>
    api.patch<Email>(`/emails/${id}/edit`, data).then((r) => r.data),
}

export const authApi = {
  me: () => api.get<{ authenticated: boolean; email?: string; name?: string }>('/auth/me').then((r) => r.data),
  login: () => { window.location.href = `${import.meta.env.VITE_API_URL}/auth/login` },
  logout: () => { window.location.href = `${import.meta.env.VITE_API_URL}/auth/logout` },
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/jaemu/workspace/pll/frontend
git add src/index.css vite.config.ts src/lib/api.ts
git commit -m "feat: configure Tailwind with PLL brand colors and API client"
```

---

## Task 9: Zustand Email Store

**Files:**
- Create: `frontend/src/store/emailStore.ts`

- [ ] **Step 1: Create emailStore**

Create `frontend/src/store/emailStore.ts`:
```typescript
import { create } from 'zustand'
import { emailApi, Email } from '@/lib/api'

interface EmailFilters {
  status: string
  category: string
  search: string
}

interface EmailStore {
  emails: Email[]
  selectedEmail: Email | null
  filters: EmailFilters
  isLoading: boolean
  isSyncing: boolean

  fetchEmails: () => Promise<void>
  fetchEmail: (id: string) => Promise<void>
  syncEmails: () => Promise<{ synced: number }>
  confirmEmail: (id: string) => Promise<void>
  editEmail: (id: string, data: { finalCategory?: string; workTypeTitle?: string; matchedCaseId?: string }) => Promise<void>
  setFilter: (key: keyof EmailFilters, value: string) => void
  clearFilters: () => void
}

export const useEmailStore = create<EmailStore>((set, get) => ({
  emails: [],
  selectedEmail: null,
  filters: { status: '', category: '', search: '' },
  isLoading: false,
  isSyncing: false,

  fetchEmails: async () => {
    set({ isLoading: true })
    try {
      const { filters } = get()
      const emails = await emailApi.list({
        status: filters.status || undefined,
        category: filters.category || undefined,
        search: filters.search || undefined,
      })
      set({ emails })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchEmail: async (id) => {
    const email = await emailApi.get(id)
    set({ selectedEmail: email })
  },

  syncEmails: async () => {
    set({ isSyncing: true })
    try {
      const result = await emailApi.sync()
      await get().fetchEmails()
      return result
    } finally {
      set({ isSyncing: false })
    }
  },

  confirmEmail: async (id) => {
    await emailApi.confirm(id)
    await get().fetchEmails()
    const updated = await emailApi.get(id)
    set({ selectedEmail: updated })
  },

  editEmail: async (id, data) => {
    await emailApi.edit(id, data)
    await get().fetchEmails()
    const updated = await emailApi.get(id)
    set({ selectedEmail: updated })
  },

  setFilter: (key, value) => {
    set((state) => ({ filters: { ...state.filters, [key]: value } }))
  },

  clearFilters: () => {
    set({ filters: { status: '', category: '', search: '' } })
  },
}))
```

- [ ] **Step 2: Commit**

```bash
cd /Users/jaemu/workspace/pll/frontend
git add src/store/emailStore.ts
git commit -m "feat: add Zustand email store with fetch, sync, confirm, edit"
```

---

## Task 10: Frontend Components

**Files:**
- Create: `frontend/src/components/Header.tsx`
- Create: `frontend/src/components/Layout.tsx`
- Create: `frontend/src/components/EmailStatusBadge.tsx`
- Create: `frontend/src/components/CategoryBadge.tsx`
- Create: `frontend/src/components/WorkTypeSelect.tsx`
- Create: `frontend/src/components/ClassificationPanel.tsx`
- Create: `frontend/src/components/EmailTable.tsx`

- [ ] **Step 1: Create Header with PLL logo**

Create `frontend/src/components/Header.tsx`:
```tsx
import { Mail, LayoutDashboard, Users, BarChart2, Settings, CheckSquare } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { authApi } from '@/lib/api'

const navItems = [
  { label: 'Task', icon: CheckSquare, href: '#' },
  { label: 'Matter', icon: LayoutDashboard, href: '#' },
  { label: 'Contact', icon: Users, href: '#' },
  { label: 'Emails', icon: Mail, href: '/emails' },
  { label: 'Report', icon: BarChart2, href: '#' },
  { label: 'Admin', icon: Settings, href: '#' },
]

export function Header({ userName }: { userName?: string }) {
  const location = useLocation()

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 flex items-center h-14 gap-8">
        {/* PLL Logo */}
        <Link to="/emails" className="flex items-center gap-3 shrink-0">
          <div
            className="w-9 h-9 flex items-center justify-center border-2 font-bold text-sm"
            style={{ borderColor: '#B8960C', color: '#B8960C' }}
          >
            PL
          </div>
          <span className="font-semibold text-gray-900 text-sm tracking-wide hidden sm:block">
            PACIFIC LIBERTY LAW
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1 flex-1">
          {navItems.map(({ label, icon: Icon, href }) => {
            const active = location.pathname.startsWith(href) && href !== '#'
            return (
              <Link
                key={label}
                to={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
                  active
                    ? 'text-blue-600 font-medium bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        {userName && (
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>{userName}</span>
            <button
              onClick={authApi.logout}
              className="text-gray-400 hover:text-gray-600 text-xs"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Create Layout**

Create `frontend/src/components/Layout.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { authApi } from '@/lib/api'
import { Header } from './Header'

export function Layout({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState<string>()

  useEffect(() => {
    authApi.me().then((r) => {
      if (r.authenticated) setUserName(r.name)
    })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header userName={userName} />
      <main className="max-w-7xl mx-auto px-6 py-6">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Create EmailStatusBadge**

Create `frontend/src/components/EmailStatusBadge.tsx`:
```tsx
const STATUS_CONFIG = {
  PENDING_REVIEW: { label: 'Pending Review', className: 'bg-amber-100 text-amber-800' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-green-100 text-green-800' },
  EDITED: { label: 'Edited', className: 'bg-blue-100 text-blue-800' },
  UNCLASSIFIED: { label: 'Unclassified', className: 'bg-gray-100 text-gray-600' },
}

export function EmailStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.UNCLASSIFIED
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
```

- [ ] **Step 4: Create CategoryBadge**

Create `frontend/src/components/CategoryBadge.tsx`:
```tsx
const CATEGORY_COLORS: Record<string, string> = {
  Settlement: 'bg-purple-100 text-purple-700',
  Medical: 'bg-blue-100 text-blue-700',
  Client: 'bg-orange-100 text-orange-700',
  Insurance: 'bg-cyan-100 text-cyan-700',
  Police: 'bg-red-100 text-red-700',
  Other: 'bg-gray-100 text-gray-600',
}

export function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return null
  const cls = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Other
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {category}
    </span>
  )
}
```

- [ ] **Step 5: Create WorkTypeSelect**

Create `frontend/src/components/WorkTypeSelect.tsx`:
```tsx
import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'

const WORK_TYPES = [
  'Settlement Negotiation Update',
  'Medical Records Request',
  'Insurance Adjuster Communication',
  'LOR Confirmation',
  'Client Status Update',
  'Police Report Follow-up',
  'Coverage / Liability Review',
  'DMV / Government Communication',
  'Other',
]

interface WorkTypeSelectProps {
  value: string
  onChange: (value: string) => void
}

export function WorkTypeSelect({ value, onChange }: WorkTypeSelectProps) {
  const [isCustom, setIsCustom] = useState(false)

  const handleSelect = (val: string) => {
    if (val === 'Other') {
      setIsCustom(true)
      onChange('')
    } else {
      setIsCustom(false)
      onChange(val)
    }
  }

  if (isCustom) {
    return (
      <Input
        placeholder="Enter custom work type..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-sm"
        autoFocus
      />
    )
  }

  return (
    <Select value={value} onValueChange={handleSelect}>
      <SelectTrigger className="h-8 text-sm w-full">
        <SelectValue placeholder="Select work type..." />
      </SelectTrigger>
      <SelectContent>
        {WORK_TYPES.map((t) => (
          <SelectItem key={t} value={t} className="text-sm">
            {t}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

- [ ] **Step 6: Create ClassificationPanel**

Create `frontend/src/components/ClassificationPanel.tsx`:
```tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { WorkTypeSelect } from './WorkTypeSelect'
import { CategoryBadge } from './CategoryBadge'
import { Email } from '@/lib/api'
import { Check, Pencil, X } from 'lucide-react'

const CATEGORIES = ['Settlement', 'Medical', 'Client', 'Insurance', 'Police', 'Other']

interface ClassificationPanelProps {
  email: Email
  onConfirm: () => void
  onEdit: (data: { finalCategory: string; workTypeTitle: string }) => void
  onUnclassify: () => void
  isLoading?: boolean
}

export function ClassificationPanel({
  email,
  onConfirm,
  onEdit,
  onUnclassify,
  isLoading,
}: ClassificationPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [category, setCategory] = useState(email.aiCategory || 'Other')
  const [workType, setWorkType] = useState(email.workTypeTitle || '')

  const handleEdit = () => {
    onEdit({ finalCategory: category, workTypeTitle: workType })
    setIsEditing(false)
  }

  const confidencePct = email.aiConfidence ? Math.round(email.aiConfidence * 100) : null

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">AI Classification</h3>
        {confidencePct && (
          <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
            {confidencePct}% confidence
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-24">Category</span>
          {isEditing ? (
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-7 text-sm flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="text-sm">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <CategoryBadge category={email.finalCategory || email.aiCategory} />
          )}
        </div>

        {email.aiReason && (
          <div className="flex items-start gap-2">
            <span className="text-xs text-gray-500 w-24 pt-0.5">Reason</span>
            <span className="text-xs text-gray-600 flex-1">{email.aiReason}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-24">Work Type</span>
          {isEditing ? (
            <div className="flex-1">
              <WorkTypeSelect value={workType} onChange={setWorkType} />
            </div>
          ) : (
            <span className="text-xs text-gray-700">
              {email.workTypeTitle || <span className="text-gray-400">Not set</span>}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        {!isEditing ? (
          <>
            {email.status === 'PENDING_REVIEW' && (
              <>
                <Button size="sm" onClick={onConfirm} disabled={isLoading} className="gap-1.5">
                  <Check size={13} /> Accept
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="gap-1.5">
                  <Pencil size={13} /> Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={onUnclassify} disabled={isLoading} className="gap-1.5 text-gray-500">
                  <X size={13} /> Unclassify
                </Button>
              </>
            )}
            {(email.status === 'CONFIRMED' || email.status === 'EDITED') && (
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="gap-1.5">
                <Pencil size={13} /> Edit
              </Button>
            )}
          </>
        ) : (
          <>
            <Button size="sm" onClick={handleEdit} disabled={isLoading}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Create EmailTable**

Create `frontend/src/components/EmailTable.tsx`:
```tsx
import { Mail, AlertTriangle } from 'lucide-react'
import { Email } from '@/lib/api'
import { CategoryBadge } from './CategoryBadge'
import { EmailStatusBadge } from './EmailStatusBadge'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'

interface EmailTableProps {
  emails: Email[]
  isLoading?: boolean
}

export function EmailTable({ emails, isLoading }: EmailTableProps) {
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">Loading emails...</div>
    )
  }

  if (!emails.length) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">No emails found.</div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 w-8"></th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Category</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Subject</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Case</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">From</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Date</th>
          </tr>
        </thead>
        <tbody>
          {emails.map((email) => (
            <tr
              key={email.id}
              onClick={() => navigate(`/emails/${email.id}`)}
              className={`border-b border-gray-100 last:border-0 cursor-pointer hover:bg-blue-50 transition-colors ${
                email.status === 'PENDING_REVIEW' ? 'bg-amber-50/40' : ''
              }`}
            >
              <td className="px-4 py-3">
                {email.status === 'UNCLASSIFIED' ? (
                  <AlertTriangle size={14} className="text-amber-500" />
                ) : (
                  <Mail size={14} className="text-blue-400" />
                )}
              </td>
              <td className="px-4 py-3">
                <CategoryBadge category={email.finalCategory || email.aiCategory} />
              </td>
              <td className="px-4 py-3 max-w-xs">
                <span className="truncate block font-medium text-gray-900">{email.subject}</span>
                <span className="truncate block text-xs text-gray-400">{email.bodyPreview.slice(0, 60)}...</span>
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {email.case ? (
                  <span className="text-blue-600 font-medium">{email.case.caseNumber}</span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-gray-600">
                <span className="block">{email.fromName || email.fromAddress}</span>
                <span className="block text-xs text-gray-400">{email.fromAddress}</span>
              </td>
              <td className="px-4 py-3">
                <EmailStatusBadge status={email.status} />
              </td>
              <td className="px-4 py-3 text-right text-gray-400 text-xs whitespace-nowrap">
                {format(new Date(email.receivedAt), 'MMM d, yyyy')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

Install date-fns:
```bash
cd /Users/jaemu/workspace/pll/frontend
npm install date-fns
```

- [ ] **Step 8: Commit**

```bash
cd /Users/jaemu/workspace/pll/frontend
git add src/components/
git commit -m "feat: add Header, Layout, EmailTable, CategoryBadge, ClassificationPanel components"
```

---

## Task 11: Frontend Pages

**Files:**
- Create: `frontend/src/pages/EmailsPage.tsx`
- Create: `frontend/src/pages/EmailDetailPage.tsx`
- Create: `frontend/src/pages/UnclassifiedPage.tsx`

- [ ] **Step 1: Create EmailsPage**

Create `frontend/src/pages/EmailsPage.tsx`:
```tsx
import { useEffect } from 'react'
import { useEmailStore } from '@/store/emailStore'
import { Layout } from '@/components/Layout'
import { EmailTable } from '@/components/EmailTable'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const TABS = [
  { label: 'All', value: '' },
  { label: 'Pending Review', value: 'PENDING_REVIEW' },
  { label: 'Confirmed', value: 'CONFIRMED' },
]

const CATEGORIES = ['Settlement', 'Medical', 'Client', 'Insurance', 'Police', 'Other']

export function EmailsPage() {
  const { emails, filters, isLoading, isSyncing, fetchEmails, syncEmails, setFilter } = useEmailStore()
  const navigate = useNavigate()

  useEffect(() => {
    fetchEmails()
  }, [filters])

  const handleSync = async () => {
    const result = await syncEmails()
    alert(`Synced ${result.synced} emails from Outlook`)
  }

  const pendingCount = emails.filter((e) => e.status === 'PENDING_REVIEW').length
  const confirmedCount = emails.filter((e) => e.status === 'CONFIRMED' || e.status === 'EDITED').length
  const unclassifiedCount = emails.filter((e) => e.status === 'UNCLASSIFIED').length

  return (
    <Layout>
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Emails</h1>
          <p className="text-sm text-gray-500 mt-1">Auto-ingested from Outlook · AI classified</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/emails/unclassified')}
            className="gap-2"
          >
            <AlertTriangle size={14} className="text-amber-500" />
            Unclassified ({unclassifiedCount})
          </Button>
          <Button size="sm" onClick={handleSync} disabled={isSyncing} className="gap-2">
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{emails.length}</div>
          <div className="text-sm text-gray-500">Total Emails</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
          <div className="text-sm text-gray-500">Pending Review</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{confirmedCount}</div>
          <div className="text-sm text-gray-500">Confirmed</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        {/* Status tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter('status', tab.value)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                filters.status === tab.value
                  ? 'bg-white text-gray-900 shadow-sm font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <Select value={filters.category} onValueChange={(v) => setFilter('category', v === 'all' ? '' : v)}>
          <SelectTrigger className="w-40 h-9 text-sm">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search */}
        <Input
          placeholder="Search emails..."
          value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)}
          className="flex-1 h-9 text-sm"
        />
      </div>

      <EmailTable emails={emails} isLoading={isLoading} />
    </Layout>
  )
}
```

- [ ] **Step 2: Create EmailDetailPage**

Create `frontend/src/pages/EmailDetailPage.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEmailStore } from '@/store/emailStore'
import { Layout } from '@/components/Layout'
import { ClassificationPanel } from '@/components/ClassificationPanel'
import { EmailStatusBadge } from '@/components/EmailStatusBadge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'

export function EmailDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { selectedEmail, fetchEmail, confirmEmail, editEmail } = useEmailStore()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (id) fetchEmail(id)
  }, [id])

  if (!selectedEmail) {
    return (
      <Layout>
        <div className="text-center py-20 text-gray-400">Loading...</div>
      </Layout>
    )
  }

  const handleConfirm = async () => {
    setIsLoading(true)
    try { await confirmEmail(selectedEmail.id) }
    finally { setIsLoading(false) }
  }

  const handleEdit = async (data: { finalCategory: string; workTypeTitle: string }) => {
    setIsLoading(true)
    try { await editEmail(selectedEmail.id, data) }
    finally { setIsLoading(false) }
  }

  const handleUnclassify = async () => {
    setIsLoading(true)
    try { await editEmail(selectedEmail.id, { finalCategory: 'Other', workTypeTitle: '' }) }
    finally { setIsLoading(false) }
  }

  const previewLines = selectedEmail.bodyPreview.split('\n').slice(0, 5).join('\n')

  return (
    <Layout>
      <Button variant="ghost" size="sm" onClick={() => navigate('/emails')} className="mb-4 gap-2 text-gray-500">
        <ArrowLeft size={14} /> Back to Emails
      </Button>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
        {/* Email header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 mb-2">{selectedEmail.subject}</h1>
            <div className="flex flex-wrap gap-3 text-sm text-gray-500">
              <span>From: <span className="text-gray-700 font-medium">{selectedEmail.fromName || selectedEmail.fromAddress}</span></span>
              <span>·</span>
              <span>{selectedEmail.fromAddress}</span>
              <span>·</span>
              <span>{format(new Date(selectedEmail.receivedAt), 'MMM d, yyyy h:mm a')}</span>
            </div>
          </div>
          <EmailStatusBadge status={selectedEmail.status} />
        </div>

        {/* Case match */}
        {selectedEmail.case && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-blue-50 rounded-lg text-sm">
            <span className="text-blue-600 font-medium">Matched Case:</span>
            <span className="text-blue-700 font-bold">{selectedEmail.case.caseNumber}</span>
            <span className="text-blue-500">·</span>
            <span className="text-blue-600">{selectedEmail.case.clientName}</span>
            <span className="text-xs text-blue-400 ml-auto">via {selectedEmail.matchMethod?.replace('_', ' ')}</span>
          </div>
        )}

        {/* Body preview */}
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email Preview (5 lines)</h3>
            <Button variant="ghost" size="sm" className="gap-1 text-xs text-gray-400 h-6 px-2">
              <ExternalLink size={11} /> Open in Outlook
            </Button>
          </div>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
            {previewLines}
          </pre>
        </div>
      </div>

      {/* Classification panel */}
      <ClassificationPanel
        email={selectedEmail}
        onConfirm={handleConfirm}
        onEdit={handleEdit}
        onUnclassify={handleUnclassify}
        isLoading={isLoading}
      />
    </Layout>
  )
}
```

- [ ] **Step 3: Create UnclassifiedPage**

Create `frontend/src/pages/UnclassifiedPage.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { Layout } from '@/components/Layout'
import { EmailTable } from '@/components/EmailTable'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { emailApi, Email } from '@/lib/api'

export function UnclassifiedPage() {
  const navigate = useNavigate()
  const [emails, setEmails] = useState<Email[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    emailApi.unclassified().then(setEmails).finally(() => setIsLoading(false))
  }, [])

  return (
    <Layout>
      <Button variant="ghost" size="sm" onClick={() => navigate('/emails')} className="mb-4 gap-2 text-gray-500">
        <ArrowLeft size={14} /> Back to Emails
      </Button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Unclassified Emails</h1>
          <p className="text-sm text-gray-500 mt-1">Emails with no matching case — manual review required</p>
        </div>
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{emails.length} emails</span>
      </div>

      <EmailTable emails={emails} isLoading={isLoading} />
    </Layout>
  )
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/jaemu/workspace/pll/frontend
git add src/pages/
git commit -m "feat: add EmailsPage, EmailDetailPage, UnclassifiedPage"
```

---

## Task 12: App Router & Entry Point

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Update App.tsx with routing**

Replace `frontend/src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { EmailsPage } from '@/pages/EmailsPage'
import { EmailDetailPage } from '@/pages/EmailDetailPage'
import { UnclassifiedPage } from '@/pages/UnclassifiedPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/emails" replace />} />
        <Route path="/emails" element={<EmailsPage />} />
        <Route path="/emails/unclassified" element={<UnclassifiedPage />} />
        <Route path="/emails/:id" element={<EmailDetailPage />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 2: Update main.tsx**

Replace `frontend/src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 3: Fix tsconfig path alias**

Add to `frontend/tsconfig.app.json` under `compilerOptions`:
```json
"baseUrl": ".",
"paths": {
  "@/*": ["./src/*"]
}
```

And add to `frontend/vite.config.ts` (already done in Task 8, verify path alias is there).

- [ ] **Step 4: Start frontend and verify**

```bash
cd /Users/jaemu/workspace/pll/frontend
npm run dev
```

Open `http://localhost:5173` — should redirect to `/emails`.

- [ ] **Step 5: Commit**

```bash
cd /Users/jaemu/workspace/pll/frontend
git add src/App.tsx src/main.tsx tsconfig.app.json
git commit -m "feat: add React Router with emails, detail, unclassified routes"
```

---

## Task 13: Azure App Registration (Manual Steps)

> This task requires manual steps in Azure Portal. Follow exactly.

- [ ] **Step 1: Create Azure App Registration**

1. Go to https://portal.azure.com
2. Search "App registrations" → New registration
3. Name: `PLL Email Classifier`
4. Supported account types: "Accounts in this organizational directory only"
5. Redirect URI: Web → `http://localhost:3001/auth/callback`
6. Click Register

- [ ] **Step 2: Copy credentials to .env**

From the app overview page:
- Application (client) ID → `AZURE_CLIENT_ID`
- Directory (tenant) ID → `AZURE_TENANT_ID`

Go to "Certificates & secrets" → New client secret → Copy value → `AZURE_CLIENT_SECRET`

- [ ] **Step 3: Add API permissions**

"API permissions" → Add permission → Microsoft Graph → Delegated:
- `Mail.Read`
- `Mail.Send`
- `User.Read`
- `offline_access`

Click "Grant admin consent"

- [ ] **Step 4: Set up ngrok for webhook**

```bash
brew install ngrok
ngrok http 3001
```

Copy the HTTPS URL (e.g. `https://abc123.ngrok.io`) → update `backend/.env`:
```
WEBHOOK_NOTIFICATION_URL=https://abc123.ngrok.io/emails/webhook
```

---

## Task 14: End-to-End Smoke Test

- [ ] **Step 1: Start PostgreSQL**

```bash
brew services start postgresql@15
```

- [ ] **Step 2: Start backend**

```bash
cd /Users/jaemu/workspace/pll/backend
npm run start:dev
```

Expected: `Backend running on http://localhost:3001`

- [ ] **Step 3: Start frontend**

```bash
cd /Users/jaemu/workspace/pll/frontend
npm run dev
```

Expected: `http://localhost:5173` opens, redirects to `/emails`

- [ ] **Step 4: Test auth flow**

Open `http://localhost:3001/auth/login` — redirects to Microsoft login.  
Login with Outlook account.  
Expected: redirected to `http://localhost:5173/emails`.

- [ ] **Step 5: Test email sync**

Click "Sync Now" button.  
Expected: API call to `POST /emails/sync`, emails appear in table.

- [ ] **Step 6: Test AI classification**

Click on any email row.  
Expected: Category badge, confidence %, AI reason shown in ClassificationPanel.

- [ ] **Step 7: Test Accept flow**

On a PENDING_REVIEW email, click "Accept".  
Expected: status badge changes to "Confirmed", row no longer highlighted amber.

- [ ] **Step 8: Test Edit flow**

On a PENDING_REVIEW email, click "Edit".  
Change category from dropdown, change work type, click "Save".  
Expected: status changes to "Edited", finalCategory updated.

- [ ] **Step 9: Test Unclassified page**

Click "Unclassified" button.  
Expected: `/emails/unclassified` shows emails with no case match.

- [ ] **Step 10: Final commit**

```bash
cd /Users/jaemu/workspace/pll
git add .
git commit -m "feat: complete email auto-classification sample — NestJS + React + Claude Haiku"
```
