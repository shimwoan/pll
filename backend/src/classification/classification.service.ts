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
