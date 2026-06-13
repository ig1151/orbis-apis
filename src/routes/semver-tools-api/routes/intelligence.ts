import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic Semantic Versioning (semver.org 2.0.0) toolkit. /parse validates
// and decomposes a version, /compare orders two versions by precedence (build
// metadata ignored, prerelease rules per §11), /satisfies tests a version against
// an npm-style range (^, ~, x-ranges, hyphen ranges, comparators, ||). Pure
// functions, no LLM, nothing stored.

const router = Router();

interface SV { major: number; minor: number; patch: number; pre: (string | number)[]; build: string[]; }
interface Cmp { op: '>' | '>=' | '<' | '<=' | '='; v: SV; }

const sv = (M: number, m: number, p: number, pre: (string | number)[] = []): SV => ({ major: M, minor: m, patch: p, pre, build: [] });
const fmt = (v: SV) => `${v.major}.${v.minor}.${v.patch}${v.pre.length ? '-' + v.pre.join('.') : ''}`;

const CORE_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

function parsePre(s: string): (string | number)[] | null {
  if (s === '') return null;
  const ids = s.split('.');
  const out: (string | number)[] = [];
  for (const id of ids) {
    if (id === '') return null;
    if (/^[0-9]+$/.test(id)) { if (id.length > 1 && id[0] === '0') return null; out.push(parseInt(id, 10)); }
    else if (/^[0-9a-zA-Z-]+$/.test(id)) out.push(id);
    else return null;
  }
  return out;
}

function parseSV(input: string): SV | null {
  let s = input.trim();
  if (s[0] === 'v' || s[0] === 'V' || s[0] === '=') s = s.slice(1).trim();
  const m = CORE_RE.exec(s);
  if (!m) return null;
  let pre: (string | number)[] = [];
  if (m[4] !== undefined) { const p = parsePre(m[4]); if (p === null) return null; pre = p; }
  return { major: +m[1], minor: +m[2], patch: +m[3], pre, build: m[5] ? m[5].split('.') : [] };
}

function comparePre(a: (string | number)[], b: (string | number)[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  if (a.length === 0) return 1;   // no prerelease > has prerelease
  if (b.length === 0) return -1;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i], y = b[i];
    const xn = typeof x === 'number', yn = typeof y === 'number';
    if (xn && yn) { if (x !== y) return (x as number) < (y as number) ? -1 : 1; }
    else if (xn) return -1;       // numeric < alphanumeric
    else if (yn) return 1;
    else { if (x !== y) return (x as string) < (y as string) ? -1 : 1; }
  }
  return a.length === b.length ? 0 : a.length < b.length ? -1 : 1;
}

function cmp(a: SV, b: SV): number {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
  return comparePre(a.pre, b.pre);
}

// ---- range parsing ----
interface Partial { M: number; m: number; p: number; pre: (string | number)[]; xMajor: boolean; xMinor: boolean; xPatch: boolean; }

function parsePartial(s: string): Partial | null {
  s = s.trim();
  if (s === '' || s === '*' || s.toLowerCase() === 'x') return { M: 0, m: 0, p: 0, pre: [], xMajor: true, xMinor: true, xPatch: true };
  let rest = s;
  const plus = rest.indexOf('+'); if (plus >= 0) rest = rest.slice(0, plus);
  let pre: (string | number)[] = [];
  const dash = rest.indexOf('-');
  let core = rest;
  if (dash >= 0) { core = rest.slice(0, dash); const pp = parsePre(rest.slice(dash + 1)); if (pp === null) return null; pre = pp; }
  const parts = core.split('.');
  if (parts.length > 3) return null;
  const isX = (x?: string) => x === undefined || x === '' || x === 'x' || x === 'X' || x === '*';
  const toNum = (x: string): number | null => (/^[0-9]+$/.test(x) ? parseInt(x, 10) : null);
  let M = 0, m = 0, p = 0, xMajor = false, xMinor = false, xPatch = false;
  if (isX(parts[0])) xMajor = true; else { const n = toNum(parts[0]); if (n === null) return null; M = n; }
  if (isX(parts[1])) xMinor = true; else { const n = toNum(parts[1]); if (n === null) return null; m = n; }
  if (isX(parts[2])) xPatch = true; else { const n = toNum(parts[2]); if (n === null) return null; p = n; }
  if (xMajor) { xMinor = true; xPatch = true; }
  if (xMinor) xPatch = true;
  return { M, m, p, pre, xMajor, xMinor, xPatch };
}

function xrange(pp: Partial): Cmp[] {
  if (pp.xMajor) return [{ op: '>=', v: sv(0, 0, 0) }];
  if (pp.xMinor) return [{ op: '>=', v: sv(pp.M, 0, 0) }, { op: '<', v: sv(pp.M + 1, 0, 0) }];
  if (pp.xPatch) return [{ op: '>=', v: sv(pp.M, pp.m, 0) }, { op: '<', v: sv(pp.M, pp.m + 1, 0) }];
  return [{ op: '=', v: sv(pp.M, pp.m, pp.p, pp.pre) }];
}

function operator(op: string, pp: Partial): Cmp[] {
  const full = !pp.xMajor && !pp.xMinor && !pp.xPatch;
  switch (op) {
    case '=': return xrange(pp);
    case '>=':
      if (pp.xMajor) return [{ op: '>=', v: sv(0, 0, 0) }];
      if (pp.xMinor) return [{ op: '>=', v: sv(pp.M, 0, 0) }];
      if (pp.xPatch) return [{ op: '>=', v: sv(pp.M, pp.m, 0) }];
      return [{ op: '>=', v: sv(pp.M, pp.m, pp.p, pp.pre) }];
    case '>':
      if (pp.xMajor) return [{ op: '<', v: sv(0, 0, 0) }];           // matches nothing
      if (pp.xMinor) return [{ op: '>=', v: sv(pp.M + 1, 0, 0) }];
      if (pp.xPatch) return [{ op: '>=', v: sv(pp.M, pp.m + 1, 0) }];
      return [{ op: '>', v: sv(pp.M, pp.m, pp.p, pp.pre) }];
    case '<':
      if (pp.xMajor) return [{ op: '<', v: sv(0, 0, 0) }];           // matches nothing
      if (pp.xMinor) return [{ op: '<', v: sv(pp.M, 0, 0) }];
      if (pp.xPatch) return [{ op: '<', v: sv(pp.M, pp.m, 0) }];
      return [{ op: '<', v: sv(pp.M, pp.m, pp.p, pp.pre) }];
    case '<=':
      if (pp.xMajor) return [{ op: '>=', v: sv(0, 0, 0) }];          // matches everything
      if (pp.xMinor) return [{ op: '<', v: sv(pp.M + 1, 0, 0) }];
      if (pp.xPatch) return [{ op: '<', v: sv(pp.M, pp.m + 1, 0) }];
      return [{ op: '<=', v: sv(pp.M, pp.m, pp.p, full ? pp.pre : []) }];
    default: return [];
  }
}

function caret(pp: Partial): Cmp[] {
  if (pp.xMajor) return [{ op: '>=', v: sv(0, 0, 0) }];
  const lower: Cmp = { op: '>=', v: sv(pp.M, pp.xMinor ? 0 : pp.m, pp.xPatch ? 0 : pp.p, (pp.xMinor || pp.xPatch) ? [] : pp.pre) };
  let upper: SV;
  if (pp.M !== 0) upper = sv(pp.M + 1, 0, 0);
  else if (!pp.xMinor && pp.m !== 0) upper = sv(0, pp.m + 1, 0);
  else if (!pp.xMinor && pp.m === 0 && !pp.xPatch) upper = sv(0, 0, pp.p + 1);
  else if (!pp.xMinor && pp.m === 0 && pp.xPatch) upper = sv(0, 1, 0);
  else upper = sv(pp.M + 1, 0, 0);
  return [lower, { op: '<', v: upper }];
}

function tilde(pp: Partial): Cmp[] {
  if (pp.xMajor) return [{ op: '>=', v: sv(0, 0, 0) }];
  const lower: Cmp = { op: '>=', v: sv(pp.M, pp.xMinor ? 0 : pp.m, pp.xPatch ? 0 : pp.p, (pp.xMinor || pp.xPatch) ? [] : pp.pre) };
  const upper = pp.xMinor ? sv(pp.M + 1, 0, 0) : sv(pp.M, pp.m + 1, 0);
  return [lower, { op: '<', v: upper }];
}

function expand(tok: string): Cmp[] | null {
  tok = tok.trim();
  if (tok === '') return [{ op: '>=', v: sv(0, 0, 0) }];
  if (tok[0] === '^') { const pp = parsePartial(tok.slice(1)); return pp ? caret(pp) : null; }
  if (tok[0] === '~') { let rest = tok.slice(1); if (rest[0] === '>') rest = rest.slice(1); const pp = parsePartial(rest); return pp ? tilde(pp) : null; }
  const m = tok.match(/^(>=|<=|>|<|=)(.*)$/);
  if (m) { const pp = parsePartial(m[2]); return pp ? operator(m[1], pp) : null; }
  const pp = parsePartial(tok);
  return pp ? xrange(pp) : null;
}

function hyphen(a: string, b: string): Cmp[] | null {
  const ppa = parsePartial(a), ppb = parsePartial(b);
  if (!ppa || !ppb) return null;
  const lower = operator('>=', ppa);
  let upper: Cmp;
  if (ppb.xMajor) upper = { op: '>=', v: sv(0, 0, 0) };
  else if (ppb.xMinor) upper = { op: '<', v: sv(ppb.M + 1, 0, 0) };
  else if (ppb.xPatch) upper = { op: '<', v: sv(ppb.M, ppb.m + 1, 0) };
  else upper = { op: '<=', v: sv(ppb.M, ppb.m, ppb.p, ppb.pre) };
  return [...lower, upper];
}

function tokenizeGroup(group: string): Cmp[] | null {
  group = group.trim();
  if (group === '') return [{ op: '>=', v: sv(0, 0, 0) }];
  const hy = group.match(/^(.+?)\s+-\s+(.+)$/);
  if (hy) return hyphen(hy[1].trim(), hy[2].trim());
  const glued = group.replace(/(>=|<=|>|<|=|\^|~>|~)\s+/g, '$1');
  const toks = glued.split(/\s+/).filter(Boolean);
  const cmps: Cmp[] = [];
  for (const t of toks) { const e = expand(t); if (e === null) return null; cmps.push(...e); }
  return cmps;
}

function parseRange(range: string): Cmp[][] | null {
  const groups = range.split('||');
  const out: Cmp[][] = [];
  for (const g of groups) { const c = tokenizeGroup(g); if (c === null) return null; out.push(c); }
  return out;
}

function satisfiesCmp(v: SV, c: Cmp): boolean {
  const r = cmp(v, c.v);
  switch (c.op) {
    case '>': return r > 0;
    case '>=': return r >= 0;
    case '<': return r < 0;
    case '<=': return r <= 0;
    case '=': return r === 0;
  }
}

function satisfiesSet(v: SV, cmps: Cmp[]): boolean {
  for (const c of cmps) if (!satisfiesCmp(v, c)) return false;
  // Prerelease gate (npm rule): a prerelease version only satisfies a set if some
  // comparator targets the same [major,minor,patch] tuple and itself has a prerelease.
  if (v.pre.length > 0) {
    const ok = cmps.some((c) => c.v.pre.length > 0 && c.v.major === v.major && c.v.minor === v.minor && c.v.patch === v.patch);
    if (!ok) return false;
  }
  return true;
}

function renderRange(sets: Cmp[][]): string {
  return sets.map((set) => set.map((c) => (c.op === '=' ? fmt(c.v) : c.op + fmt(c.v))).join(' ')).join(' || ');
}

// ---- endpoint cores ----
export interface ParseCore {
  input: string; valid: boolean; error_reason: string | null;
  major: number | null; minor: number | null; patch: number | null;
  prerelease: (string | number)[]; build: string[]; prerelease_string: string | null;
  is_prerelease: boolean; is_stable: boolean; normalized: string | null;
}

export function doParse(body: any): { error: string } | { result: ParseCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide { version }.' };
  if (typeof body.version !== 'string') return { error: '"version" must be a string.' };
  const v = parseSV(body.version);
  if (!v) {
    return { result: { input: body.version, valid: false, error_reason: 'Does not match the semver MAJOR.MINOR.PATCH grammar.', major: null, minor: null, patch: null, prerelease: [], build: [], prerelease_string: null, is_prerelease: false, is_stable: false, normalized: null } };
  }
  return {
    result: {
      input: body.version, valid: true, error_reason: null,
      major: v.major, minor: v.minor, patch: v.patch,
      prerelease: v.pre, build: v.build, prerelease_string: v.pre.length ? v.pre.join('.') : null,
      is_prerelease: v.pre.length > 0, is_stable: v.pre.length === 0 && v.major >= 1, normalized: fmt(v),
    },
  };
}

export interface CompareCore { a: string; b: string; comparison: -1 | 0 | 1; relation: 'lt' | 'eq' | 'gt'; note: string; }

export function doCompare(body: any): { error: string } | { result: CompareCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide { a, b }.' };
  if (typeof body.a !== 'string' || typeof body.b !== 'string') return { error: '"a" and "b" must be version strings.' };
  const a = parseSV(body.a), b = parseSV(body.b);
  if (!a) return { error: `"a" is not a valid semver: ${body.a}` };
  if (!b) return { error: `"b" is not a valid semver: ${body.b}` };
  const c = cmp(a, b) as -1 | 0 | 1;
  const relation = c < 0 ? 'lt' : c > 0 ? 'gt' : 'eq';
  const note = c === 0
    ? 'Equal precedence (build metadata, if any, is ignored).'
    : `${fmt(c < 0 ? b : a)} has higher precedence; ${a.pre.length || b.pre.length ? 'prerelease identifiers were compared per semver §11.' : 'compared by major.minor.patch.'}`;
  return { result: { a: fmt(a), b: fmt(b), comparison: c, relation, note } };
}

export interface SatisfiesCore { version: string; range: string; range_normalized: string; satisfies: boolean; }

export function doSatisfies(body: any): { error: string } | { result: SatisfiesCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide { version, range }.' };
  if (typeof body.version !== 'string') return { error: '"version" must be a string.' };
  if (typeof body.range !== 'string') return { error: '"range" must be a string.' };
  const v = parseSV(body.version);
  if (!v) return { error: `"version" is not a valid semver: ${body.version}` };
  const sets = parseRange(body.range);
  if (sets === null) return { error: `"range" is not a parseable npm-style range: ${body.range}` };
  const ok = sets.some((set) => satisfiesSet(v, set));
  return { result: { version: fmt(v), range: body.range, range_normalized: renderRange(sets), satisfies: ok } };
}

const CHAIN_TO = [
  { api: 'radix-converter', reason: 'Convert build numbers between bases if needed.' },
];
const PARSE_INVALIDATORS = [
  'Strict semver 2.0.0 grammar: leading zeros in numeric identifiers and missing components are rejected. A leading "v" is tolerated and stripped.',
  'Build metadata (+...) never affects precedence and is preserved separately.',
];
const SAT_INVALIDATORS = [
  'Range semantics follow npm/node-semver: a prerelease version matches a range only when a comparator targets the same major.minor.patch and itself carries a prerelease.',
  'X-ranges, caret, tilde, hyphen ranges, and || are supported; advanced/rare forms not covered here will be reported as unparseable rather than silently mismatched.',
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Semver Tools API', version: '1.0.0',
    description: 'Deterministic Semantic Versioning toolkit: parse/validate, compare by precedence (semver §11), and test a version against an npm-style range (^, ~, x-ranges, hyphen, ||). No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/semver-tools/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/parse', summary: 'Parse & validate a version', price_usdc: 0.003 },
      { method: 'POST', path: '/compare', summary: 'Compare two versions', price_usdc: 0.003 },
      { method: 'POST', path: '/satisfies', summary: 'Test a version against a range', price_usdc: 0.004 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL parse + optional compare/satisfies + reasoning', price_usdc: 0.008 },
    ],
    pricing: [
      { path: '/parse', price_usdc: 0.003, currency: 'USDC' },
      { path: '/compare', price_usdc: 0.003, currency: 'USDC' },
      { path: '/satisfies', price_usdc: 0.004, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

const COMMON_TAIL = (section: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, confidence_per_section: section,
  recommended_actions_priority_order: actions,
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.post('/parse', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = doParse(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, { ...v, ...COMMON_TAIL({ parse: 1 }, [v.valid ? `Valid semver ${v.normalized} (${v.is_stable ? 'stable' : v.is_prerelease ? 'prerelease' : '0.x unstable'}).` : 'Not valid semver — see error_reason.']) });
});

router.post('/compare', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = doCompare(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, { ...v, ...COMMON_TAIL({ comparison: 1 }, [`${v.a} is ${v.relation === 'eq' ? 'equal to' : v.relation === 'lt' ? 'lower than' : 'higher than'} ${v.b}.`]) });
});

router.post('/satisfies', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = doSatisfies(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, { ...v, ...COMMON_TAIL({ range: 1 }, [`${v.version} ${v.satisfies ? 'satisfies' : 'does NOT satisfy'} "${v.range}" (normalized: ${v.range_normalized}).`]) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const pr = doParse(req.body);
  if ('error' in pr) return fail(res, t0, 400, 'invalid_request', pr.error);
  const parsed = pr.result;

  let satisfies: SatisfiesCore | null = null;
  if (req.body && typeof req.body.range === 'string') {
    const sr = doSatisfies({ version: req.body.version, range: req.body.range });
    if ('error' in sr) return fail(res, t0, 400, 'invalid_request', sr.error);
    satisfies = sr.result;
  }
  let compare: CompareCore | null = null;
  if (req.body && typeof req.body.compare_to === 'string') {
    const cr = doCompare({ a: req.body.version, b: req.body.compare_to });
    if ('error' in cr) return fail(res, t0, 400, 'invalid_request', cr.error);
    compare = cr.result;
  }

  const section: Record<string, number> = { parse: 1 };
  if (satisfies) section.range = 1;
  if (compare) section.comparison = 1;

  respond(res, t0, {
    parse: parsed, satisfies, compare,
    reasoning: {
      why_result_generated: `Parsed "${parsed.input}" (${parsed.valid ? 'valid' : 'invalid'})${satisfies ? `, tested against range "${satisfies.range}"` : ''}${compare ? `, compared to "${compare.b}"` : ''}.`,
      key_factors: [
        parsed.valid ? `Normalized: ${parsed.normalized}; prerelease=${parsed.is_prerelease}.` : 'Input is not valid semver.',
        satisfies ? `satisfies=${satisfies.satisfies} (normalized range ${satisfies.range_normalized}).` : 'No range supplied.',
        compare ? `compare: ${compare.relation} (${compare.comparison}).` : 'No compare_to supplied.',
      ],
      invalidators: [...PARSE_INVALIDATORS, ...SAT_INVALIDATORS],
    },
    ...COMMON_TAIL(section, [parsed.valid ? `Valid semver ${parsed.normalized}.` : 'Fix the version string — not valid semver.']),
  });
});

export default router;
