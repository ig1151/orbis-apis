import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY, round } from '../../_aplus/util';
import { parseRows, asNum, asKey, isMissing, Row } from '../../_aplus/dataset';

// Deterministic data transformer. Applies an ordered pipeline of declarative row
// transforms — concat, arithmetic, split, filter — to a posted dataset and returns
// the transformed rows with a per-operation effect summary. No expression eval, no
// LLM, nothing stored.

const router = Router();

const OPS = ['concat', 'arithmetic', 'split', 'filter'] as const;
const ARITH = ['+', '-', '*', '/'] as const;
const PREDS = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'in', 'not_null', 'is_null'] as const;

export interface OpResult { op: string; detail: string; rows_removed?: number; cells_written?: number; failures?: number; }
export interface TransformCore {
  rows_in: number;
  rows_out: number;
  operations_applied: number;
  per_operation: OpResult[];
  rows: Row[];
}

function arithmetic(vals: number[], operator: string): number | null {
  if (vals.length === 0) return null;
  let acc = vals[0];
  for (let i = 1; i < vals.length; i++) {
    if (operator === '+') acc += vals[i];
    else if (operator === '-') acc -= vals[i];
    else if (operator === '*') acc *= vals[i];
    else if (operator === '/') { if (vals[i] === 0) return null; acc /= vals[i]; }
  }
  return acc;
}

function predicateOk(v: unknown, pred: string, value: unknown): boolean {
  const missing = isMissing(v, false);
  if (pred === 'not_null') return !missing;
  if (pred === 'is_null') return missing;
  if (missing) return false;
  switch (pred) {
    case 'eq': return asKey(v) === asKey(value);
    case 'ne': return asKey(v) !== asKey(value);
    case 'contains': return String(v).includes(String(value));
    case 'in': return Array.isArray(value) && value.map(asKey).includes(asKey(v));
    case 'gt': case 'gte': case 'lt': case 'lte': {
      const a = asNum(v), b = asNum(value);
      if (a === null || b === null) return false;
      return pred === 'gt' ? a > b : pred === 'gte' ? a >= b : pred === 'lt' ? a < b : a <= b;
    }
    default: return false;
  }
}

function transform(body: any): { error: string } | { result: TransformCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with "rows" and "operations".' };
  const p = parseRows(body.rows);
  if ('error' in p) return p;
  if (!Array.isArray(body.operations) || body.operations.length === 0) return { error: '"operations" must be a non-empty array.' };
  if (body.operations.length > 50) return { error: '"operations" exceeds the 50-operation limit.' };

  // validate ops up front
  const ops = body.operations as any[];
  for (let i = 0; i < ops.length; i++) {
    const o = ops[i];
    if (o === null || typeof o !== 'object' || Array.isArray(o)) return { error: `operations[${i}] must be an object.` };
    if (!OPS.includes(o.op)) return { error: `operations[${i}].op must be one of: ${OPS.join(', ')}.` };
    if (o.op === 'concat') {
      if (!Array.isArray(o.columns) || o.columns.length === 0 || typeof o.target !== 'string') return { error: `operations[${i}] (concat) needs "columns" (non-empty) and "target".` };
    } else if (o.op === 'arithmetic') {
      if (!Array.isArray(o.columns) || o.columns.length < 1 || typeof o.target !== 'string') return { error: `operations[${i}] (arithmetic) needs "columns" and "target".` };
      if (!ARITH.includes(o.operator)) return { error: `operations[${i}] (arithmetic).operator must be one of: ${ARITH.join(' ')}.` };
    } else if (o.op === 'split') {
      if (typeof o.column !== 'string' || typeof o.separator !== 'string' || !Array.isArray(o.into) || o.into.length === 0) return { error: `operations[${i}] (split) needs "column", "separator", and "into" (non-empty).` };
    } else if (o.op === 'filter') {
      if (typeof o.column !== 'string' || !PREDS.includes(o.predicate)) return { error: `operations[${i}] (filter) needs "column" and "predicate" in: ${PREDS.join(', ')}.` };
    }
  }

  let rows: Row[] = p.rows.map((r) => ({ ...r }));
  const per_operation: OpResult[] = [];

  for (const o of ops) {
    if (o.op === 'concat') {
      const sep = typeof o.separator === 'string' ? o.separator : '';
      let written = 0;
      for (const row of rows) {
        const parts = o.columns.map((c: string) => (isMissing(row[c], false) ? '' : String(row[c])));
        row[o.target] = parts.join(sep); written++;
      }
      per_operation.push({ op: 'concat', detail: `${o.columns.join(`+`)} → ${o.target}`, cells_written: written });
    } else if (o.op === 'arithmetic') {
      let written = 0, failures = 0;
      for (const row of rows) {
        const nums = o.columns.map((c: string) => asNum(row[c]));
        if (nums.some((n: number | null) => n === null)) { row[o.target] = null; failures++; written++; continue; }
        const res = arithmetic(nums as number[], o.operator);
        row[o.target] = res === null ? null : round(res, 6); if (res === null) failures++; written++;
      }
      per_operation.push({ op: 'arithmetic', detail: `${o.columns.join(` ${o.operator} `)} → ${o.target}`, cells_written: written, failures });
    } else if (o.op === 'split') {
      let written = 0;
      for (const row of rows) {
        const src = isMissing(row[o.column], false) ? '' : String(row[o.column]);
        const parts = src.split(o.separator);
        o.into.forEach((t: string, idx: number) => { row[t] = parts[idx] !== undefined ? parts[idx] : null; });
        written++;
      }
      per_operation.push({ op: 'split', detail: `${o.column} → [${o.into.join(', ')}]`, cells_written: written });
    } else if (o.op === 'filter') {
      const before = rows.length;
      rows = rows.filter((row) => predicateOk(row[o.column], o.predicate, o.value));
      per_operation.push({ op: 'filter', detail: `${o.column} ${o.predicate}${o.value !== undefined ? ` ${JSON.stringify(o.value)}` : ''}`, rows_removed: before - rows.length });
    }
  }

  return { result: { rows_in: p.rows.length, rows_out: rows.length, operations_applied: ops.length, per_operation, rows } };
}

const CHAIN_TO = [
  { api: 'data-aggregator', reason: 'Group and aggregate the transformed rows.' },
  { api: 'data-quality-rules', reason: 'Validate the derived columns before promoting downstream.' },
];
const INVALIDATORS = [
  'Operations run in order; a filter early in the pipeline changes which rows later derivations see.',
  'arithmetic / numeric predicates use numeric parsing (numeric strings accepted); a non-numeric operand sets the derived value to null (counted in failures) and division by zero yields null.',
  'concat/split coerce values to strings; missing values become "" in concat and null in split target columns. No expressions are evaluated.',
];

function actions(r: TransformCore): string[] {
  const out = [`Applied ${r.operations_applied} operation(s): ${r.rows_in} → ${r.rows_out} row(s).`];
  const fails = r.per_operation.reduce((a, o) => a + (o.failures ?? 0), 0);
  if (fails > 0) out.push(`${fails} derivation failure(s) set to null — check operand types.`);
  out.push('Chain to data-aggregator or data-quality-rules on the transformed rows.');
  return out;
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Data Transformer API', version: '1.0.0',
    description: 'Deterministic data transformer. Applies an ordered pipeline of declarative row transforms (concat, arithmetic, split, filter) and returns the transformed rows with a per-operation effect summary. No expression eval, no LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/data-transformer/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/transform', summary: 'Transform dataset rows', price_usdc: 0.007 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL transform + reasoning', price_usdc: 0.012 },
    ],
    pricing: [
      { path: '/transform', price_usdc: 0.007, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

const TAIL = (r: TransformCore) => ({
  confidence_score: 1, confidence_per_section: { transformation: 1 },
  recommended_actions_priority_order: actions(r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.post('/transform', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = transform(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL(r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = transform(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Ran ${v.operations_applied} operation(s) over ${v.rows_in} row(s) → ${v.rows_out} row(s).`,
      key_factors: v.per_operation.map((o) => `${o.op}: ${o.detail}${o.rows_removed !== undefined ? ` (removed ${o.rows_removed})` : ''}${o.cells_written !== undefined ? ` (wrote ${o.cells_written})` : ''}.`),
      invalidators: INVALIDATORS,
    },
    ...TAIL(v),
  });
});

export default router;
