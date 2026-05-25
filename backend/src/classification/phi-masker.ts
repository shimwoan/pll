// Masks HIPAA PHI identifiers before sending email content to external AI APIs.
// Preserves organization names, medical/legal terminology, and case identifiers
// needed for classification. English-only patterns.

const PHI_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // SSN: 123-45-6789 or 123456789
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN]' },
  { pattern: /\bSSN[:\s#]*\d{9}\b/gi, replacement: 'SSN [SSN]' },

  // Phone numbers: (123) 456-7890, 123-456-7890, 123.456.7890, +11234567890
  { pattern: /\+?1?\s*[\(\[\-]?\d{3}[\)\]\-\.\s]\s*\d{3}[\-\.\s]\d{4}\b/g, replacement: '[PHONE]' },

  // Email addresses in body (not the sender address — that's already handled separately)
  { pattern: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g, replacement: '[EMAIL]' },

  // Dates of birth — patterns that suggest a DOB context
  { pattern: /\b(?:dob|date\s+of\s+birth|born)[:\s]+\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/gi, replacement: 'DOB [DOB]' },
  { pattern: /\b(?:dob|date\s+of\s+birth|born)[:\s]+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2},?\s+\d{4}\b/gi, replacement: 'DOB [DOB]' },

  // Medical record numbers: MR#, MRN, Record #
  { pattern: /\b(?:MR#?|MRN|Medical\s+Record\s+(?:No\.?|Number|#))\s*:?\s*[A-Z0-9\-]{4,}/gi, replacement: '[MRN]' },

  // Account / patient numbers
  { pattern: /\b(?:Account|Patient|Acct|Pat)\.?\s*(?:No\.?|Number|#|ID)\s*:?\s*[A-Z0-9\-]{4,}/gi, replacement: '[ACCT]' },

  // US street addresses: number + street name + suffix
  { pattern: /\b\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:St|Street|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Rd|Road|Ln|Lane|Ct|Court|Way|Pl|Place|Cir|Circle)\b\.?/g, replacement: '[ADDRESS]' },

  // ZIP codes (standalone or trailing address fragments)
  { pattern: /\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/g, replacement: '[LOCATION]' },

  // Fax numbers (same pattern as phone, preceded by "fax")
  { pattern: /\bfax[:\s]*\+?1?\s*[\(\[\-]?\d{3}[\)\]\-\.\s]\s*\d{3}[\-\.\s]\d{4}\b/gi, replacement: 'Fax [PHONE]' },

  // DOL (Date of Loss): "DOL 04/20/2025", "DOL: 03/24/2024", "Date of Loss: ..."
  { pattern: /\b(?:DOL|Date\s+of\s+Loss)[:\s]+\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/gi, replacement: '[DOL]' },
];

// Salutation + name: requires at least one additional word after first name (first+last minimum)
// Supports both "Dear John Smith" and "Dear John," (single first name with optional comma)
const SALUTATION_PATTERN = /\b(?:Dear|Hi|Hello)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}),?/g;
const FORMAL_LABEL_PATTERN = /\b(?:Patient|Client|Claimant|Name)[:,\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/g;

// Titles that precede a full name — dot is optional ("Dr Williams" vs "Dr. Williams")
const TITLED_NAME_PATTERN = /\b(?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Prof\.?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g;

// PI law firm subject format: "Last, First" (e.g. "Perez Hernandez, Roberto")
// Requires single-word first name after comma to avoid matching "State Farm, Los Angeles" etc.
const LAST_FIRST_NAME_PATTERN = /\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){0,2}),\s+([A-Z][a-z]{2,})\b(?!\s+[A-Z])/g;

/**
 * Builds a regex that matches a person's full name (from email From header).
 * Only matches the full name combination to avoid masking common English words
 * that happen to be surnames (e.g. "Bill", "Mark", "May", "Reed").
 */
function buildNamePattern(name: string): RegExp | null {
  const parts = name
    .replace(/[^a-zA-Z\s]/g, ' ')
    .split(/\s+/)
    .filter((p) => p.length > 1); // keep even short parts like "Jo", "Li"
  if (parts.length === 0) return null;
  const escaped = parts.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  // Only match full name combinations (first+last, last+first), never individual tokens.
  // This prevents single-token matches that would corrupt classification signals
  // (e.g. "Bill Brown" matching "bill" in "medical bill").
  const alts = [escaped.join('\\s+')];
  if (parts.length >= 2) {
    alts.push(escaped.slice().reverse().join('\\s+'));
  }
  return new RegExp(`\\b(?:${alts.join('|')})\\b`, 'gi');
}

/**
 * Masks PHI from email text before transmission to external AI APIs.
 * @param text - raw email subject or body preview
 * @param fromName - sender display name (e.g. "John Smith") to be masked
 */
export function maskPhi(text: string, fromName?: string): string {
  if (!text) return text;

  let masked = text;

  // Mask sender's name first (most reliable — we know exactly who it is)
  if (fromName) {
    const namePattern = buildNamePattern(fromName);
    if (namePattern) {
      masked = masked.replace(namePattern, '[NAME]');
    }
  }

  // Mask names preceded by salutations or labels
  masked = masked.replace(SALUTATION_PATTERN, (match, name) => match.replace(name, '[NAME]'));
  masked = masked.replace(FORMAL_LABEL_PATTERN, (match, name) => match.replace(name, '[NAME]'));
  masked = masked.replace(TITLED_NAME_PATTERN, (match, name) => match.replace(name, '[NAME]'));
  // Mask "Last, First" format common in PI law firm subjects (e.g. "Perez Hernandez, Roberto")
  masked = masked.replace(LAST_FIRST_NAME_PATTERN, '[NAME]');

  // Apply all structural PHI patterns
  for (const { pattern, replacement } of PHI_PATTERNS) {
    // Reset lastIndex for global regexes reused across calls
    pattern.lastIndex = 0;
    masked = masked.replace(pattern, replacement);
  }

  return masked;
}
