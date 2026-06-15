import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';
import { parseRows, isMissing, Row } from '../../_aplus/dataset';

// Deterministic scrape-data enricher. Augments scraped records with new fields via
// declarative, deterministic rules — constant, concat, coalesce, lookup_map, and
// regex_extract (ReDoS-guarded). No external lookups, no LLM, nothing stored.

const router = Router();

const RULE_TYPES = ['constant', 'concat', 'coalesce', 'lookup_map', 'regex_extract'] as const;
const MAX_RULES = 50;
const MAX_PATTERN = 300;
const SAFE_FLAGS = /^[imsu]*$/; // never g/y (stateful lastIndex), bounded set
const NESTED_QUANT = /\([^)]*[+*][^)]*\)[+*]/; // crude (a+)+ / (a*)* ReDoS guard

export interface RuleResult { type: string; target: string; cells_written: number; matched?: number; defaulted?: number; misses?: number; }
export interface EnrichCore { record_count: number; rules_applied: number; per_rule: RuleResult[]; records: Row[]; }

type Rule =
  | { type: 'constant'; target: string; value: unknown }
  | { type: 'concat'; target: string; sources: string[]; separator: string }
  | { type: 'coalesce'; target: string; sources: string[] }
  | { type: 'lookup_map'; target: string; source: string; map: Record<string, unknown>; hasDefault: boolean; def: unknown }
  | { type: 'regex_extract'; target: string; source: string; re: RegExp; group: number };

function parseRule(r: any, i: number): { error: string } | { rule: Rule } {
  if (r === null || typeof r !== 'object' || Array.isArray(r)) return { error: `rules[${i}] must be an object.` };
  if (!RULE_TYPES.includes(r.type)) return { error: `rules[${i}].type must be one of: ${RULE_TYPES.join(', ')}.` };
  if (typeof r.target !== 'string' || r.target === '') return { error: `rules[${i}].target must be a non-empty string.` };
  if (r.type === 'constant') {
    if (!('value' in r)) return { error: `rules[${i}] (constant) needs a "value".` };
    return { rule: { type: 'constant', target: r.target, value: r.value } };
  }
  if (r.type === 'concat' || r.type === 'coalesce') {
    if (!Array.isArray(r.sources) || r.sources.length === 0 || !r.sources.every((s: unknown) => typeof s === 'string' && s !== '')) return { error: `rules[${i}] (${r.type}) needs a non-empty "sources" array of column names.` };
    if (r.type === 'concat') {
      const sep = r.separator === undefined ? '' : r.separator;
      if (typeof sep !== 'string') return { error: `rules[${i}] (concat).separator must be a string.` };
      return { rule: { type: 'concat', target: r.target, sources: r.sources, separator: sep } };
    }
    return { rule: { type: 'coalesce', target: r.target, sources: r.sources } };
  }
  if (r.type === 'lookup_map') {
    if (typeof r.source !== 'string' || r.source === '') return { error: `rules[${i}] (lookup_map) needs a "source" column.` };
    if (r.map === null || typeof r.map !== 'object' || Array.isArray(r.map)) return { error: `rules[${i}] (lookup_map).map must be an object of key → value.` };
    return { rule: { type: 'lookup_map', target: r.target, source: r.source, map: r.map, hasDefault: 'default' in r, def: r.default } };
  }
  // regex_extract
  if (typeof r.source !== 'string' || r.source === '') return { error: `rules[${i}] (regex_extract) needs a "source" column.` };
  if (typeof r.pattern !== 'string' || r.pattern === '') return { error: `rules[${i}] (regex_extract) needs a "pattern" string.` };
  if (r.pattern.length > MAX_PATTERN) return { error: `rules[${i}] pattern exceeds ${MAX_PATTERN} chars.` };
  if (NESTED_QUANT.test(r.pattern)) return { error: `rules[${i}] pattern has a nested unbounded quantifier (ReDoS risk); rewrite it.` };
  const flags = r.flags === undefined ? '' : r.flags;
  if (typeof flags !== 'string' || !SAFE_FLAGS.test(flags)) return { error: `rules[${i}].flags may only contain i, m, s, u.` };
  const group = r.group === undefined ? 1 : r.group;
  if (typeof group !== 'number' || !Number.isInteger(group) || group < 0) return { error: `rules[${i}].group must be a non-negative integer (default 1).` };
  let re: RegExp;
  try { re = new RegExp(r.pattern, flags); } catch { return { error: `rules[${i}].pattern is not a valid regular expression.` }; }
  return { rule: { type: 'regex_extract', target: r.target, source: r.source, re, group } };
}

function enrich(body: any): { error: string } | { result: EnrichCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with "records" and "rules".' };
  const p = parseRows(body.records, 'records');
  if ('error' in p) return p;
  if (!Array.isArray(body.rules) || body.rules.length === 0) return { error: '"rules" must be a non-empty array.' };
  if (body.rules.length > MAX_RULES) return { error: `"rules" exceeds the ${MAX_RULES}-rule limit.` };

  const rules: Rule[] = [];
  for (let i = 0; i < body.rules.length; i++) {
    const pr = parseRule(body.rules[i], i);
    if ('error' in pr) return pr;
    rules.push(pr.rule);
  }

  const records: Row[] = p.rows.map((r) => ({ ...r }));
  const per_rule: RuleResult[] = [];

  for (const rule of rules) {
    let written = 0, matched = 0, defaulted = 0, misses = 0;
    for (const row of records) {
      if (rule.type === 'constant') { row[rule.target] = rule.value; written++; continue; }
      if (rule.type === 'concat') {
        row[rule.target] = rule.sources.map((s) => (isMissing(row[s], false) ? '' : String(row[s]))).join(rule.separator); written++; continue;
      }
      if (rule.type === 'coalesce') {
        let val: unknown = null; let hit = false;
        for (const s of rule.sources) { if (!isMissing(row[s], false)) { val = row[s]; hit = true; break; } }
        row[rule.target] = val; written++; if (hit) matched++; else misses++; continue;
      }
      if (rule.type === 'lookup_map') {
        const v = row[rule.source];
        if (isMissing(v, false)) { if (rule.hasDefault) { row[rule.target] = rule.def; defaulted++; } else { row[rule.target] = null; misses++; } written++; continue; }
        const k = String(v);
        if (Object.prototype.hasOwnProperty.call(rule.map, k)) { row[rule.target] = rule.map[k]; matched++; }
        else if (rule.hasDefault) { row[rule.target] = rule.def; defaulted++; }
        else { row[rule.target] = null; misses++; }
        written++; continue;
      }
      // regex_extract
      const v = row[rule.source];
      if (isMissing(v, false)) { row[rule.target] = null; misses++; written++; continue; }
      const m = String(v).match(rule.re);
      if (m && m[rule.group] !== undefined) { row[rule.target] = m[rule.group]; matched++; }
      else { row[rule.target] = null; misses++; }
      written++;
    }
    const res: RuleResult = { type: rule.type, target: rule.target, cells_written: written };
    if (rule.type === 'coalesce' || rule.type === 'lookup_map' || rule.type === 'regex_extract') { res.matched = matched; res.misses = misses; }
    if (rule.type === 'lookup_map') res.defaulted = defaulted;
    per_rule.push(res);
  }

  return { result: { record_count: records.length, rules_applied: rules.length, per_rule, records } };
}

const CHAIN_TO = [
  { api: 'scrape-data-pipeline-validator', reason: 'Validate the enriched records against the expected schema.' },
  { api: 'data-classification', reason: 'Re-classify columns now that derived fields exist.' },
];
const INVALIDATORS = [
  'Enrichment is deterministic and local: lookup_map uses the supplied table only (no external lookups); an unmapped key uses the rule default or null.',
  'regex_extract returns the requested capture group (default group 1; group 0 = whole match) of the FIRST match, or null if no match; g/y flags are rejected.',
  'concat/coalesce treat null/empty as missing; concat renders missing as "" while coalesce skips to the next source.',
];

function actions(r: EnrichCore): string[] {
  const out = [`Applied ${r.rules_applied} rule(s) over ${r.record_count} record(s).`];
  const misses = r.per_rule.reduce((a, p) => a + (p.misses ?? 0), 0);
  if (misses > 0) out.push(`${misses} unmatched cell(s) across lookup/coalesce/regex rules set to null or default — inspect source values.`);
  out.push('Chain to scrape-data-pipeline-validator to confirm the enriched shape.');
  return out;
}

const TAIL = (_r: EnrichCore) => ({
  confidence_score: 1, confidence_per_section: { enrichment: 1 },
  recommended_actions_priority_order: actions(_r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Scrape Data Enricher API', version: '1.0.0',
    description: 'Deterministic scrape-data enricher. Augments scraped records with new fields via declarative rules (constant, concat, coalesce, lookup_map, regex_extract). No external lookups, no LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/scrape-data-enricher/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/enrich', summary: 'Augment records with deterministic enrichment rules', price_usdc: 0.007 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL enrich + reasoning', price_usdc: 0.012 },
    ],
    pricing: [
      { path: '/enrich', price_usdc: 0.007, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/enrich', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = enrich(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL(r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = enrich(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Applied ${v.rules_applied} enrichment rule(s) over ${v.record_count} record(s).`,
      key_factors: v.per_rule.map((p) => `${p.type} → ${p.target}: wrote ${p.cells_written}${p.matched !== undefined ? `, matched ${p.matched}` : ''}${p.misses ? `, missed ${p.misses}` : ''}.`),
      invalidators: INVALIDATORS,
    },
    ...TAIL(v),
  });
});

export default router;
