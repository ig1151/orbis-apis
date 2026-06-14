import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';
import { parseRows, asNum, isMissing, Row } from '../../_aplus/dataset';

// Deterministic data normalizer. Applies an ordered list of canonicalization
// operations (whitespace, case, unicode, number, boolean, date) per column to a
// posted dataset and returns the normalized rows plus per-column change counts.
// Pure string/number transforms, no LLM, nothing stored.

const router = Router();

const OPS = [
  'trim', 'collapse_whitespace', 'lowercase', 'uppercase', 'title_case',
  'strip_accents', 'nfc', 'nfkc', 'remove_punctuation', 'remove_non_numeric',
  'to_number', 'to_integer', 'to_boolean', 'to_date_iso',
] as const;
type Op = typeof OPS[number];

export interface ColumnNorm { column: string; operations: Op[]; cells_changed: number; }
export interface NormalizeCore {
  row_count: number;
  columns_normalized: number;
  total_cells_changed: number;
  per_column: ColumnNorm[];
  rows: Row[];
}

const TRUE_SET = new Set(['true', '1', 'yes', 'y', 't']);
const FALSE_SET = new Set(['false', '0', 'no', 'n', 'f']);

function applyOp(v: unknown, op: Op): unknown {
  // Conversions operate on any non-missing value; string ops coerce to string.
  if (op === 'to_number') { const n = asNum(v); return n === null ? v : n; }
  if (op === 'to_integer') { const n = asNum(v); return n === null ? v : Math.trunc(n); }
  if (op === 'to_boolean') { const k = String(v).trim().toLowerCase(); return TRUE_SET.has(k) ? true : FALSE_SET.has(k) ? false : v; }
  if (op === 'to_date_iso') { const t = Date.parse(String(v)); return Number.isNaN(t) ? v : new Date(t).toISOString().slice(0, 10); }
  let s = String(v);
  switch (op) {
    case 'trim': s = s.trim(); break;
    case 'collapse_whitespace': s = s.replace(/\s+/g, ' ').trim(); break;
    case 'lowercase': s = s.toLowerCase(); break;
    case 'uppercase': s = s.toUpperCase(); break;
    case 'title_case': s = s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()); break;
    case 'strip_accents': s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); break;
    case 'nfc': s = s.normalize('NFC'); break;
    case 'nfkc': s = s.normalize('NFKC'); break;
    case 'remove_punctuation': s = s.replace(/[!-/:-@[-`{-~]/g, ''); break;
    case 'remove_non_numeric': s = s.replace(/[^0-9.\-]/g, ''); break;
  }
  return s;
}

function normalize(body: any): { error: string } | { result: NormalizeCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with "rows" and "rules".' };
  const p = parseRows(body.rows);
  if ('error' in p) return p;
  if (!Array.isArray(body.rules) || body.rules.length === 0) return { error: '"rules" must be a non-empty array of { column, operations } objects.' };

  const rules: { column: string; operations: Op[] }[] = [];
  for (let i = 0; i < body.rules.length; i++) {
    const r = body.rules[i];
    if (r === null || typeof r !== 'object' || Array.isArray(r)) return { error: `rules[${i}] must be an object.` };
    if (typeof r.column !== 'string' || r.column === '') return { error: `rules[${i}].column must be a non-empty string.` };
    if (!Array.isArray(r.operations) || r.operations.length === 0) return { error: `rules[${i}].operations must be a non-empty array.` };
    for (const op of r.operations) if (!OPS.includes(op)) return { error: `rules[${i}] has unknown operation "${op}". Allowed: ${OPS.join(', ')}.` };
    rules.push({ column: r.column, operations: r.operations as Op[] });
  }

  const out: Row[] = p.rows.map((r) => ({ ...r }));
  const per_column: ColumnNorm[] = [];
  let totalChanged = 0;
  for (const rule of rules) {
    let changed = 0;
    for (const row of out) {
      const orig = row[rule.column];
      if (isMissing(orig, false) && orig !== '') continue; // null/undefined pass through; '' is normalizable
      if (!(rule.column in row)) continue;
      let val: unknown = orig;
      for (const op of rule.operations) val = applyOp(val, op);
      if (JSON.stringify(val) !== JSON.stringify(orig)) { row[rule.column] = val; changed++; }
    }
    totalChanged += changed;
    per_column.push({ column: rule.column, operations: rule.operations, cells_changed: changed });
  }

  return {
    result: {
      row_count: out.length,
      columns_normalized: per_column.length,
      total_cells_changed: totalChanged,
      per_column,
      rows: out,
    },
  };
}

const CHAIN_TO = [
  { api: 'data-quality-rules', reason: 'Validate the normalized dataset against not_null/type/regex rules.' },
  { api: 'data-classification', reason: 'Re-infer column semantics now that values are canonicalized.' },
];
const INVALIDATORS = [
  'Operations apply in the given order; reordering (e.g. lowercase before strip_accents) can change the result.',
  'String operations coerce the value to a string first, so applying e.g. trim to a number returns a string; use to_number/to_integer last to convert back.',
  'null/undefined values pass through unchanged (no fabrication); empty strings ARE normalized. to_number/to_date_iso leave unparseable values as-is.',
];

function actions(r: NormalizeCore): string[] {
  const out: string[] = [];
  if (r.total_cells_changed === 0) out.push('No cells changed — the dataset already matches the requested canonical form.');
  else {
    const top = [...r.per_column].sort((a, b) => b.cells_changed - a.cells_changed)[0];
    out.push(`Normalized ${r.total_cells_changed} cell(s) across ${r.columns_normalized} column(s); most changes in "${top.column}" (${top.cells_changed}).`);
  }
  out.push('Persist the returned rows or chain to data-quality-rules to confirm conformance.');
  return out;
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Data Normalizer API', version: '1.0.0',
    description: 'Deterministic data normalizer. Applies ordered canonicalization operations (whitespace, case, unicode, number, boolean, date) per column and returns normalized rows with per-column change counts. No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/data-normalizer/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/normalize', summary: 'Normalize a dataset', price_usdc: 0.006 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL normalize + reasoning', price_usdc: 0.011 },
    ],
    pricing: [
      { path: '/normalize', price_usdc: 0.006, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.011, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

const TAIL = (r: NormalizeCore) => ({
  confidence_score: 1, confidence_per_section: { normalization: 1 },
  recommended_actions_priority_order: actions(r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.post('/normalize', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = normalize(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL(r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = normalize(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Applied normalization rules to ${v.columns_normalized} column(s) over ${v.row_count} row(s); ${v.total_cells_changed} cell(s) changed.`,
      key_factors: v.per_column.map((c) => `${c.column}: [${c.operations.join(' → ')}] changed ${c.cells_changed}.`),
      invalidators: INVALIDATORS,
    },
    ...TAIL(v),
  });
});

export default router;
