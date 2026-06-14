import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY, round } from '../../_aplus/util';
import { parseRows, columnsOf, inferType, isMissing, asKey, Row } from '../../_aplus/dataset';

// Deterministic data catalog builder. Turns one or more dataset schemas — supplied
// either as sample rows (types inferred) or as explicit column definitions — into a
// catalog entry per dataset: typed columns, null rates, cardinality, primary-key
// candidates, and heuristic tags. No LLM, nothing stored.

const router = Router();

const MAX_DATASETS = 100;
const TYPE_ENUM = ['empty', 'boolean', 'integer', 'number', 'date', 'string'];
type CellValue = string | number | boolean | null | unknown[] | Record<string, unknown>;

export interface CatalogColumn {
  name: string;
  type: string;
  nullable: boolean;
  null_rate: number | null;
  distinct_count: number | null;
  sample_values: CellValue[];
  tags: string[];
}
export interface CatalogDataset {
  name: string;
  source: 'rows' | 'columns';
  row_count: number | null;
  column_count: number;
  primary_key_candidates: string[];
  columns: CatalogColumn[];
  tags: string[];
}
export interface CatalogCore { dataset_count: number; datasets: CatalogDataset[]; }

const ID_RE = /(^|_)id$|^id$|uuid|guid/i;
const TEMPORAL_RE = /date|time|_at$|_on$|timestamp|dob|birth/i;
const MEASURE_RE = /amount|price|qty|quantity|count|total|cost|revenue|score|rate|balance|age/i;
const PII_RE = /email|phone|ssn|(^|_)name$|full_?name|address|dob|birth|zip|postal/i;

function columnTags(name: string, type: string, unique: boolean, categorical: boolean): string[] {
  const tags: string[] = [];
  if (ID_RE.test(name) || unique) tags.push('identifier');
  if (type === 'date' || TEMPORAL_RE.test(name)) tags.push('temporal');
  if ((type === 'number' || type === 'integer') && MEASURE_RE.test(name)) tags.push('measure');
  if (PII_RE.test(name)) tags.push('pii_candidate');
  if (type === 'boolean') tags.push('boolean_flag');
  if (categorical) tags.push('categorical');
  return tags;
}

function buildFromRows(name: string, rows: Row[]): CatalogDataset {
  const cols = columnsOf(rows);
  const rowCount = rows.length;
  const columns: CatalogColumn[] = [];
  const pkCandidates: string[] = [];
  for (const c of cols) {
    const values = rows.map((r) => r[c]);
    const present = values.filter((v) => !isMissing(v, false));
    const type = inferType(present);
    const nullCount = rowCount - present.length;
    const distinctKeys = new Set(present.map(asKey));
    const distinct = distinctKeys.size;
    const nullRate = round(nullCount / rowCount, 4);
    // sample: up to 5 distinct, first-seen order
    const seen = new Set<string>();
    const sample: CellValue[] = [];
    for (const v of present) { const k = asKey(v); if (!seen.has(k)) { seen.add(k); sample.push(v as CellValue); if (sample.length >= 5) break; } }
    const unique = rowCount > 1 && nullCount === 0 && distinct === rowCount;
    const categorical = (type === 'string' || type === 'boolean') && distinct > 0 && distinct <= Math.max(2, Math.floor(rowCount * 0.5)) && !unique;
    if (unique) pkCandidates.push(c);
    columns.push({ name: c, type, nullable: nullCount > 0, null_rate: nullRate, distinct_count: distinct, sample_values: sample, tags: columnTags(c, type, unique, categorical) });
  }
  return { name, source: 'rows', row_count: rowCount, column_count: columns.length, primary_key_candidates: pkCandidates, columns, tags: datasetTags(columns) };
}

function buildFromColumns(name: string, decl: { name: string; type: string }[]): CatalogDataset {
  const columns: CatalogColumn[] = decl.map((d) => ({
    name: d.name, type: d.type, nullable: true, null_rate: null, distinct_count: null, sample_values: [],
    tags: columnTags(d.name, d.type, false, false),
  }));
  return { name, source: 'columns', row_count: null, column_count: columns.length, primary_key_candidates: [], columns, tags: datasetTags(columns) };
}

function datasetTags(columns: CatalogColumn[]): string[] {
  const tags: string[] = [];
  const has = (t: string) => columns.some((c) => c.tags.includes(t));
  if (has('pii_candidate')) tags.push('has_pii');
  if (has('temporal')) tags.push('has_temporal');
  if (has('identifier')) tags.push('has_identifier');
  if (columns.filter((c) => c.tags.includes('measure')).length >= 2) tags.push('fact_table');
  return tags;
}

function build(body: any): { error: string } | { result: CatalogCore; anyInferred: boolean } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with a "datasets" array.' };
  if (!Array.isArray(body.datasets) || body.datasets.length === 0) return { error: '"datasets" must be a non-empty array.' };
  if (body.datasets.length > MAX_DATASETS) return { error: `"datasets" exceeds the ${MAX_DATASETS}-dataset limit.` };
  const out: CatalogDataset[] = [];
  let anyInferred = false;
  for (let i = 0; i < body.datasets.length; i++) {
    const d = body.datasets[i];
    if (d === null || typeof d !== 'object' || Array.isArray(d)) return { error: `datasets[${i}] must be an object.` };
    if (typeof d.name !== 'string' || d.name === '') return { error: `datasets[${i}].name must be a non-empty string.` };
    const hasRows = d.rows !== undefined;
    const hasCols = d.columns !== undefined;
    if (hasRows === hasCols) return { error: `datasets[${i}] ("${d.name}") must supply exactly one of "rows" or "columns".` };
    if (hasRows) {
      const p = parseRows(d.rows, `datasets[${i}].rows`);
      if ('error' in p) return p;
      anyInferred = true;
      out.push(buildFromRows(d.name, p.rows));
    } else {
      if (!Array.isArray(d.columns) || d.columns.length === 0) return { error: `datasets[${i}].columns must be a non-empty array.` };
      const decl: { name: string; type: string }[] = [];
      for (let j = 0; j < d.columns.length; j++) {
        const c = d.columns[j];
        if (c === null || typeof c !== 'object' || Array.isArray(c)) return { error: `datasets[${i}].columns[${j}] must be an object.` };
        if (typeof c.name !== 'string' || c.name === '') return { error: `datasets[${i}].columns[${j}].name must be a non-empty string.` };
        const type = c.type === undefined ? 'string' : c.type;
        if (!TYPE_ENUM.includes(type)) return { error: `datasets[${i}].columns[${j}].type must be one of: ${TYPE_ENUM.join(', ')}.` };
        decl.push({ name: c.name, type });
      }
      out.push(buildFromColumns(d.name, decl));
    }
  }
  return { result: { dataset_count: out.length, datasets: out }, anyInferred };
}

const CHAIN_TO = [
  { api: 'data-classification', reason: 'Confirm semantic/PII types on the catalogued columns from sampled values.' },
  { api: 'data-lineage-tracker', reason: 'Connect these catalogued datasets into a lineage graph.' },
];
const INVALIDATORS = [
  'Column types and stats are derived only from the supplied rows/columns; with explicit columns, null_rate/distinct_count/sample_values are null/empty (no data to measure).',
  'Tags are heuristic (name + type patterns): identifier/temporal/measure/pii_candidate/boolean_flag/categorical — verify before treating pii_candidate as authoritative PII.',
  'primary_key_candidates require a fully-populated, all-distinct column over >1 row; they are candidates, not enforced keys.',
];

function actions(r: CatalogCore): string[] {
  const out = [`Catalogued ${r.dataset_count} dataset(s), ${r.datasets.reduce((a, d) => a + d.column_count, 0)} column(s) total.`];
  const pii = r.datasets.filter((d) => d.tags.includes('has_pii')).map((d) => d.name);
  if (pii.length) out.push(`Possible PII in: ${pii.join(', ')} — review handling before publishing the catalog.`);
  const pk = r.datasets.filter((d) => d.primary_key_candidates.length > 0);
  if (pk.length) out.push(`Primary-key candidate(s) found in ${pk.length} dataset(s); confirm before declaring keys.`);
  out.push('Chain to data-classification to validate semantic types from values.');
  return out;
}

const TAIL = (anyInferred: boolean, r: CatalogCore) => ({
  confidence_score: 0.85,
  confidence_per_section: { catalog: 1, type_inference: anyInferred ? 0.9 : 1, tagging: 0.85 },
  recommended_actions_priority_order: actions(r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Data Catalog Builder API', version: '1.0.0',
    description: 'Deterministic data catalog builder. Turns dataset schemas (sample rows or explicit columns) into catalog entries with typed columns, null rates, cardinality, primary-key candidates, and heuristic tags. No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/data-catalog-builder/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/build', summary: 'Build catalog entries for one or more datasets', price_usdc: 0.007 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL catalog + reasoning', price_usdc: 0.012 },
    ],
    pricing: [
      { path: '/build', price_usdc: 0.007, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/build', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = build(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL(r.anyInferred, r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = build(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Built catalog entries for ${v.dataset_count} dataset(s) with ${v.datasets.reduce((a, d) => a + d.column_count, 0)} column(s).`,
      key_factors: v.datasets.map((d) => `${d.name}: ${d.column_count} col(s)${d.row_count !== null ? `, ${d.row_count} row(s)` : ' (schema only)'}; tags [${d.tags.join(', ') || 'none'}].`),
      invalidators: INVALIDATORS,
    },
    ...TAIL(r.anyInferred, v),
  });
});

export default router;
