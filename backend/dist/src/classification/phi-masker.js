"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maskPhi = maskPhi;
const PHI_PATTERNS = [
    { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN]' },
    { pattern: /\bSSN[:\s#]*\d{9}\b/gi, replacement: 'SSN [SSN]' },
    { pattern: /\+?1?\s*[\(\[\-]?\d{3}[\)\]\-\.\s]\s*\d{3}[\-\.\s]\d{4}\b/g, replacement: '[PHONE]' },
    { pattern: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g, replacement: '[EMAIL]' },
    { pattern: /\b(?:dob|date\s+of\s+birth|born)[:\s]+\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/gi, replacement: 'DOB [DOB]' },
    { pattern: /\b(?:dob|date\s+of\s+birth|born)[:\s]+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2},?\s+\d{4}\b/gi, replacement: 'DOB [DOB]' },
    { pattern: /\b(?:MR#?|MRN|Medical\s+Record\s+(?:No\.?|Number|#))\s*:?\s*[A-Z0-9\-]{4,}/gi, replacement: '[MRN]' },
    { pattern: /\b(?:Account|Patient|Acct|Pat)\.?\s*(?:No\.?|Number|#|ID)\s*:?\s*[A-Z0-9\-]{4,}/gi, replacement: '[ACCT]' },
    { pattern: /\b\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:St|Street|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Rd|Road|Ln|Lane|Ct|Court|Way|Pl|Place|Cir|Circle)\b\.?/g, replacement: '[ADDRESS]' },
    { pattern: /\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/g, replacement: '[LOCATION]' },
    { pattern: /\bfax[:\s]*\+?1?\s*[\(\[\-]?\d{3}[\)\]\-\.\s]\s*\d{3}[\-\.\s]\d{4}\b/gi, replacement: 'Fax [PHONE]' },
    { pattern: /\b(?:DOL|Date\s+of\s+Loss)[:\s]+\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/gi, replacement: '[DOL]' },
];
const SALUTATION_PATTERN = /\b(?:Dear|Hi|Hello)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}),?/g;
const FORMAL_LABEL_PATTERN = /\b(?:Patient|Client|Claimant)[:,\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/g;
const TITLED_NAME_PATTERN = /\b(?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Prof\.?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g;
function buildNamePattern(name) {
    const parts = name
        .replace(/[^a-zA-Z\s]/g, ' ')
        .split(/\s+/)
        .filter((p) => p.length > 1);
    if (parts.length === 0)
        return null;
    const escaped = parts.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const alts = [escaped.join('\\s+')];
    if (parts.length >= 2) {
        alts.push(escaped.slice().reverse().join('\\s+'));
    }
    return new RegExp(`\\b(?:${alts.join('|')})\\b`, 'gi');
}
function maskPhi(text, fromName) {
    if (!text)
        return text;
    let masked = text;
    if (fromName) {
        const namePattern = buildNamePattern(fromName);
        if (namePattern) {
            masked = masked.replace(namePattern, '[NAME]');
        }
    }
    masked = masked.replace(SALUTATION_PATTERN, (match, name) => match.replace(name, '[NAME]'));
    masked = masked.replace(FORMAL_LABEL_PATTERN, (match, name) => match.replace(name, '[NAME]'));
    masked = masked.replace(TITLED_NAME_PATTERN, (match, name) => match.replace(name, '[NAME]'));
    for (const { pattern, replacement } of PHI_PATTERNS) {
        pattern.lastIndex = 0;
        masked = masked.replace(pattern, replacement);
    }
    return masked;
}
//# sourceMappingURL=phi-masker.js.map