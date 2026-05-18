# 실시간 이메일 분류 + Toast 알림 설계

**날짜:** 2026-05-18  
**프로젝트:** PLL (Pacific Liberty Law) — PI 법무법인 워크플로우 시스템

---

## 1. 개요

이메일이 실시간으로 수신되면:
1. PHI(개인정보) 마스킹
2. Gemini API로 행동 카테고리 분류 + 한 줄 요약 생성
3. DB 저장 후 SSE로 프론트엔드에 push
4. 화면 우측 하단에 Toast 알림으로 표시 (누적, 삭제 불가)

---

## 2. 행동 카테고리

샘플 이메일 15건(PI 법무법인 실제 커뮤니케이션 패턴)에서 도출한 5개 카테고리.

| 카테고리 | 정의 | 대표 패턴 | Toast 색상 |
|---|---|---|---|
| 답변 필요 | 상대방이 자료·정보·회신을 명시적으로 요청 | 보험사 adjuster 자료 요청, 병원 정보 요청 | red-300 border + tinted shadow |
| 서류 제출 | Lien 서명, 자료 반송, 첨부파일 전달이 필요 | Lien 3건 서명 요청, 의료 기록 반송 | amber-300 border + tinted shadow |
| 답변 확인 | 내가 보낸 이메일에 대해 회신이 왔는지 팔로업 필요 | 병원 예약 요청 후 대기, 커버리지 문의 후 대기 | blue-300 border + tinted shadow |
| 검토 필요 | 내용이 불명확하거나 복합적, 자동 분류 어려움 | 보이스메일 전달, 복합 내용 | violet-300 border + tinted shadow |
| 참고 | 단순 안내, Thank you, ACK 불필요 | LOR 발송, Thank you letter, 사진 전달 완료 | gray border (no tint) |
| 미정 | 위 5개 중 명확히 해당 없음 | — | gray border (no tint) |

---

## 3. Gemini API 설계

### 3.1 입력 — PHI 마스킹 + 이메일 주소 제외

AI에 전달하는 필드:
- `subject` — PHI 마스킹 적용
- `body` — PHI 마스킹 적용 (전체 본문)
- `from_name` — 발신자 이름만 (이메일 주소 제외)

전달하지 않는 필드:
- `from_address` (발신자 이메일 주소)
- `to_address` (수신자 이메일 주소)
- `cc` 주소 일체

PHI 마스킹은 기존 `phi-masker.ts`를 그대로 활용한다.

### 3.2 프롬프트

```
당신은 PI(Personal Injury) 법무법인의 이메일 분류 AI입니다.

아래 이메일을 분석해 다음 6개 중 정확히 하나의 action_category를 선택하세요:

- "답변 필요": 상대방(보험사, 병원, 고객 등)이 자료·정보·회신을 명시적으로 요청한 경우
- "서류 제출": Lien 서명, 자료 반송, 첨부파일 전달이 필요한 경우
- "답변 확인": 우리가 보낸 이메일에 대해 상대방 회신이 왔는지 팔로업이 필요한 경우
- "검토 필요": 내용이 불명확하거나 복합적이어서 담당자 검토가 필요한 경우
- "참고": 단순 안내, Thank you, 별도 액션 불필요한 경우
- "미정": 위 5개 중 명확히 해당하지 않는 경우

아울러 이메일 내용을 한국어로 한 줄(30자 이내)로 요약하세요.

[이메일 정보]
발신자: {from_name}
제목: {subject}
본문: {body}

JSON만 출력하세요:
{"action_category": "...", "summary": "..."}
```

### 3.3 출력 예시

```json
{"action_category": "답변 필요", "summary": "보험사에서 승객 부상 정도 및 미성년자 여부 문의"}
{"action_category": "서류 제출", "summary": "Lien 3건 서명 후 반송 요청"}
{"action_category": "참고", "summary": "Thank you letter 발송 완료"}
{"action_category": "미정", "summary": "Spectrum 보이스메일 자동 전달"}
```

---

## 4. DB 스키마 변경

`Email` 모델에 필드 추가:

```prisma
actionCategory  String?   // "답변 필요" | "서류 제출" | "답변 확인" | "검토 필요" | "참고" | "미정"
aiSummary       String?   // Gemini 생성 한 줄 요약 (마스킹 적용)
```

기존 `aiCategory` (Settlement/Medical/Insurance 등) 필드는 유지하되, UI에서는 `actionCategory`를 우선 표시한다.

---

## 5. 백엔드 변경

### 5.1 `classification.service.ts`

- `classifyWithAI()` 메서드 수정:
  - 입력에서 `fromAddress` 제거, `fromName`만 전달
  - 프롬프트를 위 3.2 기준으로 교체
  - 반환값에 `actionCategory`, `aiSummary` 추가
- `ClassificationResult` 인터페이스에 `actionCategory`, `aiSummary` 필드 추가

### 5.2 `email.service.ts`

- `ingestMessage()`:
  - `actionCategory`, `aiSummary`를 DB upsert에 포함
  - SSE push 시 Toast payload에 `{ id, actionCategory, aiSummary, subject, fromName, receivedAt }` 포함

### 5.3 SSE 이벤트 포맷 변경

기존: `data: new_email\n\n`  
변경: `data: {"type":"new_email","email":{...}}\n\n`

Toast에 필요한 최소 필드만 포함 (이메일 주소 제외).

---

## 6. 프론트엔드 설계

### 6.1 ToastPanel 컴포넌트

**위치:** `frontend/src/components/ToastPanel.tsx`

- `position: fixed`, `bottom: 20px`, `right: 20px`
- `width: 300px`
- `max-height: calc(100vh - 80px)`
- `overflow-y: auto` — 많이 쌓이면 내부 스크롤
- 새 Toast는 아래에 추가 (스택은 위로 쌓임)
- 삭제 버튼 없음 — 세션 내 영구 누적
- 클릭 시 `/emails/:id` 로 이동

### 6.2 Toast 카드 UI

```
┌─────────────────────────────────────┐  ← colored border + tinted shadow
│ • 답변 필요          방금 전        │  ← dot + action label + time
│ Re: Claim #24-XXXXXXX              │  ← subject (PHI 마스킹)
│ 보험사에서 승객 부상 정도 문의      │  ← aiSummary
│ Miranda B. · Progressive           │  ← from_name만 (주소 없음)
└─────────────────────────────────────┘
```

### 6.3 카테고리별 색상

| 카테고리 | border | shadow tint | dot | text |
|---|---|---|---|---|
| 답변 필요 | `#fca5a5` | `rgba(239,68,68,0.10)` | `#fca5a5` | `#dc2626` |
| 서류 제출 | `#fcd34d` | `rgba(245,158,11,0.10)` | `#fcd34d` | `#b45309` |
| 답변 확인 | `#93c5fd` | `rgba(59,130,246,0.10)` | `#93c5fd` | `#2563eb` |
| 검토 필요 | `#c4b5fd` | `rgba(139,92,246,0.10)` | `#c4b5fd` | `#7c3aed` |
| 참고 / 미정 | `#e5e7eb` | `rgba(0,0,0,0.04)` | `#d1d5db` | `#9ca3af` |

### 6.4 전역 마운트

`App.tsx`에서 로그인 후 `<ToastPanel />`을 전역 렌더링.

### 6.5 상태 관리

`emailStore`에 `toasts: ToastItem[]` 추가.  
SSE `new_email` 이벤트 수신 시 `toasts` 배열 앞에 추가.

---

## 7. SSE 이벤트 처리 흐름

```
백엔드 webhook/polling
  → ingestMessage() → DB 저장
  → pushSseUpdate({ id, actionCategory, aiSummary, subject, fromName, receivedAt })

프론트엔드 EventSource
  → onmessage → JSON 파싱
  → emailStore.addToast(payload)
  → ToastPanel 자동 리렌더
  → fetchEmails() (목록 갱신)
```

---

## 8. 변경 파일 목록

| 파일 | 변경 유형 |
|---|---|
| `backend/src/classification/classification.service.ts` | 수정 |
| `backend/src/email/email.service.ts` | 수정 |
| `backend/prisma/schema.prisma` | 수정 |
| `frontend/src/components/ToastPanel.tsx` | 신규 |
| `frontend/src/store/emailStore.ts` | 수정 |
| `frontend/src/App.tsx` | 수정 |

---

## 9. 범위 외 (이번 구현에서 제외)

- Toast 클릭 후 읽음 처리 / 상태 변경
- Toast 필터링 (카테고리별 on/off)
- Push notification (브라우저 알림)
- Toast 퍼시스턴스 (새로고침 후 복원)
