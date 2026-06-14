import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';
import { parseRows, isMissing, asKey, Row } from '../../_aplus/dataset';

// Deterministic scrape-data merger. Combines multiple scraped record sets, dedups
// by a (possibly composite) key, and resolves field-level conflicts with an explicit
// strategy. Reports duplicates merged, unkeyed records dropped, and conflicts found.
// Pure set operations, no LLM, nothing stored.

const router = Router();

const STRATEGIES = ['first', 'last', 'non_null', 'coalesce'] as const;
type Strategy = typeof STRATEGIES[number];
const MAX_SOURCES = 50;
const MAX_CONFLICTS = 100;

export interface SourceStat { name: string; record_count: number; }
export interface ConflictValue { source: string; value: unknown; }
export interface ConflictInfo { key: string; field: string; values: ConflictValue[]; }
export interface MergeCore {
  key: string[];
  strategy: Strategy;
  sources: SourceStat[];
  total_input: number;
  total_output: number;
  duplicates_merged: number;
  dropped_no_key: number;
  conflict_count: number;
  conflicts_truncated: boolean;
  conflicts: ConflictInfo[];
  records: Row[];
}

interface Tagged { source: string; record: Row; }

function merge(body: any): { error: string } | { result: MergeCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with "key" and "sources".' };

  // key → string[]
  let key: string[];
  if (typeof body.key === 'string' && body.key !== '') key = [body.key];
  else if (Array.isArray(body.key) && body.key.length > 0 && body.key.every((k: unknown) => typeof k === 'string' && k !== '')) key = body.key as string[];
  else return { error: '"key" must be a non-empty string or array of column-name strings.' };

  const strategy: Strategy = body.strategy === undefined ? 'last' : body.strategy;
  if (!STRATEGIES.includes(strategy)) return { error: `"strategy" must be one of: ${STRATEGIES.join(', ')}.` };

  if (!Array.isArray(body.sources) || body.sources.length === 0) return { error: '"sources" must be a non-empty array of { name, records } objects.' };
  if (body.sources.length > MAX_SOURCES) return { error: `"sources" exceeds the ${MAX_SOURCES}-source limit.` };

  const sourceStats: SourceStat[] = [];
  const tagged: Tagged[] = [];
  for (let i = 0; i < body.sources.length; i++) {
    const s = body.sources[i];
    if (s === null || typeof s !== 'object' || Array.isArray(s)) return { error: `sources[${i}] must be an object.` };
    if (typeof s.name !== 'string' || s.name === '') return { error: `sources[${i}].name must be a non-empty string.` };
    const p = parseRows(s.records, `sources[${i}].records`);
    if ('error' in p) return p;
    sourceStats.push({ name: s.name, record_count: p.rows.length });
    for (const r of p.rows) tagged.push({ source: s.name, record: r });
  }

  // Group by composite key. Records missing any key field are dropped.
  const groups = new Map<string, Tagged[]>();
  const order: string[] = [];
  let droppedNoKey = 0;
  for (const t of tagged) {
    if (key.some((k) => isMissing(t.record[k], true))) { droppedNoKey++; continue; }
    const kv = key.map((k) => asKey(t.record[k])).join('');
    if (!groups.has(kv)) { groups.set(kv, []); order.push(kv); }
    groups.get(kv)!.push(t);
  }

  const conflicts: ConflictInfo[] = [];
  let conflictCount = 0;
  const records: Row[] = [];

  for (const kv of order) {
    const grp = groups.get(kv)!;
    const keyLabel = grp[0].record === undefined ? kv : key.map((k) => asKey(grp[0].record[k])).join(' / ');

    // Detect field-level conflicts (differing non-missing values within the group).
    if (grp.length > 1) {
      const fields = new Set<string>();
      for (const g of grp) for (const f of Object.keys(g.record)) if (!key.includes(f)) fields.add(f);
      for (const f of fields) {
        const seen: ConflictValue[] = [];
        const distinct = new Set<string>();
        for (const g of grp) {
          const v = g.record[f];
          if (isMissing(v, false)) continue;
          const ck = asKey(v);
          if (!distinct.has(ck)) { distinct.add(ck); seen.push({ source: g.source, value: v }); }
        }
        if (distinct.size > 1) {
          conflictCount++;
          if (conflicts.length < MAX_CONFLICTS) conflicts.push({ key: keyLabel, field: f, values: seen });
        }
      }
    }

    records.push(resolve(grp, key, strategy));
  }

  return {
    result: {
      key, strategy, sources: sourceStats,
      total_input: tagged.length,
      total_output: records.length,
      duplicates_merged: tagged.length - records.length - droppedNoKey,
      dropped_no_key: droppedNoKey,
      conflict_count: conflictCount,
      conflicts_truncated: conflictCount > conflicts.length,
      conflicts,
      records,
    },
  };
}

function resolve(grp: Tagged[], key: string[], strategy: Strategy): Row {
  if (strategy === 'first') return { ...grp[0].record };
  if (strategy === 'last') return { ...grp[grp.length - 1].record };
  // coalesce = first non-missing per field (source order); non_null = last non-missing per field.
  const out: Row = {};
  // seed key fields from the first record (they compare equal by key anyway)
  for (const k of key) out[k] = grp[0].record[k];
  const iter = strategy === 'coalesce' ? grp : [...grp].reverse(); // both walk so that the FIRST write wins
  for (const g of iter) {
    for (const [f, v] of Object.entries(g.record)) {
      if (key.includes(f)) continue;
      if (isMissing(v, false)) continue;
      if (!(f in out)) out[f] = v;
    }
  }
  // include fields that were missing everywhere as null? No — only fields seen non-missing appear,
  // plus any field present (even if missing) in at least one record should surface as null for shape stability.
  for (const g of grp) for (const f of Object.keys(g.record)) if (!key.includes(f) && !(f in out)) out[f] = null;
  return out;
}

const CHAIN_TO = [
  { api: 'scrape-data-pipeline-validator', reason: 'Validate the merged records against the expected scrape schema.' },
  { api: 'data-quality-rules', reason: 'Run uniqueness/not-null rules on the deduped output.' },
];
const INVALIDATORS = [
  'Records missing any key field are dropped (counted in dropped_no_key), not merged on a partial key.',
  'Key equality is by canonical value (1 and "1" collide); supply pre-normalized keys if that is unwanted (chain data-normalizer first).',
  'Conflicts list differing non-missing values per field; with strategy "first"/"last" the whole earliest/latest record wins regardless of per-field conflicts.',
];

function actions(r: MergeCore): string[] {
  const out = [`Merged ${r.total_input} record(s) from ${r.sources.length} source(s) → ${r.total_output} unique key(s) (${r.duplicates_merged} duplicate(s) merged, strategy "${r.strategy}").`];
  if (r.dropped_no_key > 0) out.push(`${r.dropped_no_key} record(s) dropped for missing key field(s).`);
  if (r.conflict_count > 0) out.push(`${r.conflict_count} field-level conflict(s) detected — review conflicts or pick a strategy deliberately.`);
  out.push('Chain to scrape-data-pipeline-validator or data-quality-rules on the merged output.');
  return out;
}

const TAIL = (_r: MergeCore) => ({
  confidence_score: 1, confidence_per_section: { merge: 1 },
  recommended_actions_priority_order: actions(_r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Scrape Data Merger API', version: '1.0.0',
    description: 'Deterministic scrape-data merger. Combines multiple scraped record sets, dedups by a (composite) key, and resolves field conflicts with an explicit strategy (first/last/non_null/coalesce). No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/scrape-data-merger/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/merge', summary: 'Dedup/merge scraped record sets by key', price_usdc: 0.007 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL merge + reasoning', price_usdc: 0.012 },
    ],
    pricing: [
      { path: '/merge', price_usdc: 0.007, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/merge', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = merge(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL(r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = merge(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Deduped ${v.total_input} record(s) by [${v.key.join(', ')}] into ${v.total_output} record(s) using strategy "${v.strategy}".`,
      key_factors: [
        `Sources: ${v.sources.map((s) => `${s.name} (${s.record_count})`).join(', ')}.`,
        `${v.duplicates_merged} duplicate(s) merged, ${v.dropped_no_key} dropped for no key.`,
        `${v.conflict_count} field conflict(s).`,
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL(v),
  });
});

export default router;
