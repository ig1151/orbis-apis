import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { PRIVACY } from '../../_aplus/util';
import { EXECUTION_METADATA_PLUS } from '../../_aplus/specparts-plus';

// Deterministic JSONPath evaluator over a supplied JSON document. Supports a
// documented subset: root ($), child (.name / ['name']), wildcard (* / [*]),
// recursive descent (..), array index incl. negative ([n]), slice ([s:e:step]),
// and union ([0,2] / ['a','b']). Filter/script expressions ([?(...)]) are NOT
// supported. Returns each match with its normalized path. No LLM, nothing stored.

const router = Router();

const MAX_PATH_LEN = 2000;
const MAX_MATCHES = 10_000;
const MAX_DESCEND_NODES = 200_000;
const MAX_BATCH_PATHS = 100;

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
type Seg = string | number;

interface Slice { start?: number; end?: number; step?: number }
type Selector =
  | { kind: 'child'; name: string }
  | { kind: 'index'; index: number }
  | { kind: 'wildcard' }
  | { kind: 'slice'; slice: Slice }
  | { kind: 'union'; names?: string[]; indices?: number[] };
interface Step { recursive: boolean; sel: Selector }

const isInt = (s: string) => /^-?\d+$/.test(s.trim());

function parseBracket(path: string, i: number): { error: string } | { sel: Selector; next: number } {
  // path[i] === '['. Extract inner content, respecting quotes.
  let j = i + 1, inner = '', quote: string | null = null;
  while (j < path.length) {
    const ch = path[j];
    if (quote) {
      if (ch === '\\' && j + 1 < path.length) { inner += ch + path[j + 1]; j += 2; continue; }
      if (ch === quote) { quote = null; inner += ch; j++; continue; }
      inner += ch; j++; continue;
    }
    if (ch === "'" || ch === '"') { quote = ch; inner += ch; j++; continue; }
    if (ch === ']') break;
    inner += ch; j++;
  }
  if (j >= path.length) return { error: `unterminated "[" at position ${i}.` };
  const next = j + 1;
  const trimmed = inner.trim();
  if (trimmed === '') return { error: `empty "[]" at position ${i}.` };
  if (trimmed === '*') return { sel: { kind: 'wildcard' }, next };

  if (trimmed[0] === "'" || trimmed[0] === '"') {
    const names = parseQuotedList(inner);
    if ('error' in names) return { error: names.error };
    return { sel: names.list.length === 1 ? { kind: 'child', name: names.list[0] } : { kind: 'union', names: names.list }, next };
  }
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    if (parts.length > 3) return { error: `invalid slice "${trimmed}".` };
    const sl: Slice = {};
    const keys: (keyof Slice)[] = ['start', 'end', 'step'];
    for (let k = 0; k < parts.length; k++) {
      const p = parts[k].trim();
      if (p === '') continue;
      if (!isInt(p)) return { error: `slice bound "${p}" is not an integer.` };
      sl[keys[k]] = Number(p);
    }
    if (sl.step === 0) return { error: 'slice step cannot be 0.' };
    return { sel: { kind: 'slice', slice: sl }, next };
  }
  if (trimmed.includes(',')) {
    const items = trimmed.split(',').map((s) => s.trim());
    const indices: number[] = [];
    for (const it of items) { if (!isInt(it)) return { error: `union index "${it}" is not an integer (mix quoted names for name unions).` }; indices.push(Number(it)); }
    return { sel: { kind: 'union', indices }, next };
  }
  if (!isInt(trimmed)) return { error: `"[${trimmed}]" is not a valid index, slice, union, or quoted name.` };
  return { sel: { kind: 'index', index: Number(trimmed) }, next };
}

function parseQuotedList(inner: string): { error: string } | { list: string[] } {
  const list: string[] = [];
  let k = 0;
  while (k < inner.length) {
    while (k < inner.length && (inner[k] === ' ' || inner[k] === ',')) k++;
    if (k >= inner.length) break;
    const q = inner[k];
    if (q !== "'" && q !== '"') return { error: 'expected a quoted name in bracket selector.' };
    k++;
    let s = '';
    while (k < inner.length && inner[k] !== q) {
      if (inner[k] === '\\' && k + 1 < inner.length) { s += inner[k + 1]; k += 2; continue; }
      s += inner[k]; k++;
    }
    if (k >= inner.length) return { error: 'unterminated quoted name.' };
    k++; // closing quote
    list.push(s);
  }
  return list.length ? { list } : { error: 'empty quoted name list.' };
}

function parsePath(path: string): { error: string } | { steps: Step[] } {
  if (typeof path !== 'string' || path === '') return { error: '"path" must be a non-empty string.' };
  if (path.length > MAX_PATH_LEN) return { error: `"path" exceeds the ${MAX_PATH_LEN}-character limit.` };
  if (path[0] !== '$') return { error: 'JSONPath must start with "$".' };
  const steps: Step[] = [];
  let i = 1;
  while (i < path.length) {
    const c = path[i];
    if (c === '.') {
      let recursive = false;
      if (path[i + 1] === '.') { recursive = true; i += 2; } else { i += 1; }
      if (path[i] === '[') {
        const b = parseBracket(path, i);
        if ('error' in b) return { error: b.error };
        steps.push({ recursive, sel: b.sel }); i = b.next; continue;
      }
      if (path[i] === '*') { steps.push({ recursive, sel: { kind: 'wildcard' } }); i += 1; continue; }
      if (recursive && i >= path.length) { steps.push({ recursive, sel: { kind: 'wildcard' } }); break; }
      let name = '';
      while (i < path.length && path[i] !== '.' && path[i] !== '[') { name += path[i]; i++; }
      if (name === '') return { error: `expected a name after "." at position ${i}.` };
      steps.push({ recursive, sel: { kind: 'child', name } });
      continue;
    }
    if (c === '[') {
      const b = parseBracket(path, i);
      if ('error' in b) return { error: b.error };
      steps.push({ recursive: false, sel: b.sel }); i = b.next; continue;
    }
    return { error: `unexpected character "${c}" at position ${i} (expected "." or "[").` };
  }
  return { steps };
}

interface Match { path: Seg[]; value: Json }

const isObj = (v: Json): v is { [k: string]: Json } => v !== null && typeof v === 'object' && !Array.isArray(v);

function descendants(m: Match, out: Match[]): { error?: string } {
  out.push(m);
  if (out.length > MAX_DESCEND_NODES) return { error: 'document too large for recursive descent.' };
  if (Array.isArray(m.value)) {
    for (let i = 0; i < m.value.length; i++) { const r = descendants({ path: [...m.path, i], value: m.value[i] }, out); if (r.error) return r; }
  } else if (isObj(m.value)) {
    for (const k of Object.keys(m.value)) { const r = descendants({ path: [...m.path, k], value: m.value[k] }, out); if (r.error) return r; }
  }
  return {};
}

function applySelector(sel: Selector, m: Match, out: Match[]): void {
  const v = m.value;
  switch (sel.kind) {
    case 'child':
      if (isObj(v) && Object.prototype.hasOwnProperty.call(v, sel.name)) out.push({ path: [...m.path, sel.name], value: v[sel.name] });
      break;
    case 'index':
      if (Array.isArray(v)) { const idx = sel.index < 0 ? v.length + sel.index : sel.index; if (idx >= 0 && idx < v.length) out.push({ path: [...m.path, idx], value: v[idx] }); }
      break;
    case 'wildcard':
      if (Array.isArray(v)) v.forEach((x, i) => out.push({ path: [...m.path, i], value: x }));
      else if (isObj(v)) for (const k of Object.keys(v)) out.push({ path: [...m.path, k], value: v[k] });
      break;
    case 'slice':
      if (Array.isArray(v)) sliceArray(v, sel.slice).forEach(([i, x]) => out.push({ path: [...m.path, i], value: x }));
      break;
    case 'union':
      if (sel.names && isObj(v)) for (const name of sel.names) { if (Object.prototype.hasOwnProperty.call(v, name)) out.push({ path: [...m.path, name], value: v[name] }); }
      if (sel.indices && Array.isArray(v)) for (const raw of sel.indices) { const idx = raw < 0 ? v.length + raw : raw; if (idx >= 0 && idx < v.length) out.push({ path: [...m.path, idx], value: v[idx] }); }
      break;
  }
}

function sliceArray(arr: Json[], s: Slice): [number, Json][] {
  const len = arr.length;
  const step = s.step ?? 1;
  const norm = (x: number) => (x < 0 ? x + len : x);
  let start: number, end: number;
  if (step > 0) {
    start = s.start === undefined ? 0 : Math.min(Math.max(norm(s.start), 0), len);
    end = s.end === undefined ? len : Math.min(Math.max(norm(s.end), 0), len);
  } else {
    start = s.start === undefined ? len - 1 : Math.min(Math.max(norm(s.start), -1), len - 1);
    end = s.end === undefined ? -1 : Math.min(Math.max(norm(s.end), -1), len - 1);
  }
  const out: [number, Json][] = [];
  if (step > 0) for (let i = start; i < end; i += step) out.push([i, arr[i]]);
  else for (let i = start; i > end; i += step) out.push([i, arr[i]]);
  return out;
}

function normPath(segs: Seg[]): string {
  let s = '$';
  for (const seg of segs) s += typeof seg === 'number' ? `[${seg}]` : `['${String(seg).replace(/'/g, "\\'")}']`;
  return s;
}

interface QueryResult { path: string; match_count: number; matches: { path: string; value: Json }[] }

function evaluate(document: Json, steps: Step[]): { error: string } | { matches: Match[] } {
  let current: Match[] = [{ path: [], value: document }];
  for (const step of steps) {
    const next: Match[] = [];
    let pool: Match[];
    if (step.recursive) {
      pool = [];
      for (const m of current) { const r = descendants(m, pool); if (r.error) return { error: r.error }; }
    } else {
      pool = current;
    }
    for (const m of pool) applySelector(step.sel, m, next);
    if (next.length > MAX_MATCHES) return { error: `query produced more than ${MAX_MATCHES} matches; narrow the path.` };
    current = next;
  }
  return { matches: current };
}

function doQuery(body: any): { error: string } | { result: QueryResult } {
  if (body === null || typeof body !== 'object' || Array.isArray(body) || !('document' in body)) return { error: 'Provide an object with a "document" and a "path".' };
  const parsed = parsePath(body.path);
  if ('error' in parsed) return { error: parsed.error };
  const ev = evaluate(body.document as Json, parsed.steps);
  if ('error' in ev) return { error: ev.error };
  return { result: { path: body.path, match_count: ev.matches.length, matches: ev.matches.map((m) => ({ path: normPath(m.path), value: m.value })) } };
}

interface BatchItem { path: string; match_count: number; matches: { path: string; value: Json }[]; error: string | null }
interface BatchResult { document_evaluated: boolean; query_count: number; total_matches: number; results: BatchItem[] }

// Evaluate many JSONPaths against ONE document in a single paid call. A path that
// fails to parse/evaluate yields an item with error set (its matches empty) — the
// batch as a whole still succeeds, so one bad path never sinks the others.
function doBatch(body: any): { error: string } | { result: BatchResult } {
  if (body === null || typeof body !== 'object' || Array.isArray(body) || !('document' in body)) return { error: 'Provide an object with a "document" and a "paths" array of JSONPath strings.' };
  if (!Array.isArray(body.paths)) return { error: '"paths" must be an array of JSONPath strings.' };
  if (body.paths.length === 0) return { error: '"paths" must contain at least one JSONPath.' };
  if (body.paths.length > MAX_BATCH_PATHS) return { error: `"paths" exceeds the ${MAX_BATCH_PATHS}-query limit.` };
  const doc = body.document as Json;
  const results: BatchItem[] = [];
  let total = 0;
  for (let i = 0; i < body.paths.length; i++) {
    const p = body.paths[i];
    if (typeof p !== 'string') return { error: `paths[${i}] must be a string.` };
    const parsed = parsePath(p);
    if ('error' in parsed) { results.push({ path: p, match_count: 0, matches: [], error: parsed.error }); continue; }
    const ev = evaluate(doc, parsed.steps);
    if ('error' in ev) { results.push({ path: p, match_count: 0, matches: [], error: ev.error }); continue; }
    const matches = ev.matches.map((m) => ({ path: normPath(m.path), value: m.value }));
    total += matches.length;
    results.push({ path: p, match_count: matches.length, matches, error: null });
  }
  return { result: { document_evaluated: true, query_count: results.length, total_matches: total, results } };
}

const CHAIN_TO = [
  { api: 'json-pointer', reason: 'Resolve a matched path as an exact RFC 6901 pointer before reading or writing it.' },
  { api: 'json-patch', reason: 'Apply an RFC 6902 add/replace/remove at a located path to mutate the document.' },
  { api: 'json-schema-validator', reason: 'Validate the extracted values against a JSON Schema before passing them downstream.' },
];
const INVALIDATORS = [
  'Supported JSONPath subset: $ (root), .name and [\'name\'] (child), * and [*] (wildcard), .. (recursive descent), [n] (index, negative allowed), [start:end:step] (slice, Python-style, negative/step), and unions [0,2] / [\'a\',\'b\']. Evaluation is exact within this subset.',
  'NOT supported: filter expressions [?(@.price<10)], script expressions [(...)], and current-node (@) references. Such a path is rejected with a parse error rather than silently mis-evaluated.',
  'Match ORDER follows document order (object keys in insertion order, array indices ascending); recursive descent visits a node before its children. Unions preserve the order written. Duplicate matches from overlapping unions are NOT de-duplicated.',
  'Matched paths are emitted in normalized bracket form ($[\'a\'][0]); object keys are quoted, array indices are bracketed integers.',
  '/batch evaluates many paths against ONE document in a single paid call; a path that fails to parse/evaluate is returned with its "error" set and empty matches — it never fails the whole batch.',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA_PLUS,
});

const CAPABILITIES = ['json_query', 'json_extraction', 'json_navigation', 'batch_query', 'path_resolution'];

const DISCOVERY = {
  name: 'JSONPath API', version: '1.0.0',
  description: 'Deterministic JSONPath evaluator over a supplied JSON document. Supports root, child, wildcard, recursive descent, index (incl. negative), slice, and union; filter/script expressions are not supported. /query returns all matches with normalized paths; /value returns the first match; /batch evaluates many paths in one call. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/jsonpath/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: CAPABILITIES,
  endpoints: [
    { method: 'POST', path: '/query', summary: 'Evaluate a JSONPath → all matches', price_usdc: 0.007 },
    { method: 'POST', path: '/value', summary: 'First match value (or null)', price_usdc: 0.006 },
    { method: 'POST', path: '/batch', summary: 'Evaluate many JSONPaths in one call', price_usdc: 0.013 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL query + reasoning', price_usdc: 0.012 },
  ],
  pricing: [
    { path: '/query', price_usdc: 0.007, currency: 'USDC' },
    { path: '/value', price_usdc: 0.006, currency: 'USDC' },
    { path: '/batch', price_usdc: 0.013, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
  ],
  x402_compatible: true,
};

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

const CONF = { parse: 1, evaluation: 1, path_resolution: 1 };
function queryActions(v: QueryResult): string[] {
  if (v.match_count === 0) return [`No node matched ${v.path}; broaden the path or check the document shape.`];
  return [
    `Extract the ${v.match_count} matched value(s) for downstream use.`,
    `Resolve a match path (e.g. ${v.matches[0].path}) via json-pointer for exact read/write.`,
    'Validate the extracted values against a JSON Schema before passing them on.',
  ];
}

router.post('/query', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = doQuery(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, { ...v, ...TAIL(CONF, queryActions(v)) });
});

router.post('/value', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = doQuery(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  const found = v.match_count > 0;
  respond(res, t0, { path: v.path, found, value: found ? v.matches[0].value : null, matched_path: found ? v.matches[0].path : null, match_count: v.match_count, ...TAIL(CONF, found ? [`Use the value at ${v.matches[0].path}.`, 'Resolve that path via json-pointer for exact read/write.'] : [`No match for ${v.path}; broaden the path or check the document shape.`]) });
});

router.post('/batch', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = doBatch(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  const failed = v.results.filter((x) => x.error !== null).length;
  respond(res, t0, { ...v, ...TAIL(CONF, [
    `Collected ${v.total_matches} match(es) across ${v.query_count} path(s) in one call.`,
    ...(failed ? [`${failed} path(s) failed to evaluate — see each item's "error".`] : []),
    'Extract per-path values and route them to downstream steps.',
  ]) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = doQuery(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Parsed JSONPath "${v.path}" into its selector steps and evaluated it against the document in document order, yielding ${v.match_count} match(es).`,
      key_factors: [`Match count: ${v.match_count}.`, `First path: ${v.matches[0]?.path ?? '(none)'}.`],
      invalidators: INVALIDATORS,
    },
    ...TAIL(CONF, queryActions(v)),
  });
});

export default router;
