import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { str, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic data-format validator. Real checksum/syntax algorithms — no LLM,
// no network. Supports Luhn (card), IBAN (mod-97), ISBN-10/13, EAN/UPC, US ABA
// routing number, E.164 phone, email syntax, and JSON parse. Bad input never
// throws: a malformed value yields {valid:false, reason}, never a 5xx.

const router = Router();
const CONFIDENCE_PER_SECTION = { checksum: 1, syntax: 1 };

export type ValType = 'luhn' | 'iban' | 'isbn' | 'ean' | 'routing' | 'e164' | 'email' | 'json';
export const VAL_TYPES: ValType[] = ['luhn', 'iban', 'isbn', 'ean', 'routing', 'e164', 'email', 'json'];

export interface Check {
  type: ValType;
  valid: boolean;
  normalized: string | null;
  reason: string;
}

const onlyDigits = (s: string) => s.replace(/[\s-]/g, '');

export function luhn(value: string): Check {
  const d = onlyDigits(value);
  if (!/^\d{12,19}$/.test(d)) return { type: 'luhn', valid: false, normalized: null, reason: 'A card number must be 12–19 digits.' };
  let sum = 0, alt = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = d.charCodeAt(i) - 48;
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n; alt = !alt;
  }
  const valid = sum % 10 === 0;
  return { type: 'luhn', valid, normalized: valid ? d : null, reason: valid ? 'Passes the Luhn checksum.' : 'Fails the Luhn checksum.' };
}

// ISO 13616 registry: total IBAN length per country (2-letter code → length).
export const IBAN_LENGTHS: Record<string, number> = {
  AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22, BR: 29,
  BY: 28, CH: 21, CR: 22, CY: 28, CZ: 24, DE: 22, DK: 18, DO: 28, EE: 20, EG: 29,
  ES: 24, FI: 18, FO: 18, FR: 27, GB: 22, GE: 22, GI: 23, GL: 18, GR: 27, GT: 28,
  HR: 21, HU: 28, IE: 22, IL: 23, IS: 26, IT: 27, JO: 30, KW: 30, KZ: 20, LB: 28,
  LC: 32, LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MD: 24, ME: 22, MK: 19, MR: 27,
  MT: 31, MU: 30, NL: 18, NO: 15, PK: 24, PL: 28, PS: 29, PT: 25, QA: 29, RO: 24,
  RS: 22, SA: 24, SC: 31, SE: 24, SI: 19, SK: 24, SM: 27, TN: 24, TR: 26, UA: 29,
  VA: 22, VG: 24, XK: 20,
};

export function iban(value: string): Check {
  const s = value.replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/.test(s)) return { type: 'iban', valid: false, normalized: null, reason: 'Not a well-formed IBAN (2-letter country, 2 check digits, then alphanumerics).' };
  const country = s.slice(0, 2);
  const expectedLen = IBAN_LENGTHS[country];
  if (expectedLen === undefined) return { type: 'iban', valid: false, normalized: null, reason: `Unknown IBAN country code "${country}" (not in the ISO 13616 registry).` };
  if (s.length !== expectedLen) return { type: 'iban', valid: false, normalized: null, reason: `Wrong length for ${country}: expected ${expectedLen} characters, got ${s.length}.` };
  const rearranged = s.slice(4) + s.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const code = ch >= 'A' && ch <= 'Z' ? (ch.charCodeAt(0) - 55).toString() : ch;
    for (const c of code) remainder = (remainder * 10 + (c.charCodeAt(0) - 48)) % 97;
  }
  const valid = remainder === 1;
  return { type: 'iban', valid, normalized: valid ? s : null, reason: valid ? `Passes the ISO 7064 mod-97 check and ${country} length (${expectedLen}).` : 'Fails the mod-97 check digit.' };
}

export function isbn(value: string): Check {
  const s = value.replace(/[\s-]/g, '').toUpperCase();
  if (/^\d{9}[\dX]$/.test(s)) {
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += (10 - i) * (s.charCodeAt(i) - 48);
    sum += s[9] === 'X' ? 10 : s.charCodeAt(9) - 48;
    const valid = sum % 11 === 0;
    return { type: 'isbn', valid, normalized: valid ? s : null, reason: valid ? 'Valid ISBN-10 (mod-11).' : 'Fails the ISBN-10 mod-11 check.' };
  }
  if (/^\d{13}$/.test(s)) {
    let sum = 0;
    for (let i = 0; i < 13; i++) sum += (i % 2 === 0 ? 1 : 3) * (s.charCodeAt(i) - 48);
    const valid = sum % 10 === 0;
    return { type: 'isbn', valid, normalized: valid ? s : null, reason: valid ? 'Valid ISBN-13 (mod-10).' : 'Fails the ISBN-13 mod-10 check.' };
  }
  return { type: 'isbn', valid: false, normalized: null, reason: 'An ISBN must be 10 (digits + optional X) or 13 digits.' };
}

export function ean(value: string): Check {
  const s = onlyDigits(value);
  if (!/^(\d{8}|\d{12}|\d{13})$/.test(s)) return { type: 'ean', valid: false, normalized: null, reason: 'A GTIN must be 8 (EAN-8), 12 (UPC-A), or 13 (EAN-13) digits.' };
  const digits = s.split('').map((c) => c.charCodeAt(0) - 48);
  const check = digits.pop() as number;
  // From the rightmost data digit, weights alternate 3,1,3,1…
  let sum = 0;
  for (let i = digits.length - 1, w = 3; i >= 0; i--, w = w === 3 ? 1 : 3) sum += digits[i] * w;
  const expected = (10 - (sum % 10)) % 10;
  const valid = expected === check;
  return { type: 'ean', valid, normalized: valid ? s : null, reason: valid ? `Valid GTIN-${s.length} check digit.` : `Check digit should be ${expected}.` };
}

export function routing(value: string): Check {
  const s = onlyDigits(value);
  if (!/^\d{9}$/.test(s)) return { type: 'routing', valid: false, normalized: null, reason: 'A US ABA routing number must be 9 digits.' };
  const d = s.split('').map((c) => c.charCodeAt(0) - 48);
  const sum = 3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8]);
  const valid = sum % 10 === 0;
  return { type: 'routing', valid, normalized: valid ? s : null, reason: valid ? 'Passes the ABA routing checksum.' : 'Fails the ABA checksum.' };
}

export function e164(value: string): Check {
  const s = value.replace(/[\s()-]/g, '');
  const valid = /^\+[1-9]\d{6,14}$/.test(s);
  return { type: 'e164', valid, normalized: valid ? s : null, reason: valid ? 'Well-formed E.164 number.' : 'Must start with + and a country code, 7–15 digits total, no leading zero.' };
}

// Pragmatic RFC 5321/5322 syntax check (no DNS): one @, valid local + domain labels.
const EMAIL_RE = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;
export function email(value: string): Check {
  const s = value.trim();
  const valid = s.length <= 254 && EMAIL_RE.test(s);
  return { type: 'email', valid, normalized: valid ? s.toLowerCase() : null, reason: valid ? 'Syntactically valid email address (syntax only — no MX/DNS check).' : 'Not a syntactically valid email address.' };
}

export function jsonCheck(value: string): Check {
  try {
    const parsed = JSON.parse(value);
    return { type: 'json', valid: true, normalized: JSON.stringify(parsed), reason: 'Parses as valid JSON.' };
  } catch (e) {
    return { type: 'json', valid: false, normalized: null, reason: `Invalid JSON: ${(e as Error).message}` };
  }
}

const VALIDATORS: Record<ValType, (v: string) => Check> = {
  luhn, iban, isbn, ean, routing, e164, email, json: jsonCheck,
};

/** Best-effort type detection for /lookup when no type is supplied. */
export function detectType(value: string): ValType {
  const t = value.trim();
  // Structural JSON (object/array/bool/null/quoted) is unambiguous — decide first.
  if (/^[[{]/.test(t) || /^(true|false|null)$/.test(t) || /^".*"$/.test(t)) return 'json';
  if (t.includes('@')) return 'email';
  if (/^\+/.test(t)) return 'e164';
  if (/^[A-Z]{2}\d{2}/i.test(t.replace(/\s/g, ''))) return 'iban';
  // Digit-length identifiers beat the bare-number JSON fallback (a 16-digit string
  // is far more likely a card than a JSON number).
  const digits = onlyDigits(t);
  if (/[Xx]$/.test(digits) || digits.length === 10) return 'isbn';
  if (digits.length === 13) return /^97[89]/.test(digits) ? 'isbn' : 'ean'; // 978/979 = Bookland → ISBN-13
  if (digits.length === 8 || digits.length === 12) return 'ean';
  if (digits.length === 9) return 'routing';
  if (digits.length >= 12 && digits.length <= 19) return 'luhn';
  return 'json'; // short bare numbers and anything else parse-tested as JSON
}

export function validateOne(type: ValType, value: string): Check {
  return VALIDATORS[type](value);
}

function actions(c: Check): string[] {
  if (c.valid) return [`Value passes ${c.type} validation${c.normalized && c.normalized !== '' ? ` (normalized: ${c.normalized.length > 40 ? c.normalized.slice(0, 40) + '…' : c.normalized})` : ''}.`, 'Safe to accept; no further format check needed.'];
  return [`Value FAILS ${c.type} validation: ${c.reason}`, 'Reject or prompt the user to correct the value before persisting it.'];
}

const CHAIN_TO = [
  { api: 'email-syntax-validator', reason: 'Deeper email deliverability checks (MX, disposable, role-based) beyond syntax.' },
  { api: 'phone-validation', reason: 'Carrier / line-type lookup once an E.164 number passes the syntax gate.' },
  { api: 'json-schema-validator', reason: 'Validate parsed JSON against a JSON Schema, not just parseability.' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Data Validator API', version: '1.0.0',
    description: 'Deterministic data-format validator: Luhn (card), IBAN (mod-97), ISBN-10/13, EAN/UPC GTIN, US ABA routing number, E.164 phone, email syntax, and JSON parse. Real checksum/syntax algorithms — never an LLM. Invalid input returns {valid:false, reason}, never an error.',
    openapi_url: 'https://orbis-apis.onrender.com/data-validator/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/validate', summary: 'Validate a value against one format (or auto-detect)', price_usdc: 0.005 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL validate + detected type + reasoning', price_usdc: 0.01 },
    ],
    pricing: [
      { path: '/validate', price_usdc: 0.005, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.01, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

function parse(body: any): { value: string; type?: ValType } | { error: string } {
  const value = typeof body?.value === 'string' ? body.value : str(body?.value);
  if (value === undefined) return { error: 'Provide "value" as a string to validate.' };
  let type: ValType | undefined;
  const rawType = str(body?.type)?.toLowerCase();
  if (rawType !== undefined && rawType !== 'auto') {
    if (!VAL_TYPES.includes(rawType as ValType)) return { error: `"type" must be one of: ${VAL_TYPES.join(', ')}, or "auto".` };
    type = rawType as ValType;
  }
  return { value, type };
}

router.post('/validate', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parse(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const type = p.type ?? detectType(p.value);
  const check = validateOne(type, p.value);
  respond(res, t0, {
    requested_type: p.type ?? 'auto',
    detected_type: type,
    ...check,
    confidence_score: 1.0,
    confidence_per_section: CONFIDENCE_PER_SECTION,
    recommended_actions_priority_order: actions(check),
    chain_to: CHAIN_TO,
    privacy: PRIVACY,
    execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parse(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const type = p.type ?? detectType(p.value);
  const check = validateOne(type, p.value);
  // For lookup, also report which other formats this value happens to satisfy.
  const all_checks: Check[] = VAL_TYPES.map((t) => validateOne(t, p.value));
  const also_valid_as = all_checks.filter((c) => c.valid && c.type !== type).map((c) => c.type);
  respond(res, t0, {
    requested_type: p.type ?? 'auto',
    detected_type: type,
    ...check,
    also_valid_as,
    all_checks,
    reasoning: {
      why_result_generated: `Validated "${p.value.length > 50 ? p.value.slice(0, 50) + '…' : p.value}" as ${type}: ${check.reason}`,
      key_factors: [
        `Type ${p.type ? `requested as ${p.type}` : `auto-detected as ${type}`}.`,
        `Result: ${check.valid ? 'VALID' : 'INVALID'}.`,
        also_valid_as.length ? `Also satisfies: ${also_valid_as.join(', ')}.` : 'Does not satisfy any other format.',
      ],
      invalidators: [
        'Syntax/checksum validity does not guarantee the value exists or is in service (e.g. a Luhn-valid card may be unissued; email syntax ≠ deliverable).',
        'IBAN validation covers structure, ISO 13616 per-country length, and the mod-97 check digit — but not whether the account actually exists at the bank.',
        'Editing any character can flip the checksum result.',
      ],
    },
    confidence_score: 1.0,
    confidence_per_section: CONFIDENCE_PER_SECTION,
    recommended_actions_priority_order: actions(check),
    chain_to: CHAIN_TO,
    privacy: PRIVACY,
    execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
