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

    // 1. PLL 내부 사건번호 패턴: (24793) 또는 PLL+24793
    const pllCaseMatch = text.match(/\((\d{4,})\)|PLL\+(\d{4,})/i);
    if (pllCaseMatch) {
      const num = pllCaseMatch[1] ?? pllCaseMatch[2];
      const found = await this.prisma.case.findUnique({ where: { caseNumber: num } });
      if (found) return { caseId: found.id, method: 'case_number' };
    }

    // 2. 표준 사건번호 패턴: 2026-PI-001
    const standardCaseMatch = text.match(/\b(\d{4}-PI-\d{3,})\b/i);
    if (standardCaseMatch) {
      const found = await this.prisma.case.findUnique({
        where: { caseNumber: standardCaseMatch[1].toUpperCase() },
      });
      if (found) return { caseId: found.id, method: 'case_number' };
    }

    // 3. 클레임번호 — 배열 필드에서 검색
    const claimPatterns = [
      text.match(/\b(\d{2}-\d{7,})\b/),        // Progressive: 24-6123424
      text.match(/\b(\d{9,}-\d)\b/),            // Farmers: 7007451196-1
      text.match(/\b([A-Z]{2}-\d{4}-\d{4,})\b/i), // SF-2024-8821 등
    ].filter(Boolean);

    for (const match of claimPatterns) {
      const claimNum = match![1];
      const found = await this.prisma.case.findFirst({
        where: { claimNumbers: { has: claimNum } },
      });
      if (found) return { caseId: found.id, method: 'claim_number' };
    }

    // 4. 클라이언트 이름 매칭
    const allCases = await this.prisma.case.findMany({ select: { id: true, clientName: true } });
    for (const c of allCases) {
      const nameParts = c.clientName.toLowerCase().split(' ').filter((p) => p.length > 2);
      if (nameParts.some((part) => text.toLowerCase().includes(part))) {
        return { caseId: c.id, method: 'client_name' };
      }
    }

    // 5. 발신자 도메인
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

    const ACTION_CATEGORIES = ['Response Required', 'Document Submission', 'Confirm Reply', 'Needs Review', 'For Reference', 'Unclassified'] as const;

    const response = await this.genai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an email classification AI for a US Personal Injury (PI) law firm.

PI domain: auto accident, slip & fall, premises liability, dog bite, city claim.
Parties: client, adjuster, defense counsel, medical provider, lienholder, CM (Case Manager).
Terms: LOR, DOL, BI/PD, UM/UIM, Dec Page, Demand, Policy Limit, Lien, SOL, IME, subrogation, disbursement.
Stages: Intake → Claim → Medical Collection → Demand → Negotiation → Settlement → Litigation.

Analyze the email below and select exactly one action_category from the following 6 options:
- "Response Required": The other party (insurer, hospital, client, etc.) explicitly requests information, documents, or a reply
- "Document Submission": The other party requests a Lien signature, return of documents, or file delivery (NOT when we initiate sending)
- "Confirm Reply": A follow-up is needed to check whether the other party has replied to our email
- "Needs Review": The content is unclear or complex and requires staff review
- "For Reference": Simple notification, Thank you letter, we initiated sending an attachment, no action needed
- "Unclassified": Does not clearly fit any of the above 5 categories

Also write a one-line summary (max 60 chars) using standard PI law firm terminology. Describe only WHAT the email is about — do NOT include action guidance, next steps, or phrases like "no action needed", "action required", "for reference", etc.

[Email Info]
From: ${maskPhi(email.fromName ?? '')}
Subject: ${subject}
Body: ${body}

Output JSON only:
{"action_category": "...", "summary": "..."}`,
      config: { maxOutputTokens: 65536 },
    });

    try {
      const raw = (response.text ?? '').replace(/```json\s*|\s*```/g, '').trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
      const actionCategory = ACTION_CATEGORIES.includes(parsed.action_category) ? parsed.action_category : 'Unclassified';
      return {
        actionCategory,
        aiSummary: typeof parsed.summary === 'string' ? parsed.summary : '',
      };
    } catch {
      return { actionCategory: 'Unclassified', aiSummary: '' };
    }
  }
}
