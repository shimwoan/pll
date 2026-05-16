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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassificationService = void 0;
const common_1 = require("@nestjs/common");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const prisma_service_1 = require("../prisma/prisma.service");
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
    anthropic;
    constructor(prisma) {
        this.prisma = prisma;
        this.anthropic = new sdk_1.default({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    async classify(email) {
        const matchResult = await this.matchCase(email);
        const aiResult = await this.classifyWithAI(email);
        return {
            ...aiResult,
            matchedCaseId: matchResult.caseId,
            matchMethod: matchResult.method,
        };
    }
    async matchCase(email) {
        const text = `${email.subject} ${email.bodyPreview}`;
        const caseNumberMatch = text.match(/\b(\d{4}-PI-\d{3,})\b/i);
        if (caseNumberMatch) {
            const found = await this.prisma.case.findUnique({
                where: { caseNumber: caseNumberMatch[1].toUpperCase() },
            });
            if (found)
                return { caseId: found.id, method: 'case_number' };
        }
        const claimMatch = text.match(/\b([A-Z]{2}-\d{4}-\d{4,})\b/i);
        if (claimMatch) {
            const found = await this.prisma.case.findFirst({
                where: { claimNumber: claimMatch[1].toUpperCase() },
            });
            if (found)
                return { caseId: found.id, method: 'claim_number' };
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
    async classifyWithAI(email) {
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
            const text = message.content[0].text;
            const parsed = JSON.parse(text);
            return {
                category: parsed.category || 'Other',
                confidence: parsed.confidence || 0.5,
                reason: parsed.reason || '',
            };
        }
        catch {
            return { category: 'Other', confidence: 0.3, reason: 'Classification failed' };
        }
    }
};
exports.ClassificationService = ClassificationService;
exports.ClassificationService = ClassificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ClassificationService);
//# sourceMappingURL=classification.service.js.map