import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';
import { round } from '../../_aplus/util';
import { parseRows, isMissing, asNum, asKey, Row } from '../../_aplus/dataset';

// Deterministic data-quality rule engine. Evaluates a set of declarative rules
// (not_null, unique, type, range, regex, enum, length) against a dataset and
// reports per-rule pass/fail with violation counts and sample offending rows.
// Real evaluation, no LLM, nothing stored.

const router = Router();

const RULE_TYPES = ['not_null', 'unique', 'type', 'range', 'regex', 'enum', 'min_length', 'max_length'] as const;
type RuleType = typeof RULE_TYPES[number];
const SCALAR_TYPES = ['string', 'number', 'integer', 'boolean'];
const MAX_SAMPLES = 10;

export interface RuleResult {
  rule_id: string;
  column: string;
  type: RuleType;
  passed: boolean;
  evaluated: number;
  violations: number;
  sample_violation_rows: number[];
  message: string;
}
export interface RulesCore {
  row_count: number;
  total_rules: number;
  passed_rules: number;
  failed_rules: number;
  total_violations: number;
  pass_rate: number;
  all_passed: boolean;
  results: RuleResult[];
}

function typeOk(v: unknown, t: string): boolean {
  switch (t) {
    case 'string': return typeof v === 'string';
    case 'boolean': return typeof v === 'boolean' || v === 'true' || v === 'false';
    case 'number': return asNum(v) !== null;
    case 'integer': { const n = asNum(v); return n !== null && Number.isInteger(n); }
    default: return false;
  }
}

function evalRule(rule: any, rows: Row[], idx: number): { error: string } | RuleResult {
  if (rule === null || typeof rule !== 'object' || Array.isArray(rule)) return { error: `rules[${idx}] must be an object.` };
  const column = rule.column;
  if (typeof column !== 'string' || column === '') return { error: `rules[${idx}].column must be a non-empty string.` };
  const type = rule.type;
  if (!RULE_TYPES.includes(type)) return { error: `rules[${idx}].type must be one of: ${RULE_TYPES.join(', ')}.` };

  const rule_id = typeof rule.id === 'string' && rule.id ? rule.id : `${column}:${type}`;
  const violationRows: number[] = [];
  let evaluated = 0;
  let message = '';

  const flag = (rowIdx: number) => { if (violationRows.length < MAX_SAMPLES) violationRows.push(rowIdx); };

  if (type === 'unique') {
    const firstSeen = new Map<string, number>();
    rows.forEach((r, i) => {
      if (isMissing(r[column])) return; // missing handled by not_null, not uniqueness
      evaluated++;
      const k = asKey(r[column]);
      if (firstSeen.has(k)) flag(i);
      else firstSeen.set(k, i);
    });
    const dupCount = evaluated - firstSeen.size;
    message = dupCount === 0 ? `All ${evaluated} non-missing values in "${column}" are unique.` : `${dupCount} duplicate value(s) in "${column}".`;
    return { rule_id, column, type, passed: dupCount === 0, evaluated, violations: dupCount, sample_violation_rows: violationRows, message };
  }

  // Per-row rules
  let typeParam = '';
  let re: RegExp | null = null;
  let enumKeys: Set<string> | null = null;
  let min: number | undefined, max: number | undefined, minLen: number | undefined, maxLen: number | undefined;
  if (type === 'type') {
    typeParam = rule.value ?? rule.expected;
    if (!SCALAR_TYPES.includes(typeParam)) return { error: `rules[${idx}] (type) needs "value" in: ${SCALAR_TYPES.join(', ')}.` };
  } else if (type === 'regex') {
    if (typeof rule.pattern !== 'string') return { error: `rules[${idx}] (regex) needs a "pattern" string.` };
    try { re = new RegExp(rule.pattern, typeof rule.flags === 'string' ? rule.flags : ''); } catch { return { error: `rules[${idx}] (regex) has an invalid pattern.` }; }
  } else if (type === 'enum') {
    if (!Array.isArray(rule.values) || rule.values.length === 0) return { error: `rules[${idx}] (enum) needs a non-empty "values" array.` };
    enumKeys = new Set((rule.values as unknown[]).map(asKey));
  } else if (type === 'range') {
    min = asNum(rule.min) ?? undefined; max = asNum(rule.max) ?? undefined;
    if (min === undefined && max === undefined) return { error: `rules[${idx}] (range) needs numeric "min" and/or "max".` };
  } else if (type === 'min_length' || type === 'max_length') {
    const lv = asNum(rule.value ?? rule.length);
    if (lv === null) return { error: `rules[${idx}] (${type}) needs a numeric "value".` };
    if (type === 'min_length') minLen = lv; else maxLen = lv;
  }

  rows.forEach((r, i) => {
    const v = r[column];
    if (type === 'not_null') { evaluated++; if (isMissing(v)) flag(i); return; }
    // All other rules ignore missing values (use a not_null rule to require presence).
    if (isMissing(v)) return;
    evaluated++;
    let ok = true;
    switch (type) {
      case 'type': ok = typeOk(v, typeParam); break;
      case 'regex': ok = re!.test(String(v)); break;
      case 'enum': ok = enumKeys!.has(asKey(v)); break;
      case 'range': { const n = asNum(v); ok = n !== null && (min === undefined || n >= min) && (max === undefined || n <= max); break; }
      case 'min_length': ok = String(v).length >= minLen!; break;
      case 'max_length': ok = String(v).length <= maxLen!; break;
    }
    if (!ok) flag(i);
  });

  // violations beyond the sample cap are still counted via a full pass for accuracy
  let violations = 0;
  rows.forEach((r) => {
    const v = r[column];
    if (type === 'not_null') { if (isMissing(v)) violations++; return; }
    if (isMissing(v)) return;
    let ok = true;
    switch (type) {
      case 'type': ok = typeOk(v, typeParam); break;
      case 'regex': ok = re!.test(String(v)); break;
      case 'enum': ok = enumKeys!.has(asKey(v)); break;
      case 'range': { const n = asNum(v); ok = n !== null && (min === undefined || n >= min) && (max === undefined || n <= max); break; }
      case 'min_length': ok = String(v).length >= minLen!; break;
      case 'max_length': ok = String(v).length <= maxLen!; break;
    }
    if (!ok) violations++;
  });

  message = violations === 0 ? `"${column}" satisfies ${type} on all ${evaluated} evaluated row(s).` : `${violations} of ${evaluated} row(s) violate ${type} on "${column}".`;
  return { rule_id, column, type, passed: violations === 0, evaluated, violations, sample_violation_rows: violationRows, message };
}

function check(body: any): { error: string } | { result: RulesCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with "rows" and "rules" arrays.' };
  const p = parseRows(body.rows);
  if ('error' in p) return p;
  if (!Array.isArray(body.rules) || body.rules.length === 0) return { error: '"rules" must be a non-empty array of rule objects.' };
  if (body.rules.length > 200) return { error: '"rules" exceeds the 200-rule limit.' };

  const results: RuleResult[] = [];
  for (let i = 0; i < body.rules.length; i++) {
    const r = evalRule(body.rules[i], p.rows, i);
    if ('error' in r) return r;
    results.push(r);
  }
  const passed = results.filter((r) => r.passed).length;
  const totalViolations = results.reduce((a, r) => a + r.violations, 0);
  return {
    result: {
      row_count: p.rows.length,
      total_rules: results.length,
      passed_rules: passed,
      failed_rules: results.length - passed,
      total_violations: totalViolations,
      pass_rate: round(passed / results.length, 4),
      all_passed: passed === results.length,
      results,
    },
  };
}

const CHAIN_TO = [
  { api: 'data-completeness-checker', reason: 'Quantify missing data behind not_null violations.' },
  { api: 'data-pipeline-quality-scorer', reason: 'Roll these rule results into an overall pipeline quality score.' },
];
const INVALIDATORS = [
  'Rules other than not_null skip missing values by design — add an explicit not_null rule to require presence.',
  'Numeric range/type checks accept numeric strings (e.g. "42") as numbers; use a type rule with value "number" plus a strict regex if you need to reject string-encoded numbers.',
  'sample_violation_rows is capped; "violations" is the exact full count.',
];

function actions(r: RulesCore): string[] {
  const out: string[] = [];
  if (r.all_passed) out.push(`All ${r.total_rules} rule(s) passed — dataset conforms.`);
  else {
    const worst = [...r.results].filter((x) => !x.passed).sort((a, b) => b.violations - a.violations)[0];
    out.push(`${r.failed_rules} of ${r.total_rules} rule(s) failed (${r.total_violations} total violations). Fix first: ${worst.rule_id} (${worst.violations}).`);
    out.push('Quarantine or repair violating rows before promoting this dataset downstream.');
  }
  return out;
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Data Quality Rules API', version: '1.0.0',
    description: 'Deterministic data-quality rule engine. Evaluates declarative rules (not_null, unique, type, range, regex, enum, length) against a dataset and reports per-rule pass/fail with violation counts and sample offending rows. No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/data-quality-rules/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/check', summary: 'Evaluate rules against a dataset', price_usdc: 0.005 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL check + reasoning', price_usdc: 0.009 },
    ],
    pricing: [
      { path: '/check', price_usdc: 0.005, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.009, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

const TAIL = (r: RulesCore) => ({
  confidence_score: 1, confidence_per_section: { rule_evaluation: 1 },
  recommended_actions_priority_order: actions(r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.post('/check', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = check(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL(r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = check(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Evaluated ${v.total_rules} rule(s) over ${v.row_count} row(s); ${v.passed_rules} passed, ${v.failed_rules} failed (${v.total_violations} violations).`,
      key_factors: [
        `Pass rate: ${v.pass_rate}.`,
        `All passed: ${v.all_passed}.`,
        `Total violations across all rules: ${v.total_violations}.`,
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL(v),
  });
});

export default router;
