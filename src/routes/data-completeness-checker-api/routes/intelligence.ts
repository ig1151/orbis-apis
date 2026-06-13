import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';
import { round } from '../../_aplus/util';
import { parseRows, columnsOf, isMissing, gradeOf, Row } from '../../_aplus/dataset';

// Deterministic data-completeness checker. Measures present / missing / blank
// values per column, overall completeness, fully-complete row count, and a 0–100
// completeness score. Honours a required-columns list and treats blank strings as
// missing by default. Pure counting, no LLM, nothing stored.

const router = Router();

export interface ColumnCompleteness {
  column: string;
  required: boolean;
  total: number;
  present: number;
  missing: number;
  completeness_pct: number;
}
export interface CompletenessCore {
  row_count: number;
  column_count: number;
  per_column: ColumnCompleteness[];
  overall_completeness_pct: number;
  fully_complete_rows: number;
  fully_complete_rows_pct: number;
  required_columns_complete: boolean;
  completeness_score: number;
  grade: string;
  passed: boolean;
}

function check(body: any): { error: string } | { result: CompletenessCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with a "rows" array.' };
  const p = parseRows(body.rows);
  if ('error' in p) return p;
  const rows = p.rows;

  const blankAsMissing = body.blank_as_missing === undefined ? true : body.blank_as_missing === true;
  if (body.required_columns !== undefined && (!Array.isArray(body.required_columns) || !body.required_columns.every((x: unknown) => typeof x === 'string'))) {
    return { error: '"required_columns" must be an array of strings.' };
  }
  const required = new Set<string>((body.required_columns as string[] | undefined) ?? []);

  // Columns = supplied list ∪ required ∪ union of keys.
  const base = columnsOf(rows, body.columns);
  const colSet = new Set<string>([...base, ...required]);
  const cols = [...colSet];

  const per_column: ColumnCompleteness[] = [];
  let totalCells = 0;
  let presentCells = 0;
  for (const col of cols) {
    let present = 0;
    for (const r of rows) if (!isMissing(r[col], blankAsMissing)) present++;
    const total = rows.length;
    totalCells += total;
    presentCells += present;
    per_column.push({
      column: col, required: required.has(col), total,
      present, missing: total - present,
      completeness_pct: round((present / total) * 100, 2),
    });
  }
  per_column.sort((a, b) => a.completeness_pct - b.completeness_pct);

  // A row is "fully complete" if every column it is measured against is present.
  let fullyComplete = 0;
  for (const r of rows) {
    if (cols.every((c) => !isMissing(r[c], blankAsMissing))) fullyComplete++;
  }

  // required-columns completeness gate
  const reqComplete = cols.filter((c) => required.has(c)).every((c) => {
    const cc = per_column.find((x) => x.column === c)!;
    return cc.missing === 0;
  });

  const overall = totalCells ? round((presentCells / totalCells) * 100, 2) : 100;
  // Score = overall cell completeness, but a missing required value caps it at 49 (failing).
  const score = reqComplete ? Math.round(overall) : Math.min(49, Math.round(overall));
  return {
    result: {
      row_count: rows.length,
      column_count: cols.length,
      per_column,
      overall_completeness_pct: overall,
      fully_complete_rows: fullyComplete,
      fully_complete_rows_pct: round((fullyComplete / rows.length) * 100, 2),
      required_columns_complete: reqComplete,
      completeness_score: score,
      grade: gradeOf(score),
      passed: reqComplete && overall >= 95,
    },
  };
}

const CHAIN_TO = [
  { api: 'data-quality-rules', reason: 'Turn required columns into not_null rules and enforce them as a gate.' },
  { api: 'data-profiler', reason: 'Profile the sparse columns to understand why values are missing.' },
];
const INVALIDATORS = [
  'Blank/whitespace strings count as missing by default; set "blank_as_missing": false to count them as present.',
  'A column not present in any row but listed in required_columns scores 0% — that is intentional (the field is absent).',
  'completeness_score is capped at 49 (failing) if any required column has a missing value, regardless of overall fill rate.',
];

function actions(r: CompletenessCore): string[] {
  const out: string[] = [];
  if (!r.required_columns_complete) {
    const worst = r.per_column.find((c) => c.required && c.missing > 0);
    out.push(`Required column "${worst?.column}" has ${worst?.missing} missing value(s) — block promotion until backfilled.`);
  } else if (r.overall_completeness_pct >= 95) {
    out.push(`Completeness ${r.overall_completeness_pct}% (grade ${r.grade}) — dataset passes.`);
  } else {
    out.push(`Overall completeness ${r.overall_completeness_pct}% (grade ${r.grade}); sparsest column "${r.per_column[0]?.column}" at ${r.per_column[0]?.completeness_pct}%.`);
  }
  out.push('Backfill or impute the sparsest columns, or drop them if not needed downstream.');
  return out;
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Data Completeness Checker API', version: '1.0.0',
    description: 'Deterministic data-completeness checker. Measures present/missing values per column, overall completeness, fully-complete rows, and a 0–100 score with a required-columns gate. Pure counting, no LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/data-completeness-checker/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/check', summary: 'Check dataset completeness', price_usdc: 0.004 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL check + reasoning', price_usdc: 0.008 },
    ],
    pricing: [
      { path: '/check', price_usdc: 0.004, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

const TAIL = (r: CompletenessCore) => ({
  confidence_score: 1, confidence_per_section: { completeness: 1 },
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
      why_result_generated: `Measured ${v.column_count} column(s) over ${v.row_count} row(s); overall completeness ${v.overall_completeness_pct}% (score ${v.completeness_score}, grade ${v.grade}).`,
      key_factors: [
        `Fully-complete rows: ${v.fully_complete_rows}/${v.row_count} (${v.fully_complete_rows_pct}%).`,
        `Required columns complete: ${v.required_columns_complete}.`,
        `Sparsest column: ${v.per_column[0]?.column ?? 'n/a'} at ${v.per_column[0]?.completeness_pct ?? 'n/a'}%.`,
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL(v),
  });
});

export default router;
