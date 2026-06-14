import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';
import { parseRows, asNum, isMissing, Row } from '../../_aplus/dataset';

// Deterministic data mapper. Applies a field-mapping spec (rename + optional cast
// + default) to a posted dataset and returns the remapped records plus per-mapping
// stats. Optionally carries unmapped source columns through. No LLM, nothing stored.

const router = Router();

const CASTS = ['string', 'number', 'integer', 'boolean', 'date'] as const;
type Cast = typeof CASTS[number];

const TRUE_SET = new Set(['true', '1', 'yes', 'y', 't']);
const FALSE_SET = new Set(['false', '0', 'no', 'n', 'f']);

export interface MappingStat { from: string; to: string; cast: Cast | null; applied: number; defaults_used: number; cast_failures: number; }
export interface MapCore {
  row_count: number;
  mappings_applied: number;
  output_columns: string[];
  total_cast_failures: number;
  total_defaults_used: number;
  per_mapping: MappingStat[];
  rows: Row[];
}

// Returns { value } on success, { failed: true } if the cast could not be applied.
function castValue(v: unknown, cast: Cast): { value: unknown } | { failed: true } {
  switch (cast) {
    case 'string': return { value: String(v) };
    case 'number': { const n = asNum(v); return n === null ? { failed: true } : { value: n }; }
    case 'integer': { const n = asNum(v); return n === null ? { failed: true } : { value: Math.trunc(n) }; }
    case 'boolean': { const k = String(v).trim().toLowerCase(); return TRUE_SET.has(k) ? { value: true } : FALSE_SET.has(k) ? { value: false } : { failed: true }; }
    case 'date': { const t = Date.parse(String(v)); return Number.isNaN(t) ? { failed: true } : { value: new Date(t).toISOString().slice(0, 10) }; }
  }
}

function map(body: any): { error: string } | { result: MapCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with "rows" and "mappings".' };
  const p = parseRows(body.rows);
  if ('error' in p) return p;
  if (!Array.isArray(body.mappings) || body.mappings.length === 0) return { error: '"mappings" must be a non-empty array of { from, to } objects.' };
  const dropUnmapped = body.drop_unmapped === undefined ? true : body.drop_unmapped === true;

  const mappings: { from: string; to: string; cast: Cast | null; hasDefault: boolean; def: unknown }[] = [];
  for (let i = 0; i < body.mappings.length; i++) {
    const m = body.mappings[i];
    if (m === null || typeof m !== 'object' || Array.isArray(m)) return { error: `mappings[${i}] must be an object.` };
    if (typeof m.from !== 'string' || m.from === '') return { error: `mappings[${i}].from must be a non-empty string.` };
    if (typeof m.to !== 'string' || m.to === '') return { error: `mappings[${i}].to must be a non-empty string.` };
    if (m.cast !== undefined && !CASTS.includes(m.cast)) return { error: `mappings[${i}].cast must be one of: ${CASTS.join(', ')}.` };
    mappings.push({ from: m.from, to: m.to, cast: m.cast ?? null, hasDefault: 'default' in m, def: m.default });
  }

  const mappedSources = new Set(mappings.map((m) => m.from));
  const stats: MappingStat[] = mappings.map((m) => ({ from: m.from, to: m.to, cast: m.cast, applied: 0, defaults_used: 0, cast_failures: 0 }));
  const outColumns = new Set<string>();
  const rows: Row[] = [];

  for (const row of p.rows) {
    const outRow: Row = {};
    if (!dropUnmapped) for (const k of Object.keys(row)) if (!mappedSources.has(k)) { outRow[k] = row[k]; outColumns.add(k); }
    mappings.forEach((m, i) => {
      let val: unknown;
      const present = (m.from in row) && !isMissing(row[m.from], false);
      if (!present) {
        if (!m.hasDefault) return; // nothing to write for this row
        val = m.def; stats[i].defaults_used++;
      } else {
        val = row[m.from];
        if (m.cast) { const c = castValue(val, m.cast); if ('failed' in c) { stats[i].cast_failures++; val = null; } else val = c.value; }
      }
      outRow[m.to] = val;
      outColumns.add(m.to);
      stats[i].applied++;
    });
    rows.push(outRow);
  }

  return {
    result: {
      row_count: rows.length,
      mappings_applied: mappings.length,
      output_columns: [...outColumns],
      total_cast_failures: stats.reduce((a, s) => a + s.cast_failures, 0),
      total_defaults_used: stats.reduce((a, s) => a + s.defaults_used, 0),
      per_mapping: stats,
      rows,
    },
  };
}

const CHAIN_TO = [
  { api: 'data-normalizer', reason: 'Canonicalize the mapped values (case/whitespace/date) after renaming.' },
  { api: 'data-quality-rules', reason: 'Enforce types and required fields on the mapped schema.' },
];
const INVALIDATORS = [
  'A source column missing in a row is skipped unless that mapping supplies a "default"; no value is fabricated.',
  'Failed casts (e.g. "abc" → number) set the target to null and are counted in cast_failures — they are not dropped silently.',
  'With drop_unmapped=false, unmapped source columns are carried through under their original names; a mapping target can overwrite them.',
];

function actions(r: MapCore): string[] {
  const out = [`Mapped ${r.mappings_applied} field(s) over ${r.row_count} row(s) → ${r.output_columns.length} output column(s).`];
  if (r.total_cast_failures > 0) out.push(`${r.total_cast_failures} cast failure(s) set to null — inspect source values or relax the cast.`);
  if (r.total_defaults_used > 0) out.push(`${r.total_defaults_used} default(s) filled for missing sources.`);
  if (r.total_cast_failures === 0 && r.total_defaults_used === 0) out.push('Clean mapping — no cast failures or defaults needed.');
  return out;
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Data Mapper API', version: '1.0.0',
    description: 'Deterministic data mapper. Applies a field-mapping spec (rename + optional cast + default) to a dataset and returns remapped records with per-mapping stats. No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/data-mapper/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/map', summary: 'Map/rename/cast dataset fields', price_usdc: 0.006 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL map + reasoning', price_usdc: 0.011 },
    ],
    pricing: [
      { path: '/map', price_usdc: 0.006, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.011, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

const TAIL = (r: MapCore) => ({
  confidence_score: 1, confidence_per_section: { mapping: 1 },
  recommended_actions_priority_order: actions(r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.post('/map', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = map(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL(r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = map(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Applied ${v.mappings_applied} mapping(s) over ${v.row_count} row(s); ${v.total_cast_failures} cast failure(s), ${v.total_defaults_used} default(s) used.`,
      key_factors: v.per_mapping.map((m) => `${m.from} → ${m.to}${m.cast ? ` (${m.cast})` : ''}: applied ${m.applied}, failures ${m.cast_failures}.`),
      invalidators: INVALIDATORS,
    },
    ...TAIL(v),
  });
});

export default router;
