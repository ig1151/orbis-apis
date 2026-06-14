import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';
import { round } from '../../_aplus/util';
import { parseRows, columnsOf, isMissing, asNum, asKey, inferType, mean, stddev, quantile, Row } from '../../_aplus/dataset';

// Deterministic dataset profiler. For each column: inferred type, null/distinct
// counts, uniqueness/constant flags, and type-appropriate statistics — numeric
// (min/max/mean/median/stddev/quantiles), string (length stats + top values),
// boolean (true/false counts). Pure statistics, no LLM, nothing stored.

const router = Router();
const TOP_N = 10;

export interface ColumnProfile {
  column: string;
  inferred_type: string;
  count: number;
  null_count: number;
  null_rate: number;
  distinct_count: number;
  distinct_ratio: number;
  is_unique: boolean;
  is_constant: boolean;
  numeric: null | { min: number; max: number; mean: number; median: number; stddev: number; p25: number; p75: number };
  string: null | { min_length: number; max_length: number; avg_length: number };
  boolean: null | { true_count: number; false_count: number };
  top_values: { value: string; count: number }[];
}
export interface ProfileCore {
  row_count: number;
  column_count: number;
  columns: ColumnProfile[];
}

function profileColumn(col: string, rows: Row[]): ColumnProfile {
  const all = rows.map((r) => r[col]);
  const present = all.filter((v) => !isMissing(v));
  const nullCount = all.length - present.length;
  const type = inferType(present);

  const freq = new Map<string, number>();
  for (const v of present) { const k = asKey(v); freq.set(k, (freq.get(k) || 0) + 1); }
  const distinct = freq.size;
  const top_values = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, TOP_N).map(([value, count]) => ({ value, count }));

  let numeric: ColumnProfile['numeric'] = null;
  let str: ColumnProfile['string'] = null;
  let boolean: ColumnProfile['boolean'] = null;

  if ((type === 'integer' || type === 'number') && present.length) {
    const nums = present.map(asNum).filter((n): n is number => n !== null).sort((a, b) => a - b);
    numeric = {
      min: nums[0], max: nums[nums.length - 1],
      mean: round(mean(nums), 4), median: round(quantile(nums, 0.5), 4), stddev: round(stddev(nums), 4),
      p25: round(quantile(nums, 0.25), 4), p75: round(quantile(nums, 0.75), 4),
    };
  } else if (type === 'boolean' && present.length) {
    let t = 0, f = 0;
    for (const v of present) { if (v === true || v === 'true') t++; else f++; }
    boolean = { true_count: t, false_count: f };
  } else if (present.length) {
    const lens = present.map((v) => String(v).length);
    str = { min_length: Math.min(...lens), max_length: Math.max(...lens), avg_length: round(mean(lens), 2) };
  }

  return {
    column: col,
    inferred_type: type,
    count: present.length,
    null_count: nullCount,
    null_rate: round(nullCount / all.length, 4),
    distinct_count: distinct,
    distinct_ratio: present.length ? round(distinct / present.length, 4) : 0,
    is_unique: present.length > 0 && distinct === present.length,
    is_constant: distinct === 1,
    numeric, string: str, boolean, top_values,
  };
}

function profile(body: any): { error: string } | { result: ProfileCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with a "rows" array.' };
  const p = parseRows(body.rows);
  if ('error' in p) return p;
  const cols = columnsOf(p.rows, body.columns);
  if (cols.length === 0) return { error: 'No columns found in the dataset.' };
  return { result: { row_count: p.rows.length, column_count: cols.length, columns: cols.map((c) => profileColumn(c, p.rows)) } };
}

const CHAIN_TO = [
  { api: 'data-quality-rules', reason: 'Turn the observed types/ranges into enforceable validation rules.' },
  { api: 'data-drift-detector', reason: 'Compare this profile against a future snapshot to catch distribution drift.' },
];
const INVALIDATORS = [
  'Types are inferred from sample values: a numeric-looking string column ("007") is reported numeric; a single non-numeric value makes the whole column string.',
  'distinct/top_values use a canonical string form of each value, so 1 and "1" collapse to the same key.',
  'Statistics describe only the supplied rows — they are not a population estimate.',
];

function actions(r: ProfileCore): string[] {
  const out: string[] = [`Profiled ${r.column_count} column(s) over ${r.row_count} row(s).`];
  const consts = r.columns.filter((c) => c.is_constant).map((c) => c.column);
  const sparse = r.columns.filter((c) => c.null_rate >= 0.5).map((c) => c.column);
  if (consts.length) out.push(`Constant column(s) carry no signal: ${consts.slice(0, 5).join(', ')} — consider dropping.`);
  if (sparse.length) out.push(`Mostly-null column(s) (≥50%): ${sparse.slice(0, 5).join(', ')} — backfill or drop.`);
  const ids = r.columns.filter((c) => c.is_unique).map((c) => c.column);
  if (ids.length) out.push(`Candidate key/id column(s): ${ids.slice(0, 5).join(', ')}.`);
  return out;
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Data Profiler API', version: '1.0.0',
    description: 'Deterministic dataset profiler. Per column: inferred type, null/distinct counts, uniqueness/constant flags, numeric stats (min/max/mean/median/stddev/quantiles), string length stats, boolean counts, and top values. Pure statistics, no LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/data-profiler/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/profile', summary: 'Profile a dataset', price_usdc: 0.008 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL profile + reasoning', price_usdc: 0.015 },
    ],
    pricing: [
      { path: '/profile', price_usdc: 0.008, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.015, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

// Computed stats are exact for the supplied rows (profiling:1), but type
// inference is a heuristic — numeric-looking strings, mixed columns, etc. (see
// INVALIDATORS) — so the overall score is bounded by type_inference.
const TAIL = (_r: ProfileCore) => ({
  confidence_score: 0.85, confidence_per_section: { profiling: 1, type_inference: 0.85 },
  recommended_actions_priority_order: actions(_r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.post('/profile', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = profile(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL(r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = profile(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  const types = v.columns.reduce<Record<string, number>>((a, c) => { a[c.inferred_type] = (a[c.inferred_type] || 0) + 1; return a; }, {});
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Profiled ${v.column_count} column(s) across ${v.row_count} row(s).`,
      key_factors: [
        `Inferred types: ${Object.entries(types).map(([t, n]) => `${t}×${n}`).join(', ')}.`,
        `Unique/key columns: ${v.columns.filter((c) => c.is_unique).length}; constant columns: ${v.columns.filter((c) => c.is_constant).length}.`,
        `Columns ≥50% null: ${v.columns.filter((c) => c.null_rate >= 0.5).length}.`,
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL(v),
  });
});

export default router;
