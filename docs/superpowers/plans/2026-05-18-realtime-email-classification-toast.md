# Realtime Email Classification + Toast Notification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이메일 실시간 수신 시 PHI 마스킹 후 Gemini API로 행동 카테고리 분류 + 한 줄 요약을 생성하고, 화면 우측 하단에 삭제 불가 누적 Toast로 표시한다.

**Architecture:** 백엔드에서 `classification.service.ts`가 PHI 마스킹(이메일 주소 제외) → Gemini 1회 호출로 `actionCategory` + `aiSummary` 생성 → DB 저장 → SSE JSON payload push. 프론트엔드는 SSE에서 Toast item을 받아 `emailStore`의 `toasts` 배열에 추가하고, `ToastPanel` 컴포넌트가 fixed position으로 우측 하단에 내부 스크롤로 렌더링한다.

**Tech Stack:** NestJS, Prisma (PostgreSQL), `@google/genai` (Gemini 2.5 Flash), React, Zustand, Tailwind CSS

---

## File Map

| 파일 | 변경 |
|---|---|
| `backend/src/classification/phi-masker.ts` | 수정 — 한국어 이름, DOL 날짜 패턴 추가 |
| `backend/src/classification/phi-masker.spec.ts` | 수정 — 새 패턴 테스트 추가 |
| `backend/src/classification/classification.service.ts` | 수정 — 프롬프트 교체, 반환 타입 확장 |
| `backend/prisma/schema.prisma` | 수정 — `actionCategory`, `aiSummary` 필드 추가 |
| `backend/src/email/email.service.ts` | 수정 — SSE payload JSON화, 새 필드 저장 |
| `backend/src/main.ts` | 수정 — SSE JSON 브로드캐스트 함수 export |
| `frontend/src/lib/api.ts` | 수정 — `Email` 타입에 새 필드 추가 |
| `frontend/src/store/emailStore.ts` | 수정 — `toasts` 상태 + `addToast` 액션 추가 |
| `frontend/src/components/ToastPanel.tsx` | 신규 — Toast 패널 컴포넌트 |
| `frontend/src/App.tsx` | 수정 — `ToastPanel` 전역 마운트, SSE 로직 이동 |

---

## Task 1: phi-masker.ts — 한국어 이름 + DOL 날짜 패턴 추가

**Files:**
- Modify: `backend/src/classification/phi-masker.ts`
- Modify: `backend/src/classification/phi-masker.spec.ts`

- [ ] **Step 1: 기존 테스트 실행 확인**

```bash
cd backend && npx jest phi-masker --no-coverage
```
Expected: 기존 테스트 모두 PASS

- [ ] **Step 2: 새 실패 테스트 작성**

`backend/src/classification/phi-masker.spec.ts` 파일 끝에 추가:

```typescript
describe('Korean name masking', () => {
  it('masks Korean full name after 고객:', () => {
    expect(maskPhi('고객: 김민준')).toContain('[NAME]')
    expect(maskPhi('고객: 김민준')).not.toContain('김민준')
  })

  it('masks Korean name after 의뢰인:', () => {
    expect(maskPhi('의뢰인: 박서연입니다')).toContain('[NAME]')
  })

  it('masks Korean name after Dear/안녕하세요', () => {
    expect(maskPhi('안녕하세요 이준호 고객님')).toContain('[NAME]')
  })

  it('does not mask single Korean char', () => {
    expect(maskPhi('안')).toBe('안')
  })
})

describe('DOL date masking', () => {
  it('masks DOL date pattern', () => {
    expect(maskPhi('DOL 04/20/2025')).toContain('[DOL]')
    expect(maskPhi('DOL 04/20/2025')).not.toContain('04/20/2025')
  })

  it('masks DOL with colon', () => {
    expect(maskPhi('DOL: 03/24/2024')).toContain('[DOL]')
  })

  it('masks Date of Loss pattern', () => {
    expect(maskPhi('Date of Loss: 03/24/2024')).toContain('[DOL]')
  })
})
```

- [ ] **Step 3: 테스트 실패 확인**

```bash
cd backend && npx jest phi-masker --no-coverage
```
Expected: 새 테스트들 FAIL

- [ ] **Step 4: phi-masker.ts 패턴 추가**

`backend/src/classification/phi-masker.ts`의 `PHI_PATTERNS` 배열 끝 (`];` 바로 앞)에 추가:

```typescript
  // DOL (Date of Loss): "DOL 04/20/2025", "DOL: 03/24/2024", "Date of Loss: ..."
  { pattern: /\b(?:DOL|Date\s+of\s+Loss)[:\s]+\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/gi, replacement: '[DOL]' },
```

그리고 `FORMAL_LABEL_PATTERN` 상수를 아래로 교체:

```typescript
const FORMAL_LABEL_PATTERN = /\b(?:Patient|Client|Claimant|고객|의뢰인|환자)[:,：\s]+([가-힣]{2,4}|[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/g;
```

그리고 파일 끝 `maskPhi` 함수의 salutation replace 블록 아래에 추가:

```typescript
  // Mask Korean names after Korean salutations
  masked = masked.replace(/(?:안녕하세요|안녕히\s*계세요)\s+([가-힣]{2,4})\s*(?:고객님|님|씨)?/g,
    (match, name) => match.replace(name, '[NAME]'));
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
cd backend && npx jest phi-masker --no-coverage
```
Expected: 모든 테스트 PASS

- [ ] **Step 6: 커밋**

```bash
cd backend && git add src/classification/phi-masker.ts src/classification/phi-masker.spec.ts
git commit -m "feat: add Korean name and DOL date masking to phi-masker"
```

---

## Task 2: Prisma 스키마 — actionCategory, aiSummary 필드 추가

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: 스키마 수정**

`backend/prisma/schema.prisma`의 `Email` 모델에서 `aiReason` 필드 바로 아래에 추가:

```prisma
  actionCategory String?
  aiSummary      String?
```

- [ ] **Step 2: 마이그레이션 생성 및 적용**

```bash
cd backend && npx prisma migrate dev --name add_action_category_ai_summary
```
Expected: Migration created and applied. Prisma Client regenerated.

- [ ] **Step 3: 커밋**

```bash
cd backend && git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add actionCategory and aiSummary fields to Email model"
```

---

## Task 3: classification.service.ts — 프롬프트 교체 + 반환 타입 확장

**Files:**
- Modify: `backend/src/classification/classification.service.ts`

- [ ] **Step 1: `ClassificationResult` 인터페이스 확장**

파일 상단의 `ClassificationResult` 인터페이스를 아래로 교체:

```typescript
export interface ClassificationResult {
  category: string;
  confidence: number;
  reason: string;
  actionCategory: string;
  aiSummary: string;
  matchedCaseId: string | null;
  matchMethod: string | null;
}
```

- [ ] **Step 2: `classifyWithAI` 메서드 교체**

기존 `classifyWithAI` 메서드 전체를 아래로 교체:

```typescript
private async classifyWithAI(email: { subject: string; body: string; fromName?: string }) {
  const subject = maskPhi(email.subject, email.fromName);
  const body = maskPhi(email.body, email.fromName);

  const ACTION_CATEGORIES = ['답변 필요', '서류 제출', '답변 확인', '검토 필요', '참고', '미정'] as const;

  const response = await this.genai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `당신은 PI(Personal Injury) 법무법인의 이메일 분류 AI입니다.

아래 이메일을 분석해 다음 6개 중 정확히 하나의 action_category를 선택하세요:
- "답변 필요": 상대방(보험사, 병원, 고객 등)이 자료·정보·회신을 명시적으로 요청한 경우
- "서류 제출": Lien 서명, 자료 반송, 첨부파일 전달이 필요한 경우
- "답변 확인": 우리가 보낸 이메일에 대해 상대방 회신이 왔는지 팔로업이 필요한 경우
- "검토 필요": 내용이 불명확하거나 복합적이어서 담당자 검토가 필요한 경우
- "참고": 단순 안내, Thank you, 별도 액션 불필요한 경우
- "미정": 위 5개 중 명확히 해당하지 않는 경우

아울러 이메일 내용을 한국어로 한 줄(30자 이내)로 요약하세요.

[이메일 정보]
발신자: ${subject ? email.fromName ?? '' : ''}
제목: ${subject}
본문: ${body}

JSON만 출력하세요:
{"action_category": "...", "summary": "..."}`,
    config: { maxOutputTokens: 256 },
  });

  try {
    const raw = (response.text ?? '').replace(/\`\`\`json\s*|\s*\`\`\`/g, '').trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    const actionCategory = ACTION_CATEGORIES.includes(parsed.action_category) ? parsed.action_category : '미정';
    return {
      actionCategory,
      aiSummary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 60) : '',
    };
  } catch {
    return { actionCategory: '미정', aiSummary: '' };
  }
}
```

- [ ] **Step 3: `classify` 메서드 — body 파라미터 추가, 반환값 통합**

기존 `classify` 메서드를 아래로 교체:

```typescript
async classify(email: {
  subject: string;
  body: string;
  fromName?: string;
  fromAddress: string;
}): Promise<ClassificationResult> {
  const matchResult = await this.matchCase(email);
  const aiResult = await this.classifyWithAI(email);

  return {
    category: aiResult.actionCategory,
    confidence: 1.0,
    reason: aiResult.aiSummary,
    actionCategory: aiResult.actionCategory,
    aiSummary: aiResult.aiSummary,
    matchedCaseId: matchResult.caseId,
    matchMethod: matchResult.method,
  };
}
```

- [ ] **Step 4: 빌드 확인**

```bash
cd backend && npx tsc --noEmit
```
Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
cd backend && git add src/classification/classification.service.ts
git commit -m "feat: update classification to use action categories and AI summary"
```

---

## Task 4: email.service.ts + main.ts — SSE JSON payload, 새 필드 저장

**Files:**
- Modify: `backend/src/email/email.service.ts`
- Modify: `backend/src/main.ts`

- [ ] **Step 1: main.ts — SSE JSON 브로드캐스트 함수 추가**

`backend/src/main.ts`에서 `export const sseClients` 바로 아래에 추가:

```typescript
export interface SseEmailPayload {
  id: string;
  actionCategory: string;
  aiSummary: string;
  subject: string;
  fromName: string;
  receivedAt: string;
}

export function broadcastSse(payload: SseEmailPayload) {
  const data = JSON.stringify({ type: 'new_email', email: payload });
  for (const res of sseClients) {
    res.write(`data: ${data}\n\n`);
  }
}
```

- [ ] **Step 2: email.service.ts — import 추가**

`email.service.ts` 상단의 `import { sseClients }` 줄을 아래로 교체:

```typescript
import { broadcastSse } from '../main';
```

- [ ] **Step 3: email.service.ts — `pushSseUpdate` 메서드 제거 및 `ingestMessage` 수정**

기존 `pushSseUpdate` private 메서드를 삭제하고, `ingestMessage` 메서드를 아래로 교체:

```typescript
async ingestMessage(msg: any) {
  const fromAddress = msg.from?.emailAddress?.address || '';
  const fromName = msg.from?.emailAddress?.name || '';
  const toAddress = msg.toRecipients?.[0]?.emailAddress?.address || '';
  const body = msg.body?.content || msg.bodyPreview || '';
  const bodyPreview = msg.bodyPreview?.slice(0, 500) || '';

  const result = await this.classification.classify({
    subject: msg.subject || '(no subject)',
    body,
    fromAddress,
    fromName,
  });

  const status = (result.matchedCaseId || result.matchMethod === 'sender_domain')
    ? 'PENDING_REVIEW'
    : 'UNCLASSIFIED';

  const saved = await this.prisma.email.upsert({
    where: { messageId: msg.id },
    create: {
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
      actionCategory: result.actionCategory,
      aiSummary: result.aiSummary,
      matchedCaseId: result.matchedCaseId,
      matchMethod: result.matchMethod,
      webLink: msg.webLink || null,
      status: status as any,
    },
    update: {},
  });

  broadcastSse({
    id: saved.id,
    actionCategory: result.actionCategory,
    aiSummary: result.aiSummary,
    subject: msg.subject || '(no subject)',
    fromName,
    receivedAt: saved.receivedAt.toISOString(),
  });
}
```

- [ ] **Step 4: 빌드 확인**

```bash
cd backend && npx tsc --noEmit
```
Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
cd backend && git add src/email/email.service.ts src/main.ts
git commit -m "feat: broadcast SSE JSON payload with actionCategory and aiSummary"
```

---

## Task 5: 프론트엔드 타입 + 스토어 — Toast 상태 추가

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/store/emailStore.ts`

- [ ] **Step 1: api.ts — Email 타입 + ToastItem 타입 추가**

`frontend/src/lib/api.ts`의 `Email` 인터페이스에 필드 추가:

```typescript
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
  actionCategory: string | null   // 추가
  aiSummary: string | null        // 추가
  finalCategory: string | null
  workTypeTitle: string | null
  matchedCaseId: string | null
  matchMethod: string | null
  status: 'PENDING_REVIEW' | 'CONFIRMED' | 'EDITED' | 'UNCLASSIFIED'
  webLink: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  case?: { caseNumber: string; clientName: string } | null
}
```

그리고 파일 끝에 추가:

```typescript
export interface ToastItem {
  id: string
  actionCategory: string
  aiSummary: string
  subject: string
  fromName: string
  receivedAt: string
}
```

- [ ] **Step 2: emailStore.ts — toasts 상태 + addToast 추가**

`frontend/src/store/emailStore.ts` 상단에 import 추가:

```typescript
import type { Email, ToastItem } from '@/lib/api'
```

`EmailStore` 인터페이스에 추가:

```typescript
  toasts: ToastItem[]
  addToast: (item: ToastItem) => void
```

`create<EmailStore>` 초기값에 추가:

```typescript
  toasts: [],
```

`create<EmailStore>` 액션에 추가:

```typescript
  addToast: (item) => {
    set((state) => ({ toasts: [item, ...state.toasts] }))
  },
```

- [ ] **Step 3: 타입 체크**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
cd frontend && git add src/lib/api.ts src/store/emailStore.ts
git commit -m "feat: add ToastItem type and toasts state to emailStore"
```

---

## Task 6: ToastPanel 컴포넌트 신규 작성

**Files:**
- Create: `frontend/src/components/ToastPanel.tsx`

- [ ] **Step 1: 카테고리 색상 상수 정의 및 컴포넌트 작성**

`frontend/src/components/ToastPanel.tsx` 파일 생성:

```typescript
import { useNavigate } from 'react-router-dom'
import { useEmailStore } from '@/store/emailStore'
import type { ToastItem } from '@/lib/api'

const CATEGORY_STYLE: Record<string, { border: string; shadow: string; dot: string; text: string }> = {
  '답변 필요': {
    border: 'border-red-300',
    shadow: '[box-shadow:0_2px_8px_rgba(239,68,68,0.10),0_1px_3px_rgba(0,0,0,0.04)]',
    dot: 'bg-red-300',
    text: 'text-red-600',
  },
  '서류 제출': {
    border: 'border-amber-300',
    shadow: '[box-shadow:0_2px_8px_rgba(245,158,11,0.10),0_1px_3px_rgba(0,0,0,0.04)]',
    dot: 'bg-amber-300',
    text: 'text-amber-700',
  },
  '답변 확인': {
    border: 'border-blue-300',
    shadow: '[box-shadow:0_2px_8px_rgba(59,130,246,0.10),0_1px_3px_rgba(0,0,0,0.04)]',
    dot: 'bg-blue-300',
    text: 'text-blue-600',
  },
  '검토 필요': {
    border: 'border-violet-300',
    shadow: '[box-shadow:0_2px_8px_rgba(139,92,246,0.10),0_1px_3px_rgba(0,0,0,0.04)]',
    dot: 'bg-violet-300',
    text: 'text-violet-600',
  },
}

const DEFAULT_STYLE = {
  border: 'border-gray-200',
  shadow: '[box-shadow:0_1px_3px_rgba(0,0,0,0.04)]',
  dot: 'bg-gray-300',
  text: 'text-gray-400',
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return '방금'
  if (diff < 3600) return `${Math.floor(diff / 60)}분`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간`
  return `${Math.floor(diff / 86400)}일`
}

function ToastCard({ item }: { item: ToastItem }) {
  const navigate = useNavigate()
  const style = CATEGORY_STYLE[item.actionCategory] ?? DEFAULT_STYLE

  return (
    <div
      onClick={() => navigate(`/emails/${item.id}`)}
      className={`bg-white rounded-lg border ${style.border} ${style.shadow} px-3.5 py-2.5 cursor-pointer hover:brightness-95 transition-all`}
    >
      <div className="flex items-start gap-2.5">
        <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${style.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-0.5">
            <span className={`text-[10px] font-semibold tracking-wide ${style.text}`}>
              {item.actionCategory}
            </span>
            <span className="text-[10px] text-gray-300">{timeAgo(item.receivedAt)}</span>
          </div>
          <p className="text-[11px] font-medium text-gray-700 truncate">{item.subject}</p>
          {item.aiSummary && (
            <p className="text-[10px] text-gray-400 truncate mt-0.5">{item.aiSummary}</p>
          )}
          <p className="text-[10px] text-gray-300 mt-0.5">{item.fromName}</p>
        </div>
      </div>
    </div>
  )
}

export function ToastPanel() {
  const toasts = useEmailStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 w-72 max-h-[calc(100vh-80px)] overflow-y-auto flex flex-col gap-1.5">
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: 타입 체크**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
cd frontend && git add src/components/ToastPanel.tsx
git commit -m "feat: add ToastPanel component with action category color coding"
```

---

## Task 7: App.tsx — SSE 로직 이동 + ToastPanel 전역 마운트

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/EmailsPage.tsx`

- [ ] **Step 1: EmailsPage.tsx — SSE useEffect 제거**

`frontend/src/pages/EmailsPage.tsx`에서 SSE 관련 `useEffect` 블록을 찾아 삭제:

```typescript
// 이 블록 삭제
useEffect(() => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
  const es = new EventSource(`${apiUrl}/emails/events`, { withCredentials: true })
  es.onopen = () => console.log('[SSE] connected')
  es.onmessage = () => { console.log('[SSE] new_email'); fetchEmails(true) }
  es.onerror = (e) => console.warn('[SSE] error', e)
  // ...
}, [])
```

- [ ] **Step 2: App.tsx — SSE 연결 + ToastPanel 마운트**

`frontend/src/App.tsx` 전체를 아래로 교체:

```typescript
import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { EmailsPage } from '@/pages/EmailsPage'
import { EmailDetailPage } from '@/pages/EmailDetailPage'
import { UnclassifiedPage } from '@/pages/UnclassifiedPage'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ToastPanel } from '@/components/ToastPanel'
import { authApi } from '@/lib/api'
import { useEmailStore } from '@/store/emailStore'

export const UserContext = React.createContext<string | undefined>(undefined)

function ProtectedRoute({ children, authenticated }: { children: React.ReactNode; authenticated: boolean | null }) {
  if (authenticated === null) return null
  if (!authenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function SseListener() {
  const { fetchEmails, addToast } = useEmailStore()

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    const es = new EventSource(`${apiUrl}/emails/events`, { withCredentials: true })

    es.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data)
        if (parsed.type === 'new_email' && parsed.email) {
          addToast(parsed.email)
        }
      } catch {
        // legacy plain-text event — fallback
      }
      fetchEmails(true)
    }

    es.onerror = () => es.close()

    return () => es.close()
  }, [])

  return null
}

export default function App() {
  const [userName, setUserName] = useState<string | undefined>(undefined)
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    authApi.me().then((r) => {
      setAuthenticated(r.authenticated)
      if (r.authenticated) setUserName(r.name)
    }).catch(() => setAuthenticated(false))
  }, [])

  return (
    <UserContext.Provider value={userName}>
      <BrowserRouter>
        {authenticated && <SseListener />}
        {authenticated && <ToastPanel />}
        <Routes>
          <Route path="/login" element={authenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<ProtectedRoute authenticated={authenticated}><DashboardPage /></ProtectedRoute>} />
          <Route path="/emails" element={<ProtectedRoute authenticated={authenticated}><EmailsPage /></ProtectedRoute>} />
          <Route path="/emails/unclassified" element={<ProtectedRoute authenticated={authenticated}><UnclassifiedPage /></ProtectedRoute>} />
          <Route path="/emails/:id" element={<ProtectedRoute authenticated={authenticated}><EmailDetailPage /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </UserContext.Provider>
  )
}
```

- [ ] **Step 3: 타입 체크**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
cd frontend && git add src/App.tsx src/pages/EmailsPage.tsx
git commit -m "feat: mount ToastPanel globally and move SSE listener to App"
```

---

## Task 8: 통합 확인

- [ ] **Step 1: 백엔드 빌드 및 실행**

```bash
cd backend && npm run build && npm run start:dev
```
Expected: 에러 없이 시작

- [ ] **Step 2: 프론트엔드 실행**

```bash
cd frontend && npm run dev
```
Expected: http://localhost:5173 접속 가능

- [ ] **Step 3: 수동 webhook 테스트**

```bash
curl -X POST http://localhost:3001/emails/sync \
  -H "Cookie: $(cat cookies.txt | grep connect.sid | awk '{print $7}')"
```
Expected: `{"synced": N}` 반환, 새 이메일 있으면 Toast 패널에 표시됨

- [ ] **Step 4: Toast 동작 확인 체크리스트**
  - [ ] 이메일 수신 시 우측 하단에 Toast 카드 나타남
  - [ ] 카테고리별 border/shadow 색상 구분됨
  - [ ] Toast 클릭 시 `/emails/:id` 이동
  - [ ] Toast 누적, 스크롤 가능
  - [ ] 이름/전화번호/이메일 주소가 `[NAME]`/`[PHONE]`/`[EMAIL]`로 마스킹됨

- [ ] **Step 5: 최종 커밋**

```bash
git add -A && git commit -m "feat: realtime email classification with action categories and toast notifications"
```
