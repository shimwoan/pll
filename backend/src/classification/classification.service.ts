import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { PrismaService } from '../prisma/prisma.service';
import { maskPhi } from './phi-masker';

export interface ClassificationResult {
  category: string;
  confidence: number;
  reason: string;
  actionCategory: string;
  aiSummary: string;
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
  private genai: GoogleGenAI;

  constructor(private prisma: PrismaService) {
    this.genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

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

  private async matchCase(email: { subject: string; body: string; fromAddress: string }) {
    const text = `${email.subject} ${email.body}`;

    const caseNumberMatch = text.match(/\b(\d{4}-PI-\d{3,})\b/i);
    if (caseNumberMatch) {
      const found = await this.prisma.case.findUnique({
        where: { caseNumber: caseNumberMatch[1].toUpperCase() },
      });
      if (found) return { caseId: found.id, method: 'case_number' };
    }

    const claimMatch = text.match(/\b([A-Z]{2}-\d{4}-\d{4,})\b/i);
    if (claimMatch) {
      const found = await this.prisma.case.findFirst({
        where: { claimNumber: claimMatch[1].toUpperCase() },
      });
      if (found) return { caseId: found.id, method: 'claim_number' };
    }

    const domain = email.fromAddress.split('@')[1]?.toLowerCase();
    if (domain) {
      const isInsurance = INSURANCE_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d));
      const isMedical = MEDICAL_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d));
      if (isInsurance || isMedical) {
        return { caseId: null, method: 'sender_domain' };
      }
    }

    return { caseId: null, method: null };
  }

  private async classifyWithAI(email: { subject: string; body: string; fromName?: string }) {
    const subject = maskPhi(email.subject, email.fromName);
    const body = maskPhi(email.body, email.fromName);

    const ACTION_CATEGORIES = ['답변 필요', '서류 제출', '답변 확인', '검토 필요', '참고', '미정'] as const;

    const response = await this.genai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `당신은 PI(Personal Injury) 법무법인의 이메일 분류 AI입니다.

아래 이메일을 분석해 다음 6개 중 정확히 하나의 action_category를 선택하세요:
- "답변 필요": 상대방(보험사, 병원, 고객 등)이 자료·정보·회신을 명시적으로 요청한 경우
- "서류 제출": 상대방이 Lien 서명, 자료 반송, 첨부파일 전달을 **요청**한 경우 (우리가 먼저 보내는 건 해당 없음)
- "답변 확인": 우리가 보낸 이메일에 대해 상대방 회신이 왔는지 팔로업이 필요한 경우
- "검토 필요": 내용이 불명확하거나 복합적이어서 담당자 검토가 필요한 경우
- "참고": 단순 안내, Thank you letter 발송, 우리가 먼저 첨부파일을 보내는 경우, 별도 액션 불필요한 경우
- "미정": 위 5개 중 명확히 해당하지 않는 경우

아울러 이메일 내용을 한국어로 한 줄(30자 이내)로 요약하세요.

[이메일 정보]
발신자: ${maskPhi(email.fromName ?? '')}
제목: ${subject}
본문: ${body}

JSON만 출력하세요:
{"action_category": "...", "summary": "..."}`,
      config: { maxOutputTokens: 256 },
    });

    try {
      const raw = (response.text ?? '').replace(/```json\s*|\s*```/g, '').trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
      const actionCategory = ACTION_CATEGORIES.includes(parsed.action_category) ? parsed.action_category : '미정';
      return {
        actionCategory,
        aiSummary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 30) : '',
      };
    } catch {
      return { actionCategory: '미정', aiSummary: '' };
    }
  }
}
