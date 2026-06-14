import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';
import { round } from '../../_aplus/util';
import { parseRows, columnsOf, isMissing, asNum, asKey, gradeOf, Row } from '../../_aplus/dataset';

// Deterministic data-pipeline quality scorer. Rolls four intrinsic dimensions —
// completeness, type-consistency, row-uniqueness, and (optional) type-validity —
// into a single weighted 0–100 score with a grade and the top issues. The
// dimension measures are exact; the weighting is a documented heuristic.
// No LLM, nothing stored.

const router = Router();

// per-value scalar type for consistency scoring
const DATE_RE = /^\d{4}-\d{2}-\d{2}([T\s]\d{2}:\d{2}|$)/;
function valType(v: unknown): 'boolean' | 'integer' | 'number' | 'date' | 'string' {
  if (typeof v === 'boolean' || v === 'true' || v === 'false') return 'boolean';
  const n = asNum(v);
  if (n !== null) return Number.isInteger(n) ? 'integer' : 'number';
  if (typeof v === 'string' && DATE_RE.test(v) && !Number.isNaN(Date.parse(v))) return 'date';
  return 'string';
}
function typeMatches(actual: string, expected: string): boolean {
  if (actual === expected) return true;
  if (expected === 'number') return actual === 'integer' || actual === 'number';
  return false;
}

const BASE_WEIGHTS = { completeness: 0.3, consistency: 0.25, uniqueness: 0.2, validity: 0.25 };

export interface Dimension { score: number; weight: number; detail: string; }
export interface WeightsUsed { completeness: number; consistency: number; uniqueness: number; validity?: number; }
export interface ScoreCore {
  row_count: number;
  column_count: number;
  dimensions: { completeness: Dimension; consistency: Dimension; uniqueness: Dimension; validity: Dimension | null };
  weighting_profile: string;
  weights_used: WeightsUsed;
  quality_score: number;
  grade: string;
  passed: boolean;
  top_issues: string[];
}

function score(body: any): { error: string } | { result: ScoreCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with a "rows" array.' };
  const p = parseRows(body.rows);
  if ('error' in p) return p;
  const rows = p.rows;
  const cols = columnsOf(rows, body.columns);
  if (cols.length === 0) return { error: 'No columns found in the dataset.' };

  let expectedTypes: Record<string, string> | null = null;
  if (body.expected_types !== undefined) {
    if (body.expected_types === null || typeof body.expected_types !== 'object' || Array.isArray(body.expected_types)) return { error: '"expected_types" must be an object mapping column → type.' };
    const allowed = ['string', 'number', 'integer', 'boolean', 'date'];
    for (const [k, t] of Object.entries(body.expected_types)) {
      if (typeof t !== 'string' || !allowed.includes(t)) return { error: `"expected_types.${k}" must be one of: ${allowed.join(', ')}.` };
    }
    expectedTypes = body.expected_types as Record<string, string>;
  }

  // Completeness: average non-null rate across columns.
  let cellTotal = 0, cellPresent = 0;
  const colNullRate: { col: string; rate: number }[] = [];
  for (const col of cols) {
    let present = 0;
    for (const r of rows) if (!isMissing(r[col])) present++;
    cellTotal += rows.length; cellPresent += present;
    colNullRate.push({ col, rate: 1 - present / rows.length });
  }
  const completeness = cellTotal ? cellPresent / cellTotal : 1;

  // Consistency: per column, share of present values that match the column's dominant scalar type.
  let consistencySum = 0, consistencyCols = 0;
  let worstConsistency = { col: '', share: 1 };
  for (const col of cols) {
    const present = rows.map((r) => r[col]).filter((v) => !isMissing(v));
    if (present.length === 0) continue;
    const counts = new Map<string, number>();
    for (const v of present) { const t = valType(v); counts.set(t, (counts.get(t) || 0) + 1); }
    const dominant = Math.max(...counts.values());
    const share = dominant / present.length;
    consistencySum += share; consistencyCols++;
    if (share < worstConsistency.share) worstConsistency = { col, share };
  }
  const consistency = consistencyCols ? consistencySum / consistencyCols : 1;

  // Uniqueness: 1 - duplicate-row rate (full-row equality over the chosen columns).
  const seen = new Set<string>();
  let dupRows = 0;
  for (const r of rows) {
    const key = cols.map((c) => asKey(r[c])).join('');
    if (seen.has(key)) dupRows++; else seen.add(key);
  }
  const uniqueness = 1 - dupRows / rows.length;

  // Validity (optional): share of present cells matching the expected type.
  let validity: number | null = null;
  let validityDetail = 'No expected_types supplied — validity excluded from the score.';
  if (expectedTypes) {
    let vTotal = 0, vOk = 0;
    for (const [col, t] of Object.entries(expectedTypes)) {
      for (const r of rows) {
        const v = r[col];
        if (isMissing(v)) continue;
        vTotal++; if (typeMatches(valType(v), t)) vOk++;
      }
    }
    validity = vTotal ? vOk / vTotal : 1;
    validityDetail = `${vOk}/${vTotal} present cell(s) match the expected type across ${Object.keys(expectedTypes).length} column(s).`;
  }

  // Weighted score, renormalizing if validity is absent.
  const dims: Record<string, number> = { completeness, consistency, uniqueness, ...(validity !== null ? { validity } : {}) };
  let weightSum = 0;
  for (const k of Object.keys(dims)) weightSum += (BASE_WEIGHTS as any)[k];
  let weighted = 0;
  const usedWeights: Record<string, number> = {};
  for (const k of Object.keys(dims)) { const w = (BASE_WEIGHTS as any)[k] / weightSum; usedWeights[k] = round(w, 3); weighted += dims[k] * w; }
  const quality_score = Math.round(weighted * 100);

  const top_issues: string[] = [];
  if (completeness < 0.95) top_issues.push(`Completeness ${round(completeness * 100, 1)}%${colNullRate.length ? ` (sparsest: ${[...colNullRate].sort((a, b) => b.rate - a.rate)[0].col})` : ''}.`);
  if (consistency < 0.98 && worstConsistency.col) top_issues.push(`Type-inconsistent column "${worstConsistency.col}" (${round(worstConsistency.share * 100, 1)}% dominant type).`);
  if (uniqueness < 1) top_issues.push(`${dupRows} duplicate row(s) (${round((1 - uniqueness) * 100, 1)}%).`);
  if (validity !== null && validity < 1) top_issues.push(`Type-validity ${round(validity * 100, 1)}% against expected_types.`);
  if (top_issues.length === 0) top_issues.push('No material quality issues detected across the scored dimensions.');

  return {
    result: {
      row_count: rows.length,
      column_count: cols.length,
      dimensions: {
        completeness: { score: round(completeness, 4), weight: usedWeights.completeness, detail: `${cellPresent}/${cellTotal} non-missing cells.` },
        consistency: { score: round(consistency, 4), weight: usedWeights.consistency, detail: `Mean dominant-type share across ${consistencyCols} column(s).` },
        uniqueness: { score: round(uniqueness, 4), weight: usedWeights.uniqueness, detail: `${dupRows} duplicate row(s) of ${rows.length}.` },
        validity: validity === null ? null : { score: round(validity, 4), weight: usedWeights.validity, detail: validityDetail },
      },
      weighting_profile: 'default',
      weights_used: usedWeights as unknown as WeightsUsed,
      quality_score,
      grade: gradeOf(quality_score),
      passed: quality_score >= 80,
      top_issues,
    },
  };
}

const CHAIN_TO = [
  { api: 'data-completeness-checker', reason: 'Drill into the completeness dimension column-by-column.' },
  { api: 'data-quality-rules', reason: 'Enforce the failing dimensions as hard rules in your pipeline.' },
];
const INVALIDATORS = [
  'The dimension measures are exact, but the blend weights (completeness .3, consistency .25, uniqueness .2, validity .25) are a heuristic — reweight for your domain.',
  'Validity is scored only when "expected_types" is supplied; otherwise its weight is redistributed across the other dimensions.',
  'Uniqueness is full-row duplication over the scored columns; a legitimately repeated row (e.g. event logs) will lower it.',
];

function actions(r: ScoreCore): string[] {
  const out = [`Pipeline quality ${r.quality_score}/100 (grade ${r.grade}); ${r.passed ? 'passes' : 'below'} the 80 promotion gate.`];
  for (const i of r.top_issues.slice(0, 2)) out.push(`Address: ${i}`);
  return out;
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Data Pipeline Quality Scorer API', version: '1.0.0',
    description: 'Deterministic data-pipeline quality scorer. Blends completeness, type-consistency, row-uniqueness, and optional type-validity into a weighted 0–100 score with a grade and top issues. Exact measures, heuristic weights, no LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/data-pipeline-quality-scorer/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/score', summary: 'Score dataset quality', price_usdc: 0.006 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL score + reasoning', price_usdc: 0.01 },
    ],
    pricing: [
      { path: '/score', price_usdc: 0.006, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.01, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

// The dimension measures are exact (measures:1); the composite blend uses
// heuristic weights (weighting:0.8) exposed via weighting_profile/weights_used.
const TAIL = (r: ScoreCore) => ({
  confidence_score: 0.8, confidence_per_section: { measures: 1, weighting: 0.8 },
  recommended_actions_priority_order: actions(r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.post('/score', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = score(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL(r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = score(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Blended ${v.dimensions.validity ? 4 : 3} dimension(s) over ${v.row_count} row(s) × ${v.column_count} column(s) → ${v.quality_score}/100 (grade ${v.grade}).`,
      key_factors: [
        `Completeness ${v.dimensions.completeness.score}, consistency ${v.dimensions.consistency.score}, uniqueness ${v.dimensions.uniqueness.score}${v.dimensions.validity ? `, validity ${v.dimensions.validity.score}` : ''}.`,
        `Passes 80 gate: ${v.passed}.`,
        `Top issue: ${v.top_issues[0]}`,
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL(v),
  });
});

export default router;
