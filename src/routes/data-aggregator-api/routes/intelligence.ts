import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY, round } from '../../_aplus/util';
import { parseRows, asNum, asKey, isMissing, mean, quantile, Row } from '../../_aplus/dataset';

// Deterministic data aggregator. Groups a posted dataset by zero or more columns
// and computes aggregation functions (count, count_distinct, sum, avg, min, max,
// median, percentile) per group. Pure arithmetic, no LLM, nothing stored.

const router = Router();

const FUNCS = ['count', 'count_distinct', 'sum', 'avg', 'min', 'max', 'median', 'percentile'] as const;
type Func = typeof FUNCS[number];

export interface AggSpec { column: string | null; func: Func; percentile: number | null; as: string; }
export interface AggregateCore {
  row_count: number;
  group_count: number;
  group_by: string[];
  aggregations: AggSpec[];
  groups: Row[];
}

function compute(rowsInGroup: Row[], spec: AggSpec): number | null {
  if (spec.func === 'count') return rowsInGroup.length;
  const col = spec.column!;
  const present = rowsInGroup.map((r) => r[col]).filter((v) => !isMissing(v, false));
  if (spec.func === 'count_distinct') return new Set(present.map(asKey)).size;
  const nums = present.map(asNum).filter((n): n is number => n !== null);
  if (nums.length === 0) return null;
  switch (spec.func) {
    case 'sum': return round(nums.reduce((a, b) => a + b, 0), 6);
    case 'avg': return round(mean(nums), 6);
    case 'min': return Math.min(...nums);
    case 'max': return Math.max(...nums);
    case 'median': return round(quantile([...nums].sort((a, b) => a - b), 0.5), 6);
    case 'percentile': return round(quantile([...nums].sort((a, b) => a - b), spec.percentile! / 100), 6);
    default: return null;
  }
}

function aggregate(body: any): { error: string } | { result: AggregateCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with "rows" and "aggregations".' };
  const p = parseRows(body.rows);
  if ('error' in p) return p;

  let groupBy: string[] = [];
  if (body.group_by !== undefined) {
    if (!Array.isArray(body.group_by) || !body.group_by.every((x: unknown) => typeof x === 'string')) return { error: '"group_by" must be an array of column-name strings.' };
    groupBy = body.group_by as string[];
  }
  if (!Array.isArray(body.aggregations) || body.aggregations.length === 0) return { error: '"aggregations" must be a non-empty array.' };

  const specs: AggSpec[] = [];
  for (let i = 0; i < body.aggregations.length; i++) {
    const a = body.aggregations[i];
    if (a === null || typeof a !== 'object' || Array.isArray(a)) return { error: `aggregations[${i}] must be an object.` };
    if (!FUNCS.includes(a.func)) return { error: `aggregations[${i}].func must be one of: ${FUNCS.join(', ')}.` };
    const needsCol = a.func !== 'count';
    if (needsCol && (typeof a.column !== 'string' || a.column === '')) return { error: `aggregations[${i}] (${a.func}) needs a "column".` };
    let pct: number | null = null;
    if (a.func === 'percentile') {
      pct = asNum(a.percentile);
      if (pct === null || pct < 0 || pct > 100) return { error: `aggregations[${i}] (percentile) needs "percentile" in [0,100].` };
    }
    const col = needsCol ? (a.column as string) : null;
    const as = typeof a.as === 'string' && a.as ? a.as : a.func === 'count' ? 'count' : a.func === 'percentile' ? `p${pct}_${col}` : `${a.func}_${col}`;
    specs.push({ column: col, func: a.func, percentile: pct, as });
  }

  // Group rows by the tuple of group_by values.
  const groupsMap = new Map<string, { keys: Row; rows: Row[] }>();
  for (const r of p.rows) {
    const keyObj: Row = {};
    for (const g of groupBy) keyObj[g] = r[g] === undefined ? null : r[g];
    const k = groupBy.map((g) => asKey(r[g])).join('');
    let entry = groupsMap.get(k);
    if (!entry) { entry = { keys: keyObj, rows: [] }; groupsMap.set(k, entry); }
    entry.rows.push(r);
  }

  const groups: Row[] = [];
  for (const { keys, rows } of groupsMap.values()) {
    const out: Row = { ...keys };
    for (const spec of specs) out[spec.as] = compute(rows, spec);
    groups.push(out);
  }

  return { result: { row_count: p.rows.length, group_count: groups.length, group_by: groupBy, aggregations: specs, groups } };
}

const CHAIN_TO = [
  { api: 'data-profiler', reason: 'Profile the aggregated output to sanity-check distributions.' },
  { api: 'data-drift-detector', reason: 'Compare this aggregate against a prior period to detect shifts.' },
];
const INVALIDATORS = [
  'Numeric aggregations (sum/avg/min/max/median/percentile) parse numeric strings and ignore missing/non-numeric values; a group with no numeric values returns null for that aggregation.',
  'count counts all rows in the group; count_distinct and column-based functions count only non-missing values.',
  'percentile uses linear interpolation between order statistics (same convention as the profiler); group_by=[] aggregates the whole dataset into one group.',
];

function actions(r: AggregateCore): string[] {
  const out = [`Aggregated ${r.row_count} row(s) into ${r.group_count} group(s) by [${r.group_by.join(', ') || '(none — global)'}] with ${r.aggregations.length} function(s).`];
  out.push('Persist the grouped rows or chain to data-profiler / data-drift-detector on the output.');
  return out;
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Data Aggregator API', version: '1.0.0',
    description: 'Deterministic data aggregator. Groups a dataset by zero or more columns and computes count/count_distinct/sum/avg/min/max/median/percentile per group. Pure arithmetic, no LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/data-aggregator/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/aggregate', summary: 'Group-by + aggregate a dataset', price_usdc: 0.006 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL aggregate + reasoning', price_usdc: 0.011 },
    ],
    pricing: [
      { path: '/aggregate', price_usdc: 0.006, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.011, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

const TAIL = (r: AggregateCore) => ({
  confidence_score: 1, confidence_per_section: { aggregation: 1 },
  recommended_actions_priority_order: actions(r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.post('/aggregate', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = aggregate(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL(r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = aggregate(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Grouped ${v.row_count} row(s) by [${v.group_by.join(', ') || 'global'}] into ${v.group_count} group(s); computed ${v.aggregations.length} aggregation(s).`,
      key_factors: [
        `Group keys: ${v.group_by.join(', ') || '(whole dataset)'}.`,
        `Aggregations: ${v.aggregations.map((a) => a.as).join(', ')}.`,
        `Groups produced: ${v.group_count}.`,
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL(v),
  });
});

export default router;
