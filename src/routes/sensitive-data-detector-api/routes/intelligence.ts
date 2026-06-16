import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic sensitive-data (PII) detector. Finds emails, phone numbers, US
// SSNs, credit-card numbers (Luhn-validated), and IPv4/IPv6 addresses in a text
// blob using fixed regex rules, returns their spans, counts, a redacted copy, and
// a heuristic risk level. 100% deterministic — no LLM, nothing fetched or stored
// (distinct from the LLM-based pii-detection-api).

const router = Router();

const MAX_TEXT = 200_000;
const TYPES = ['email', 'ssn', 'credit_card', 'phone', 'ipv4', 'ipv6'] as const;
type PiiType = typeof TYPES[number];

// Precedence for overlap resolution (higher = wins): Luhn-checked card and the
// rigid SSN shape are the most specific; phone is the loosest so it loses ties.
const PRECEDENCE: Record<PiiType, number> = { credit_card: 6, ssn: 5, email: 4, ipv4: 3, ipv6: 2, phone: 1 };

const PATTERNS: Record<PiiType, RegExp> = {
  email: /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  credit_card: /\b\d(?:[ \-]?\d){12,18}\b/g, // 13–19 digits; starts & ends on a digit (no leading/trailing separator)
  phone: /(?:\+?\d{1,3}[\s.\-]?)?(?:\(\d{3}\)|\d{3})[\s.\-]?\d{3}[\s.\-]?\d{4}\b/g,
  ipv4: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g,
  ipv6: /\b(?:[A-Fa-f0-9]{1,4}:){2,7}[A-Fa-f0-9]{1,4}\b/g,
};

function luhnValid(s: string): boolean {
  const digits = s.replace(/[^\d]/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0, alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d; alt = !alt;
  }
  return sum % 10 === 0;
}

export interface Finding { type: PiiType; value: string; start: number; end: number; }
export interface ScanCore {
  text_length: number;
  has_pii: boolean;
  finding_count: number;
  counts_by_type: Record<string, number>;
  findings: Finding[];
  redacted_text: string;
  risk_level: 'none' | 'low' | 'medium' | 'high';
}

function maskFor(f: Finding, style: string): string {
  if (style === 'stars') return '*'.repeat(f.end - f.start);
  if (style === 'type') return `[${f.type.toUpperCase()}]`;
  return `[REDACTED_${f.type.toUpperCase()}]`;
}

function scan(text: string, types: PiiType[], maskStyle: string): ScanCore {
  const raw: Finding[] = [];
  for (const t of types) {
    for (const m of text.matchAll(PATTERNS[t])) {
      const value = m[0];
      const start = m.index ?? 0;
      if (t === 'credit_card' && !luhnValid(value)) continue;
      raw.push({ type: t, value, start, end: start + value.length });
    }
  }
  // Resolve overlaps: sort by start, then longer, then higher precedence; keep greedily.
  raw.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start) || PRECEDENCE[b.type] - PRECEDENCE[a.type]);
  const kept: Finding[] = [];
  let lastEnd = -1;
  for (const f of raw) { if (f.start >= lastEnd) { kept.push(f); lastEnd = f.end; } }

  const counts: Record<string, number> = {};
  for (const f of kept) counts[f.type] = (counts[f.type] || 0) + 1;

  // Redact left→right from the kept (already start-sorted) spans.
  let redacted = '', cursor = 0;
  for (const f of kept) { redacted += text.slice(cursor, f.start) + maskFor(f, maskStyle); cursor = f.end; }
  redacted += text.slice(cursor);

  const has = (t: PiiType) => (counts[t] || 0) > 0;
  const risk: ScanCore['risk_level'] =
    has('credit_card') || has('ssn') ? 'high'
      : has('email') || has('phone') ? 'medium'
        : has('ipv4') || has('ipv6') ? 'low' : 'none';

  return {
    text_length: text.length, has_pii: kept.length > 0, finding_count: kept.length,
    counts_by_type: counts, findings: kept, redacted_text: redacted, risk_level: risk,
  };
}

function parse(body: any): { error: string } | { text: string; types: PiiType[]; maskStyle: string } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with a "text" string.' };
  if (typeof body.text !== 'string') return { error: '"text" must be a string.' };
  if (body.text.length > MAX_TEXT) return { error: `"text" exceeds the ${MAX_TEXT}-character limit (got ${body.text.length}).` };
  let types: PiiType[] = [...TYPES];
  if (body.types !== undefined) {
    if (!Array.isArray(body.types) || body.types.length === 0 || !body.types.every((t: unknown) => (TYPES as readonly string[]).includes(t as string))) {
      return { error: `"types" must be a non-empty array drawn from: ${TYPES.join(', ')}.` };
    }
    types = body.types as PiiType[];
  }
  let maskStyle = 'label';
  if (body.mask_style !== undefined) {
    if (!['label', 'stars', 'type'].includes(body.mask_style)) return { error: '"mask_style" must be one of: label, stars, type.' };
    maskStyle = body.mask_style;
  }
  return { text: body.text, types, maskStyle };
}

const CHAIN_TO = [
  { api: 'data-encryption-advisor', reason: 'Get encryption/tokenization recommendations for the PII categories detected here.' },
  { api: 'data-classification', reason: 'Classify which columns of a dataset carry these PII types.' },
];
const INVALIDATORS = [
  'Detection is pattern-based and deterministic: it flags strings that MATCH the shape of each type, not strings proven to be real PII — a random 9-digit-pattern is reported as an SSN, and a number passing the Luhn check is not necessarily an issued card.',
  'Coverage is limited to email/SSN/credit-card/phone/IPv4/IPv6 with US-centric SSN/phone shapes; passports, national IDs, addresses, and names are NOT detected.',
  'Overlapping matches are resolved by earliest-start, then longest, then type precedence (card/SSN beat phone); a different segmentation could group digits differently.',
];

const TAIL = (r: ScanCore) => ({
  confidence_score: 0.85, confidence_per_section: { detection: 1, classification: 0.8, risk: 0.7 },
  recommended_actions_priority_order: [
    `${r.finding_count} sensitive item(s) found — risk ${r.risk_level}.` + (r.has_pii ? ` Types: ${Object.keys(r.counts_by_type).join(', ')}.` : ''),
    r.has_pii ? 'Use redacted_text for logs/LLM prompts; never persist the raw values.' : 'No sensitive patterns detected in the supplied text.',
    r.risk_level === 'high' ? 'High-risk PII (SSN/PAN) present — encrypt at rest and restrict access; chain to data-encryption-advisor.' : 'Review medium/low findings for false positives before acting.',
  ],
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Sensitive Data Detector API', version: '1.0.0',
    description: 'Deterministic PII detector. Finds emails, phone numbers, US SSNs, Luhn-validated credit-card numbers, and IPv4/IPv6 addresses in text using fixed regex rules, returning spans, counts, a redacted copy, and a heuristic risk level. No LLM, nothing fetched or stored.',
    openapi_url: 'https://orbis-apis.onrender.com/sensitive-data-detector/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/scan', summary: 'Detect & redact PII in text', price_usdc: 0.008 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL scan + reasoning', price_usdc: 0.015 },
    ],
    pricing: [
      { path: '/scan', price_usdc: 0.008, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.015, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/scan', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parse(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const r = scan(p.text, p.types, p.maskStyle);
  respond(res, t0, { ...r, ...TAIL(r) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parse(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const r = scan(p.text, p.types, p.maskStyle);
  respond(res, t0, {
    ...r,
    reasoning: {
      why_result_generated: `Scanned ${r.text_length} character(s) for ${p.types.length} PII type(s): ${r.finding_count} finding(s), risk ${r.risk_level}.`,
      key_factors: [
        `Counts: ${Object.entries(r.counts_by_type).map(([k, v]) => `${k}=${v}`).join(', ') || 'none'}.`,
        `Credit-card matches are Luhn-validated; SSN/phone use US-centric shapes.`,
        `Risk derived from the highest-severity type present.`,
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL(r),
  });
});

export default router;
