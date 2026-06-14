import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY, round } from '../../_aplus/util';
import { parseRows, columnsOf, isMissing, asNum, asKey, inferType, Row } from '../../_aplus/dataset';

// Deterministic data classifier. For each column, infers a semantic type
// (email/phone/url/ip/uuid/credit_card/ssn/zip/date/datetime/currency/boolean/
// integer/number/json/free_text) and a PII flag/category from regex + checksum
// heuristics over the values. No LLM, nothing stored. Heuristic — see invalidators.

const router = Router();
const MATCH_THRESHOLD = 0.8;
const MAX_SAMPLE = 2000;

interface Detector { type: string; pii: boolean; pii_category: string | null; test: (s: string) => boolean; }

function luhnOk(s: string): boolean {
  const d = s.replace(/[\s-]/g, '');
  if (!/^\d{13,19}$/.test(d)) return false;
  let sum = 0, alt = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = d.charCodeAt(i) - 48;
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n; alt = !alt;
  }
  return sum % 10 === 0;
}
function ipv4Ok(s: string): boolean {
  const m = s.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  return !!m && m.slice(1).every((o) => Number(o) <= 255);
}

// Precedence: most specific first. First detector at/above threshold wins.
const DETECTORS: Detector[] = [
  { type: 'uuid', pii: false, pii_category: null, test: (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) },
  { type: 'email', pii: true, pii_category: 'contact', test: (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) },
  { type: 'url', pii: false, pii_category: null, test: (s) => /^https?:\/\/[^\s]+$/i.test(s) },
  { type: 'ipv4', pii: true, pii_category: 'network_identifier', test: ipv4Ok },
  { type: 'credit_card', pii: true, pii_category: 'financial', test: luhnOk },
  { type: 'ssn', pii: true, pii_category: 'national_id', test: (s) => /^\d{3}-\d{2}-\d{4}$/.test(s) },
  { type: 'zip_code', pii: false, pii_category: null, test: (s) => /^\d{5}(-\d{4})?$/.test(s) },
  { type: 'phone', pii: true, pii_category: 'contact', test: (s) => /^\+?[\d\s().-]{7,}$/.test(s) && (s.replace(/\D/g, '').length >= 7 && s.replace(/\D/g, '').length <= 15) },
  { type: 'datetime', pii: false, pii_category: null, test: (s) => /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(s) && !Number.isNaN(Date.parse(s)) },
  { type: 'date', pii: false, pii_category: null, test: (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) },
  { type: 'currency', pii: false, pii_category: null, test: (s) => /^[$€£¥]\s?\d[\d,]*(\.\d+)?$/.test(s) },
  { type: 'boolean', pii: false, pii_category: null, test: (s) => /^(true|false|yes|no)$/i.test(s) },
  { type: 'integer', pii: false, pii_category: null, test: (s) => { const n = asNum(s); return n !== null && Number.isInteger(n); } },
  { type: 'number', pii: false, pii_category: null, test: (s) => asNum(s) !== null },
  { type: 'json', pii: false, pii_category: null, test: (s) => { const t = s.trim(); if (!/^[[{]/.test(t)) return false; try { JSON.parse(t); return true; } catch { return false; } } },
];

export interface ColumnClass {
  column: string;
  inferred_type: string;
  semantic_type: string;
  pii: boolean;
  pii_category: string | null;
  match_rate: number;
  sample_size: number;
  distinct_count: number;
  column_name_hint_used: boolean;
}
export interface ClassifyCore {
  row_count: number;
  column_count: number;
  pii_column_count: number;
  pii_columns: string[];
  name_hint_used_count: number;
  columns: ColumnClass[];
}

// Column-name → semantic-type hints. Used ONLY to lower the match threshold when
// value-first detection finds no winner; the sampled values must still corroborate
// the hinted type (>= HINT_THRESHOLD) so a name never fabricates a type the data
// contradicts. Most specific names first.
const NAME_HINTS: { re: RegExp; type: string }[] = [
  { re: /datetime|timestamp/i, type: 'datetime' },
  { re: /(^|[_\s])date([_\s]|$)|_at$|_on$|_dt$|birth|dob/i, type: 'date' },
  { re: /e[-_\s]?mail/i, type: 'email' },
  { re: /phone|mobile|telephone|msisdn|(^|[_\s])tel([_\s]|$)/i, type: 'phone' },
  { re: /ssn|social[-_\s]?security/i, type: 'ssn' },
  { re: /uuid|guid/i, type: 'uuid' },
  { re: /url|link|href|website/i, type: 'url' },
  { re: /(^|[_\s])ip([_\s]|$)|ip[-_\s]?addr/i, type: 'ipv4' },
  { re: /credit[-_\s]?card|card[-_\s]?(no|num|number)|(^|[_\s])ccn?([_\s]|$)/i, type: 'credit_card' },
  { re: /zip|postal/i, type: 'zip_code' },
];
const HINT_THRESHOLD = 0.5;
const DETECTOR_BY_TYPE = new Map(DETECTORS.map((d) => [d.type, d]));

function classifyColumn(col: string, rows: Row[], useHints: boolean): ColumnClass {
  const present = rows.map((r) => r[col]).filter((v) => !isMissing(v, false));
  const sample = present.slice(0, MAX_SAMPLE);
  const strs = sample.map((v) => String(v).trim());
  const distinct = new Set(present.map(asKey)).size;
  let best: { d: Detector; rate: number } | null = null;
  if (strs.length > 0) {
    for (const d of DETECTORS) {
      let m = 0;
      for (const s of strs) if (d.test(s)) m++;
      const rate = m / strs.length;
      if (rate >= MATCH_THRESHOLD) { best = { d, rate }; break; }
    }
  }
  const inferred = inferType(present);
  if (best) {
    return {
      column: col, inferred_type: inferred, semantic_type: best.d.type,
      pii: best.d.pii, pii_category: best.d.pii_category,
      match_rate: round(best.rate, 4), sample_size: strs.length, distinct_count: distinct,
      column_name_hint_used: false,
    };
  }
  // Value-first found no winner. Fall back to a column-name hint IF the values still
  // corroborate the hinted type at >= HINT_THRESHOLD (never fabricate from the name alone).
  if (useHints && strs.length > 0) {
    const hint = NAME_HINTS.find((h) => h.re.test(col));
    const d = hint && DETECTOR_BY_TYPE.get(hint.type);
    if (d) {
      let m = 0;
      for (const s of strs) if (d.test(s)) m++;
      const rate = m / strs.length;
      if (rate >= HINT_THRESHOLD) {
        return {
          column: col, inferred_type: inferred, semantic_type: d.type,
          pii: d.pii, pii_category: d.pii_category,
          match_rate: round(rate, 4), sample_size: strs.length, distinct_count: distinct,
          column_name_hint_used: true,
        };
      }
    }
  }
  return { column: col, inferred_type: inferred, semantic_type: strs.length ? 'free_text' : 'empty', pii: false, pii_category: null, match_rate: 0, sample_size: strs.length, distinct_count: distinct, column_name_hint_used: false };
}

function classify(body: any): { error: string } | { result: ClassifyCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with a "rows" array.' };
  const p = parseRows(body.rows);
  if ('error' in p) return p;
  const cols = columnsOf(p.rows, body.columns);
  if (cols.length === 0) return { error: 'No columns found in the dataset.' };
  if (body.use_column_name_hints !== undefined && typeof body.use_column_name_hints !== 'boolean') return { error: '"use_column_name_hints" must be a boolean.' };
  const useHints = body.use_column_name_hints === undefined ? true : body.use_column_name_hints;
  const columns = cols.map((c) => classifyColumn(c, p.rows, useHints));
  const piiCols = columns.filter((c) => c.pii).map((c) => c.column);
  const hintCount = columns.filter((c) => c.column_name_hint_used).length;
  return { result: { row_count: p.rows.length, column_count: cols.length, pii_column_count: piiCols.length, pii_columns: piiCols, name_hint_used_count: hintCount, columns } };
}

const CHAIN_TO = [
  { api: 'data-quality-rules', reason: 'Turn semantic types into regex/format validation rules.' },
  { api: 'data-normalizer', reason: 'Canonicalize detected emails/phones/dates before storage.' },
];
const INVALIDATORS = [
  'Classification is heuristic (regex + Luhn checksum), not authoritative: a 9-digit id can read as a phone, and free-form text columns may be mislabeled. Verify before acting on PII flags.',
  'A column is labeled only if at least 80% of sampled non-missing values match a detector; columns are sampled to the first 2000 values for speed.',
  'PII detection finds format-based identifiers (email/phone/ssn/credit_card/ip) only — it does NOT detect names, addresses, or free-text PII, so absence of a flag is not proof a column is PII-free.',
  'Detection is value-first. column_name_hint_used=true means value matching fell below 80% but the column NAME hinted a type AND >=50% of values still matched it; treat those labels as lower-confidence (see match_rate). Set use_column_name_hints=false to disable.',
];

function actions(r: ClassifyCore): string[] {
  const out: string[] = [];
  if (r.pii_column_count > 0) out.push(`${r.pii_column_count} likely-PII column(s): ${r.pii_columns.join(', ')} — review handling/encryption/retention before storing.`);
  else out.push('No format-based PII columns detected (note: names/addresses/free-text PII are not detected).');
  if (r.name_hint_used_count > 0) out.push(`${r.name_hint_used_count} column(s) labeled via a column-name hint (value match <80%, >=50%) — verify these before acting; set use_column_name_hints=false to disable.`);
  out.push('Use the semantic types to generate validation rules (chain to data-quality-rules).');
  return out;
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Data Classification API', version: '1.0.0',
    description: 'Deterministic data classifier. Infers a per-column semantic type and PII flag/category from regex and checksum heuristics over the values. Heuristic, no LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/data-classification/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/classify', summary: 'Classify dataset columns (semantic + PII)', price_usdc: 0.007 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL classify + reasoning', price_usdc: 0.012 },
    ],
    pricing: [
      { path: '/classify', price_usdc: 0.007, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

// Confidence reflects the heuristic nature: detection is regex/checksum based, not
// authoritative, and PII coverage is format-only (see INVALIDATORS).
const TAIL = (_r: ClassifyCore) => {
  // Name-hint labels are below the value-match threshold → lower classification confidence.
  const classification = _r.name_hint_used_count > 0 ? 0.7 : 0.85;
  return {
    confidence_score: Math.min(0.8, classification), confidence_per_section: { classification, pii_detection: 0.8 },
    recommended_actions_priority_order: actions(_r),
    chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  };
};

router.post('/classify', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = classify(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL(r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = classify(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Classified ${v.column_count} column(s) over ${v.row_count} row(s); ${v.pii_column_count} flagged as likely PII.`,
      key_factors: v.columns.map((c) => `${c.column}: ${c.semantic_type}${c.pii ? ` [PII:${c.pii_category}]` : ''} (match ${c.match_rate}).`),
      invalidators: INVALIDATORS,
    },
    ...TAIL(v),
  });
});

export default router;
