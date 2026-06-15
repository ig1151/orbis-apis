import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY, round, clamp } from '../../_aplus/util';
import { parseRows, isMissing, asNum, Row } from '../../_aplus/dataset';

// Deterministic scrape-data pipeline validator. Checks scraped output against an
// expected schema (field presence / type / format) and optional selector→field map
// (coverage health), returning per-field reports, per-record validity, a 0–100
// score, and a pass/fail. Pure measurement, no LLM, nothing stored.

const router = Router();

const TYPE_ENUM = ['string', 'number', 'integer', 'boolean', 'date'];
const FORMAT_ENUM = ['url', 'email', 'date'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}([T\s]\d{2}:\d{2}|$)/;
const FORMATS: Record<string, (s: string) => boolean> = {
  url: (s) => /^https?:\/\/[^\s]+$/i.test(s),
  email: (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s),
  date: (s) => DATE_RE.test(s) && !Number.isNaN(Date.parse(s)),
};

type Grade = 'A' | 'B' | 'C' | 'D' | 'F';
export interface FieldReport {
  name: string; expected_type: string | null; required: boolean; format: string | null;
  present_count: number; present_rate: number; null_rate: number;
  type_match_rate: number | null; format_match_rate: number | null;
  coverage_ok: boolean; issues: string[];
}
export interface SelectorHealth { field: string; selector: string; coverage: number; status: 'ok' | 'degraded' | 'broken'; }
export interface ValidateCore {
  record_count: number;
  min_coverage: number;
  fields: FieldReport[];
  selector_health: SelectorHealth[];
  valid_record_count: number;
  invalid_record_count: number;
  passed: boolean;
  score: number;
  grade: Grade;
}

interface FieldSpec { name: string; type: string | null; required: boolean; format: string | null; }

function typeOk(v: unknown, t: string): boolean {
  if (t === 'string') return typeof v === 'string';
  if (t === 'number') return asNum(v) !== null;
  if (t === 'integer') { const n = asNum(v); return n !== null && Number.isInteger(n); }
  if (t === 'boolean') return typeof v === 'boolean' || v === 'true' || v === 'false';
  if (t === 'date') return typeof v === 'string' && DATE_RE.test(v) && !Number.isNaN(Date.parse(v));
  return true;
}

function gradeOf(score: number): Grade {
  return score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 50 ? 'D' : 'F';
}

function validate(body: any): { error: string } | { result: ValidateCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with "records" and "expected_schema".' };
  const p = parseRows(body.records, 'records');
  if ('error' in p) return p;

  const es = body.expected_schema;
  if (es === null || typeof es !== 'object' || Array.isArray(es) || !Array.isArray(es.fields) || es.fields.length === 0) {
    return { error: '"expected_schema.fields" must be a non-empty array of field specs.' };
  }
  const specs: FieldSpec[] = [];
  for (let i = 0; i < es.fields.length; i++) {
    const f = es.fields[i];
    if (f === null || typeof f !== 'object' || Array.isArray(f)) return { error: `expected_schema.fields[${i}] must be an object.` };
    if (typeof f.name !== 'string' || f.name === '') return { error: `expected_schema.fields[${i}].name must be a non-empty string.` };
    if (f.type !== undefined && !TYPE_ENUM.includes(f.type)) return { error: `expected_schema.fields[${i}].type must be one of: ${TYPE_ENUM.join(', ')}.` };
    if (f.format !== undefined && !FORMAT_ENUM.includes(f.format)) return { error: `expected_schema.fields[${i}].format must be one of: ${FORMAT_ENUM.join(', ')}.` };
    if (f.required !== undefined && typeof f.required !== 'boolean') return { error: `expected_schema.fields[${i}].required must be a boolean.` };
    specs.push({ name: f.name, type: f.type ?? null, required: f.required === true, format: f.format ?? null });
  }

  let minCoverage = 0.9;
  if (body.min_coverage !== undefined) {
    const mc = asNum(body.min_coverage);
    if (mc === null || mc < 0 || mc > 1) return { error: '"min_coverage" must be a number in [0,1].' };
    minCoverage = mc;
  }

  // optional selector → field map
  const selSpecs: { field: string; selector: string }[] = [];
  if (body.selectors !== undefined) {
    if (!Array.isArray(body.selectors)) return { error: '"selectors" must be an array of { field, selector } objects.' };
    for (let i = 0; i < body.selectors.length; i++) {
      const s = body.selectors[i];
      if (s === null || typeof s !== 'object' || Array.isArray(s) || typeof s.field !== 'string' || typeof s.selector !== 'string' || s.field === '' || s.selector === '') {
        return { error: `selectors[${i}] must be { field, selector } non-empty strings.` };
      }
      selSpecs.push({ field: s.field, selector: s.selector });
    }
  }

  const n = p.rows.length;
  const fields: FieldReport[] = [];
  const presentRateByField = new Map<string, number>();

  for (const spec of specs) {
    let present = 0, typeMatch = 0, fmtMatch = 0, typeChecked = 0, fmtChecked = 0;
    for (const row of p.rows) {
      const v = row[spec.name];
      if (isMissing(v, true)) continue;
      present++;
      if (spec.type) { typeChecked++; if (typeOk(v, spec.type)) typeMatch++; }
      if (spec.format) { fmtChecked++; if (FORMATS[spec.format](String(v))) fmtMatch++; }
    }
    const presentRate = round(present / n, 4);
    presentRateByField.set(spec.name, presentRate);
    // Rates are null when there is nothing present to check (avoids a misleading 0%).
    const typeRate = spec.type && typeChecked > 0 ? round(typeMatch / typeChecked, 4) : null;
    const fmtRate = spec.format && fmtChecked > 0 ? round(fmtMatch / fmtChecked, 4) : null;
    const coverageOk = presentRate >= minCoverage;
    const issues: string[] = [];
    if (spec.required && !coverageOk) issues.push(`required field present in only ${(presentRate * 100).toFixed(1)}% of records (< ${(minCoverage * 100).toFixed(0)}% threshold).`);
    if (typeRate !== null && typeRate < 1) issues.push(`${typeChecked - typeMatch} value(s) do not match type "${spec.type}".`);
    if (fmtRate !== null && fmtRate < 1) issues.push(`${fmtChecked - fmtMatch} value(s) do not match format "${spec.format}".`);
    fields.push({
      name: spec.name, expected_type: spec.type, required: spec.required, format: spec.format,
      present_count: present, present_rate: presentRate, null_rate: round(1 - presentRate, 4),
      type_match_rate: typeRate, format_match_rate: fmtRate, coverage_ok: coverageOk, issues,
    });
  }

  // selector health
  const selector_health: SelectorHealth[] = selSpecs.map((s) => {
    const cov = presentRateByField.has(s.field) ? presentRateByField.get(s.field)! : round(p.rows.filter((r) => !isMissing(r[s.field], true)).length / n, 4);
    const status: SelectorHealth['status'] = cov >= minCoverage ? 'ok' : cov > 0 ? 'degraded' : 'broken';
    return { field: s.field, selector: s.selector, coverage: cov, status };
  });

  // per-record validity: all required present; present values match type & format
  let valid = 0;
  for (const row of p.rows) {
    let ok = true;
    for (const spec of specs) {
      const v = row[spec.name];
      const missing = isMissing(v, true);
      if (missing) { if (spec.required) { ok = false; break; } continue; }
      if (spec.type && !typeOk(v, spec.type)) { ok = false; break; }
      if (spec.format && !FORMATS[spec.format](String(v))) { ok = false; break; }
    }
    if (ok) valid++;
  }

  // score: mean over fields of (presence + type + format) applicable sub-rates
  let scoreSum = 0;
  for (const f of fields) {
    const parts: number[] = [f.required ? f.present_rate : 1];
    if (f.type_match_rate !== null) parts.push(f.type_match_rate);
    if (f.format_match_rate !== null) parts.push(f.format_match_rate);
    scoreSum += parts.reduce((a, b) => a + b, 0) / parts.length;
  }
  const score = round(clamp((scoreSum / fields.length) * 100, 0, 100), 1);
  const hasBroken = selector_health.some((s) => s.status === 'broken');
  const passed = valid === n && !hasBroken;

  return {
    result: {
      record_count: n, min_coverage: minCoverage, fields, selector_health,
      valid_record_count: valid, invalid_record_count: n - valid,
      passed, score, grade: gradeOf(score),
    },
  };
}

const CHAIN_TO = [
  { api: 'scrape-data-enricher', reason: 'Backfill/repair the failing fields with deterministic enrichment rules.' },
  { api: 'data-quality-rules', reason: 'Codify the expected schema as reusable not-null/range/regex rules.' },
];
const INVALIDATORS = [
  'Validity is measured only against the supplied expected_schema; fields not listed are ignored and extra columns are not penalized.',
  'A "broken" selector means its mapped field was empty in every record — a strong signal the selector changed, but this API does not fetch the page to confirm.',
  'score blends presence + type + format equally per field; passed requires zero invalid records AND no broken selectors (stricter than the score alone).',
];

function actions(r: ValidateCore): string[] {
  const out = [`${r.valid_record_count}/${r.record_count} record(s) valid — score ${r.score}/100 (${r.grade}), ${r.passed ? 'PASSED' : 'FAILED'}.`];
  const broken = r.selector_health.filter((s) => s.status === 'broken').map((s) => s.selector);
  if (broken.length) out.push(`Likely broken selector(s): ${broken.join(', ')} — the mapped field was empty in every record.`);
  const failing = r.fields.filter((f) => f.issues.length > 0).map((f) => f.name);
  if (failing.length) out.push(`Fields with issues: ${failing.join(', ')} — see per-field issues.`);
  out.push('Chain to scrape-data-enricher to repair fields or data-quality-rules to codify the schema.');
  return out;
}

const TAIL = (_r: ValidateCore) => ({
  confidence_score: 0.85, confidence_per_section: { validation: 1, scoring: 0.85 },
  recommended_actions_priority_order: actions(_r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Scrape Data Pipeline Validator API', version: '1.0.0',
    description: 'Deterministic scrape-data pipeline validator. Checks scraped output against an expected schema (presence/type/format) and optional selector→field coverage, returning per-field reports, per-record validity, a 0–100 score, and pass/fail. No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/scrape-data-pipeline-validator/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/validate', summary: 'Validate scrape output vs expected schema/selectors', price_usdc: 0.007 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL validate + reasoning', price_usdc: 0.012 },
    ],
    pricing: [
      { path: '/validate', price_usdc: 0.007, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/validate', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = validate(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL(r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = validate(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Validated ${v.record_count} record(s) against ${v.fields.length} expected field(s): ${v.valid_record_count} valid, score ${v.score}/100.`,
      key_factors: [
        `Pass/fail: ${v.passed ? 'PASSED' : 'FAILED'} (grade ${v.grade}).`,
        `Fields with issues: ${v.fields.filter((f) => f.issues.length).map((f) => f.name).join(', ') || 'none'}.`,
        `Selector health: ${v.selector_health.map((s) => `${s.selector}=${s.status}`).join(', ') || 'n/a'}.`,
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL(v),
  });
});

export default router;
