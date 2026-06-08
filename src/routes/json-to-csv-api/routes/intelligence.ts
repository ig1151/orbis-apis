import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';

// Deterministic JSON-array -> CSV transformation (RFC 4180 quoting).
// Pure code, no LLM, confidence 1.0.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };
const MAX_ROWS = 10000;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

// Flatten nested objects with dot notation; arrays are serialized as JSON.
function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (isPlainObject(v)) Object.assign(out, flatten(v, key));
    else out[key] = v;
  }
  return out;
}

function cell(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function escapeCell(s: string, delim: string): string {
  return s.includes(delim) || s.includes('"') || s.includes('\n') || s.includes('\r')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

interface BuildResult { csv: string; row_count: number; columns: string[]; delimiter: string; rows: Record<string, unknown>[]; }

function buildCsv(rawRows: Record<string, unknown>[], delim: string, header: boolean, doFlatten: boolean): BuildResult {
  const rows = doFlatten ? rawRows.map((r) => flatten(r)) : rawRows;
  const columns: string[] = [];
  const seen = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) if (!seen.has(k)) { seen.add(k); columns.push(k); }
  const lines: string[] = [];
  if (header) lines.push(columns.map((c) => escapeCell(c, delim)).join(delim));
  for (const r of rows) lines.push(columns.map((c) => escapeCell(cell(r[c]), delim)).join(delim));
  return { csv: lines.join('\n'), row_count: rows.length, columns, delimiter: delim, rows };
}

function inferTypes(rows: Record<string, unknown>[], columns: string[]): Record<string, string> {
  const types: Record<string, string> = {};
  for (const c of columns) {
    const found = new Set<string>();
    for (const r of rows) {
      const v = r[c];
      if (v === null || v === undefined) found.add('null');
      else if (typeof v === 'number') found.add('number');
      else if (typeof v === 'boolean') found.add('boolean');
      else if (typeof v === 'object') found.add('json');
      else found.add('string');
    }
    found.delete('null');
    types[c] = found.size === 0 ? 'null' : found.size === 1 ? [...found][0] : 'mixed';
  }
  return types;
}

// Accept an array of objects, or a single object (wrapped to one row).
function readRows(data: unknown): Record<string, unknown>[] | string {
  const arr = Array.isArray(data) ? data : isPlainObject(data) ? [data] : null;
  if (!arr) return '"data" must be a JSON object or an array of objects';
  if (arr.length === 0) return '"data" must contain at least one row';
  if (arr.length > MAX_ROWS) return `"data" may contain at most ${MAX_ROWS} rows`;
  if (!arr.every(isPlainObject)) return 'every element of "data" must be a JSON object';
  return arr as Record<string, unknown>[];
}

function readOptions(body: any): { delim: string; header: boolean; flatten: boolean } | string {
  const delim = body?.delimiter ?? ',';
  if (typeof delim !== 'string' || delim.length !== 1) return '"delimiter" must be a single character';
  const header = body?.include_header ?? true;
  if (typeof header !== 'boolean') return '"include_header" must be a boolean';
  const flatten = body?.flatten ?? true;
  if (typeof flatten !== 'boolean') return '"flatten" must be a boolean';
  return { delim, header, flatten };
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'JSON to CSV API', version: '1.0.0',
    description: 'Deterministic JSON-array to CSV conversion with nested-object flattening (dot notation) and RFC 4180 quoting. Pure code — never estimated.',
    openapi_url: 'https://orbis-apis.onrender.com/json-to-csv/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/convert', summary: 'Convert a JSON array of objects to CSV', price_usdc: 0.003 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: convert + column type inference + reasoning', price_usdc: 0.008 },
    ],
    pricing: [
      { path: '/convert', price_usdc: 0.003, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/convert', (req: Request, res: Response) => {
  const t0 = Date.now();
  const rows = readRows(req.body?.data);
  if (typeof rows === 'string') return fail(res, t0, 400, 'invalid_data', rows);
  const opts = readOptions(req.body);
  if (typeof opts === 'string') return fail(res, t0, 400, 'invalid_options', opts);
  const b = buildCsv(rows, opts.delim, opts.header, opts.flatten);
  respond(res, t0, {
    csv: b.csv, row_count: b.row_count, column_count: b.columns.length, columns: b.columns, delimiter: b.delimiter,
    confidence_score: 1.0,
    recommended_actions_priority_order: [
      `Converted ${b.row_count} row(s) across ${b.columns.length} column(s).`,
      'Use /lookup to also receive inferred column types.',
    ],
    chain_to: [],
    privacy: PRIVACY,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const rows = readRows(req.body?.data);
  if (typeof rows === 'string') return fail(res, t0, 400, 'invalid_data', rows);
  const opts = readOptions(req.body);
  if (typeof opts === 'string') return fail(res, t0, 400, 'invalid_options', opts);
  const b = buildCsv(rows, opts.delim, opts.header, opts.flatten);
  const column_types = inferTypes(b.rows, b.columns);
  respond(res, t0, {
    csv: b.csv, row_count: b.row_count, column_count: b.columns.length, columns: b.columns, delimiter: b.delimiter,
    column_types,
    reasoning: {
      why_result_generated: `Flattened ${b.row_count} object(s), unioned ${b.columns.length} column(s), and serialized to RFC 4180 CSV.`,
      key_factors: [opts.flatten ? 'nested objects flattened with dot notation' : 'top-level keys only', 'arrays serialized as JSON strings', `delimiter "${opts.delim}"`],
      invalidators: ['Rows that are not JSON objects.', 'Expecting a non-dot flattening convention.'],
    },
    confidence_score: 1.0,
    recommended_actions_priority_order: [
      `Converted ${b.row_count} row(s) across ${b.columns.length} column(s).`,
      'Map column_types to your destination schema before import.',
    ],
    chain_to: [],
    privacy: PRIVACY,
  });
});

export default router;
