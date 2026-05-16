# Email Auto-Classification System — Design Spec
**Date:** 2026-05-17  
**Project:** Pacific Liberty Law — PI Law Firm Email Automation  
**Stack:** NestJS · React · Zustand · TailwindCSS · React Hook Form · shadcn/ui · Microsoft Graph API · Prisma · PostgreSQL · Claude Haiku 4.5

---

## 1. Problem Statement

PI Law Firm CMs receive 200–300 emails/day (firm-wide 1,500–2,000/day).  
Current pain points:
- Email upload to case system is skipped (too manual, too complex)
- No auto-matching to case/claim number
- No visibility into unclassified emails
- Security emails (with hyperlinks) cannot be read by current system

Target: Auto-ingest Outlook emails → AI classify → CM confirms → uploaded to case.

---

## 2. Scope (Sample / Demo)

### In Scope
- Microsoft Outlook OAuth login (MSAL, real Azure app)
- Microsoft Graph API email ingestion (webhook subscription)
- Auto case matching (case number / claim number / sender domain)
- Claude Haiku 4.5 AI classification (category: Settlement, Medical, Client, Insurance, Police, Other)
- Emails list page (Category / Title / Owner / Date, search, filter)
- Email detail page (5-line preview, AI result, Accept / Edit)
- Unclassified inbox (unmatched emails)

### Out of Scope
- Memo feature
- ACK tracking
- Bull Queue / background notifications
- .eml / .msg file upload (future)
- Security email paste field (future)

---

## 3. Architecture

```
frontend/                    backend/
├── React + Vite             ├── NestJS
├── Zustand (state)          ├── Prisma + PostgreSQL
├── shadcn/ui + Tailwind     ├── Microsoft Graph API (MSAL)
└── React Hook Form          ├── Claude Haiku 4.5 (Anthropic SDK)
                             └── REST API
```

### Data Flow
```
Outlook Inbox
  → Microsoft Graph Webhook (new email notification)
  → NestJS EmailIngestionService
      → Case Matching (case number / claim number / sender)
      → Claude Haiku 4.5 (category classification)
      → Save to PostgreSQL (status: pending_review)
  → Frontend polling / websocket
      → CM sees email in list
      → CM clicks Accept or Edit
      → Status: confirmed → linked to case
```

---

## 4. Database Schema (Prisma)

```prisma
model Case {
  id          String   @id @default(cuid())
  caseNumber  String   @unique  // e.g. "2026-PI-001"
  claimNumber String?
  clientName  String
  handler     String
  status      String
  emails      Email[]
  createdAt   DateTime @default(now())
}

model Email {
  id               String   @id @default(cuid())
  messageId        String   @unique  // Microsoft Graph message ID
  subject          String
  bodyPreview      String   // first 5 lines
  from             String
  to               String
  receivedAt       DateTime
  rawBody          String?

  // Classification
  aiCategory       String?  // Settlement | Medical | Client | Insurance | Police | Other
  aiConfidence     Float?
  finalCategory    String?  // after CM accept/edit
  workTypeTitle    String?  // CM selected work type label

  // Case matching
  matchedCaseId    String?
  matchMethod      String?  // case_number | claim_number | sender | unmatched
  case             Case?    @relation(fields: [matchedCaseId], references: [id])

  // Status
  status           EmailStatus @default(PENDING_REVIEW)
  reviewedBy       String?
  reviewedAt       DateTime?

  // ACK (reserved for future)
  ackRequired      Boolean  @default(false)

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}

enum EmailStatus {
  PENDING_REVIEW   // AI classified, waiting CM action
  CONFIRMED        // CM accepted
  EDITED           // CM edited category/title
  UNCLASSIFIED     // no case match found
}
```

---

## 5. Backend Modules (NestJS)

### 5.1 AuthModule
- MSAL Node.js library
- `/auth/login` → redirect to Microsoft OAuth
- `/auth/callback` → receive token, store session
- `/auth/logout`
- Stores access token + refresh token in session (or DB)

### 5.2 EmailModule
- `GET /emails` — list with filters (status, category, caseId, search)
- `GET /emails/:id` — detail
- `POST /emails/webhook` — Microsoft Graph change notification endpoint
- `PATCH /emails/:id/confirm` — CM accepts AI classification
- `PATCH /emails/:id/edit` — CM edits category + work type title
- `GET /emails/unclassified` — emails with status=UNCLASSIFIED

### 5.3 ClassificationModule
- `ClassificationService.classify(email)`:
  1. Extract case/claim number from subject + body (regex)
  2. Match against Case table
  3. If no match → check sender domain against known insurance/medical domains
  4. Call Claude Haiku 4.5 with email subject + bodyPreview
  5. Return: `{ category, confidence, matchedCaseId, matchMethod }`

### 5.4 GraphModule
- Microsoft Graph API client (axios + MSAL token)
- Subscribe to mailbox change notifications (webhook)
- Fetch full email on notification
- Renew webhook subscription (24hr expiry)

---

## 6. Claude Haiku Classification Prompt

```
You are an email classifier for a Personal Injury law firm.
Classify the email into exactly one category:
- Settlement: settlement offers, negotiation, release
- Medical: medical records, billing, treatment, provider communication  
- Client: client updates, questions, calls
- Insurance: adjuster communication, coverage, liability, LOR
- Police: police reports, DMV, government agencies
- Other: anything else

Email Subject: {subject}
Email Preview: {bodyPreview}

Respond with JSON only: {"category": "...", "confidence": 0.0-1.0, "reason": "..."}
```

---

## 7. Frontend Pages

### 7.1 Layout
- Header: Pacific Liberty Law logo (PL monogram + gold border) + nav (Task / Matter / Contact / Report / Admin / **Emails**)
- Branding: black + gold (#B8960C)

### 7.2 Emails List Page (`/emails`)
Mirrors Image #8 (Memo & Emails tab style):

```
Emails                                          [+ Sync Now]
All emails received from Outlook

[All] [Pending Review] [Confirmed] [Unclassified]

Search emails...                               [Filter]

Type | Category      | Title                          | From              | Date
-----|---------------|--------------------------------|-------------------|----------
✉   | Settlement     | Re: Settlement Negotiation...  | State Farm Adj.   | May 14
✉   | Medical        | Medical Records Request        | City Medical Ctr  | May 12
⚠   | Unclassified   | FWD: Please review attached    | unknown@email.com | May 11
```

- Pinned (important) emails highlighted in yellow (same as Image #8)
- Status badges: `Pending Review` (orange) / `Confirmed` (green) / `Unclassified` (gray)
- AI confidence shown as small badge (e.g. "94%")

### 7.3 Email Detail Page (`/emails/:id`)
```
← Back to Emails

[Subject line]                                    [PENDING REVIEW badge]
From: adjuster@statefarm.com  |  May 14, 2026 2:34 PM
Matched Case: #2026-PI-001 Johnson v. State Farm   [via case number]

─── Email Preview (5 lines) ───────────────────────
Dear Ms. Kim, Following up on our previous discussion 
regarding the settlement offer for claim #SF-2024-8821.
We are prepared to offer $45,000 as full and final...
[Show full email in Outlook →]
───────────────────────────────────────────────────

─── AI Classification ──────────────────────────────
Category:    Settlement                    [94% confidence]
Reason:      Contains settlement offer language and claim number
Work Type:   [Settlement Negotiation Update ▼]  ← dropdown
───────────────────────────────────────────────────

[✓ Accept]   [✎ Edit]   [✕ Mark Unclassified]
```

### 7.4 Unclassified Page (`/emails/unclassified`)
- List of emails with no case match
- CM can manually assign to a case
- Search by sender / subject

---

## 8. Zustand Store

```typescript
interface EmailStore {
  emails: Email[]
  selectedEmail: Email | null
  filters: { status: string; category: string; search: string }
  isLoading: boolean

  fetchEmails: () => Promise<void>
  selectEmail: (id: string) => void
  confirmEmail: (id: string) => Promise<void>
  editEmail: (id: string, data: EditEmailDto) => Promise<void>
  setFilter: (key: string, value: string) => void
}
```

---

## 9. Work Type Titles (Dropdown)

Frequent categories pre-populated (auto-suggest most used):
- Settlement Negotiation Update
- Medical Records Request
- Insurance Adjuster Communication
- LOR Confirmation
- Client Status Update
- Police Report Follow-up
- Coverage / Liability Review
- DMV / Government Communication
- Other (free text input)

---

## 10. Tech Stack Versions

| Package | Version |
|---------|---------|
| NestJS | 11.x |
| React | 19.x |
| Vite | 6.x |
| Zustand | 5.x |
| TailwindCSS | 4.x |
| shadcn/ui | latest |
| React Hook Form | 7.x |
| Prisma | 6.x |
| @anthropic-ai/sdk | latest |
| @azure/msal-node | 3.x |
| @microsoft/microsoft-graph-client | 3.x |

---

## 11. Environment Variables

```env
# Backend
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
AZURE_CLIENT_ID=...
AZURE_CLIENT_SECRET=...
AZURE_TENANT_ID=...
MICROSOFT_REDIRECT_URI=http://localhost:3001/auth/callback
WEBHOOK_NOTIFICATION_URL=https://<ngrok-or-prod>/emails/webhook

# Frontend
VITE_API_URL=http://localhost:3001
```

---

## 12. Project Structure

```
pll/
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   ├── email/
│   │   ├── classification/
│   │   ├── graph/
│   │   └── prisma/
│   ├── prisma/schema.prisma
│   └── .env
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── EmailsPage.tsx
    │   │   ├── EmailDetailPage.tsx
    │   │   └── UnclassifiedPage.tsx
    │   ├── components/
    │   │   ├── EmailTable.tsx
    │   │   ├── EmailDetail.tsx
    │   │   ├── ClassificationPanel.tsx
    │   │   └── WorkTypeSelect.tsx
    │   ├── store/
    │   │   └── emailStore.ts
    │   └── lib/
    │       └── api.ts
    └── .env
```
