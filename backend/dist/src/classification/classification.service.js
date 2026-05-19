"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassificationService = void 0;
const common_1 = require("@nestjs/common");
const genai_1 = require("@google/genai");
const prisma_service_1 = require("../prisma/prisma.service");
const phi_masker_1 = require("./phi-masker");
const INSURANCE_DOMAINS = [
    'statefarm.com', 'allstate.com', 'geico.com', 'progressive.com',
    'farmers.com', 'usaa.com', 'libertymutual.com', 'nationwide.com',
    'travelers.com', 'aig.com',
];
const MEDICAL_DOMAINS = [
    'cedars-sinai.org', 'ucla.edu', 'usc.edu', 'kaiserpermanente.org',
];
let ClassificationService = class ClassificationService {
    prisma;
    genai;
    constructor(prisma) {
        this.prisma = prisma;
        this.genai = new genai_1.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    async classify(email) {
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
    async matchCase(email) {
        const text = `${email.subject} ${email.body}`;
        const pllCaseMatch = text.match(/\((\d{4,})\)|PLL\+(\d{4,})/i);
        if (pllCaseMatch) {
            const num = pllCaseMatch[1] ?? pllCaseMatch[2];
            const found = await this.prisma.case.findUnique({ where: { caseNumber: num } });
            if (found)
                return { caseId: found.id, method: 'case_number' };
        }
        const standardCaseMatch = text.match(/\b(\d{4}-PI-\d{3,})\b/i);
        if (standardCaseMatch) {
            const found = await this.prisma.case.findUnique({
                where: { caseNumber: standardCaseMatch[1].toUpperCase() },
            });
            if (found)
                return { caseId: found.id, method: 'case_number' };
        }
        const claimPatterns = [
            text.match(/\b(\d{2}-\d{7,})\b/),
            text.match(/\b(\d{9,}-\d)\b/),
            text.match(/\b([A-Z]{2}-\d{4}-\d{4,})\b/i),
        ].filter(Boolean);
        for (const match of claimPatterns) {
            const claimNum = match[1];
            const found = await this.prisma.case.findFirst({
                where: { claimNumbers: { has: claimNum } },
            });
            if (found)
                return { caseId: found.id, method: 'claim_number' };
        }
        const allCases = await this.prisma.case.findMany({ select: { id: true, clientName: true } });
        for (const c of allCases) {
            const nameParts = c.clientName.toLowerCase().split(' ').filter((p) => p.length > 2);
            if (nameParts.some((part) => text.toLowerCase().includes(part))) {
                return { caseId: c.id, method: 'client_name' };
            }
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
    async classifyWithAI(email) {
        const subject = (0, phi_masker_1.maskPhi)(email.subject, email.fromName);
        const body = (0, phi_masker_1.maskPhi)(email.body, email.fromName);
        const ACTION_CATEGORIES = ['Response Required', 'Document Submission', 'Confirm Reply', 'Needs Review', 'For Reference', 'Unclassified'];
        const response = await this.genai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are an email classification AI for a Personal Injury law firm.

Analyze the email below and select exactly one action_category from the following 6 options:
- "Response Required": The other party (insurer, hospital, client, etc.) explicitly requests information, documents, or a reply
- "Document Submission": The other party requests a Lien signature, return of documents, or file delivery (NOT when we initiate sending)
- "Confirm Reply": A follow-up is needed to check whether the other party has replied to our email
- "Needs Review": The content is unclear or complex and requires staff review
- "For Reference": Simple notification, Thank you letter, we initiated sending an attachment, no action needed
- "Unclassified": Does not clearly fit any of the above 5 categories

Also summarize the email content in one line (max 60 characters).

[Email Info]
From: ${(0, phi_masker_1.maskPhi)(email.fromName ?? '')}
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
                aiSummary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 60) : '',
            };
        }
        catch {
            return { actionCategory: 'Unclassified', aiSummary: '' };
        }
    }
};
exports.ClassificationService = ClassificationService;
exports.ClassificationService = ClassificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ClassificationService);
//# sourceMappingURL=classification.service.js.map