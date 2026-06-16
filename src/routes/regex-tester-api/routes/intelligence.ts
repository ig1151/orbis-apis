import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic regular-expression tester & analyzer (ECMAScript / JS engine).
// /analyze statically inspects a pattern (compiles it, counts capture groups,
// extracts named groups, detects features and catastrophic-backtracking risk) and
// NEVER executes it. /test compiles and runs the pattern against caller-supplied
// inputs, returning matches with capture/named groups — but refuses to execute a
// pattern whose structure looks catastrophic. Pure computation, no LLM, nothing stored.

const router = Router();

const MAX_REGEX_LEN = 1000;     // bound pattern size (ReDoS / parse surface)
const MAX_INPUT_LEN = 100_000;  // bound per-input length
const MAX_INPUTS = 100;         // bound number of test strings
const MAX_MATCHES = 1000;       // bound matches collected per input
const VALID_FLAGS = 'dgimsuy';  // ECMAScript regex flags

// Conservative catastrophic-backtracking ("ReDoS") guard: flags a group that is
// itself quantified by * or + (or {n,}) and whose body contains another unbounded
// quantifier, e.g. (a+)+, (a*)*, (.+)*, ([a-z]+)+. May over-reject some safe
// patterns — that is the intended trade-off for an API that runs caller-supplied
// regex over caller-supplied text. (Escaped parens are not parsed; worst case is a
// false reject, never a missed risk.)
function looksCatastrophic(src: string): boolean {
  for (let i = 0; i < src.length; i++) {
    if (src[i] !== ')') continue;
    const next = src[i + 1];
    const quantified = next === '+' || next === '*' || (next === '{' && /^\{\d*,\d*\}/.test(src.slice(i + 1)));
    if (!quantified) continue;
    let depth = 0, open = -1;
    for (let j = i; j >= 0; j--) {
      if (src[j] === ')') depth++;
      else if (src[j] === '(') { depth--; if (depth === 0) { open = j; break; } }
    }
    if (open === -1) continue;
    const body = src.slice(open + 1, i);
    if (/[+*]|\{\d*,\}/.test(body)) return true;
  }
  return false;
}

// Single tokenizing pass: counts capturing groups and extracts named-group names
// exactly, tracking escapes and character classes (so '(' inside [...] or after '\'
// is not miscounted). Also reports whether an unescaped top-level '|' is present.
function structure(src: string): { capture_groups: number; named_groups: string[]; has_alternation: boolean } {
  let capture = 0;
  const named: string[] = [];
  let inClass = false, escaped = false, hasAlt = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (escaped) { escaped = false; continue; }
    if (c === '\\') { escaped = true; continue; }
    if (inClass) { if (c === ']') inClass = false; continue; }
    if (c === '[') { inClass = true; continue; }
    if (c === '|') { hasAlt = true; continue; }
    if (c === '(') {
      if (src[i + 1] === '?') {
        // (?: non-capturing, (?= / (?! lookahead, (?<= / (?<! lookbehind, (?<name> named capture
        const m = /^\(\?<([A-Za-z_$][A-Za-z0-9_$]*)>/.exec(src.slice(i));
        if (m) { capture++; named.push(m[1]); }
        // else non-capturing / assertion → not a capture group
      } else {
        capture++;
      }
    }
  }
  return { capture_groups: capture, named_groups: named, has_alternation: hasAlt };
}

function validateFlags(flags: unknown): { error: string } | { flags: string } {
  if (flags === undefined || flags === null) return { flags: '' };
  if (typeof flags !== 'string') return { error: '"flags" must be a string of ECMAScript regex flags.' };
  const seen = new Set<string>();
  for (const ch of flags) {
    if (!VALID_FLAGS.includes(ch)) return { error: `"${ch}" is not a valid regex flag (allowed: ${VALID_FLAGS.split('').join(', ')}).` };
    if (seen.has(ch)) return { error: `duplicate regex flag "${ch}".` };
    seen.add(ch);
  }
  return { flags };
}

function compile(pattern: unknown, flags: string): { error: string } | { re: RegExp } {
  if (typeof pattern !== 'string' || pattern === '') return { error: '"pattern" must be a non-empty string.' };
  if (pattern.length > MAX_REGEX_LEN) return { error: `"pattern" exceeds the ${MAX_REGEX_LEN}-character limit.` };
  try {
    return { re: new RegExp(pattern, flags) };
  } catch (e: any) {
    return { error: `pattern does not compile: ${e?.message || String(e)}` };
  }
}

// ---------- /analyze (static — never executes the pattern) ----------
export interface AnalyzeCore {
  pattern: string;
  flags: string;
  valid: boolean;
  compile_error: string | null;
  capture_groups: number;
  named_groups: string[];
  anchored_start: boolean;
  anchored_end: boolean;
  features: {
    has_alternation: boolean;
    has_lookahead: boolean;
    has_lookbehind: boolean;
    has_backreference: boolean;
    has_quantifier: boolean;
    has_character_class: boolean;
  };
  catastrophic_risk: boolean;
  risk_reason: string;
}

function doAnalyze(body: any): { error: string } | { result: AnalyzeCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with a "pattern" string.' };
  const fv = validateFlags(body.flags);
  if ('error' in fv) return { error: fv.error };
  const pattern = body.pattern;
  if (typeof pattern !== 'string' || pattern === '') return { error: '"pattern" must be a non-empty string.' };
  if (pattern.length > MAX_REGEX_LEN) return { error: `"pattern" exceeds the ${MAX_REGEX_LEN}-character limit.` };

  const c = compile(pattern, fv.flags);
  const valid = !('error' in c);
  const st = structure(pattern);
  const cat = looksCatastrophic(pattern);

  const result: AnalyzeCore = {
    pattern,
    flags: fv.flags,
    valid,
    compile_error: valid ? null : (c as { error: string }).error,
    capture_groups: st.capture_groups,
    named_groups: st.named_groups,
    anchored_start: pattern.startsWith('^'),
    anchored_end: /(^|[^\\])\$$/.test(pattern) || pattern === '$',
    features: {
      has_alternation: st.has_alternation,
      has_lookahead: /\(\?[=!]/.test(pattern),
      has_lookbehind: /\(\?<[=!]/.test(pattern),
      has_backreference: /\\[1-9]/.test(pattern) || /\\k<[A-Za-z_$]/.test(pattern),
      has_quantifier: /(^|[^\\])[*+?]/.test(pattern) || /\{\d/.test(pattern),
      has_character_class: /(^|[^\\])\[/.test(pattern),
    },
    catastrophic_risk: cat,
    risk_reason: cat
      ? 'A quantified group contains another unbounded quantifier (e.g. (a+)+) — a classic catastrophic-backtracking shape. /test will refuse to execute this pattern.'
      : 'No nested-unbounded-quantifier structure detected by the static guard.',
  };
  return { result };
}

// ---------- /test (executes against inputs; refuses catastrophic patterns) ----------
export interface RegexMatch {
  match: string;
  index: number;
  length: number;
  groups: (string | null)[];
  named_groups: { [name: string]: string | null };
}
export interface InputResult {
  input_index: number;
  matched: boolean;
  match_count: number;
  truncated: boolean;
  matches: RegexMatch[];
}
export interface TestCore {
  pattern: string;
  flags: string;
  global: boolean;
  input_count: number;
  total_matches: number;
  any_matched: boolean;
  results: InputResult[];
}

function toMatch(m: RegExpMatchArray): RegexMatch {
  const named: { [k: string]: string | null } = {};
  if (m.groups) for (const k of Object.keys(m.groups)) named[k] = m.groups[k] ?? null;
  return {
    match: m[0],
    index: m.index ?? 0,
    length: m[0].length,
    groups: m.slice(1).map((g) => (g === undefined ? null : g)),
    named_groups: named,
  };
}

function doTest(body: any): { error: string; code?: string } | { result: TestCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with a "pattern" and an "inputs" array of strings.' };
  const fv = validateFlags(body.flags);
  if ('error' in fv) return { error: fv.error };

  if (typeof body.pattern === 'string' && looksCatastrophic(body.pattern)) {
    return { error: 'Pattern shows catastrophic-backtracking structure (nested unbounded quantifier); refusing to execute it against arbitrary input. Use /analyze for static inspection.', code: 'redos_risk' };
  }
  const c = compile(body.pattern, fv.flags);
  if ('error' in c) return { error: c.error };

  if (!Array.isArray(body.inputs)) return { error: '"inputs" must be an array of strings.' };
  if (body.inputs.length > MAX_INPUTS) return { error: `"inputs" exceeds the ${MAX_INPUTS}-item limit.` };
  for (let i = 0; i < body.inputs.length; i++) {
    if (typeof body.inputs[i] !== 'string') return { error: `inputs[${i}] must be a string.` };
    if (body.inputs[i].length > MAX_INPUT_LEN) return { error: `inputs[${i}] exceeds the ${MAX_INPUT_LEN}-character limit.` };
  }

  const re = c.re;
  const global = re.global;
  const results: InputResult[] = [];
  let total = 0;
  for (let i = 0; i < body.inputs.length; i++) {
    const text: string = body.inputs[i];
    const matches: RegexMatch[] = [];
    let truncated = false;
    if (global) {
      for (const m of text.matchAll(re)) {
        if (matches.length >= MAX_MATCHES) { truncated = true; break; }
        matches.push(toMatch(m));
      }
    } else {
      const m = re.exec(text);
      if (m) matches.push(toMatch(m));
    }
    total += matches.length;
    results.push({ input_index: i, matched: matches.length > 0, match_count: matches.length, truncated, matches });
  }

  return {
    result: {
      pattern: body.pattern,
      flags: fv.flags,
      global,
      input_count: body.inputs.length,
      total_matches: total,
      any_matched: results.some((r) => r.matched),
      results,
    },
  };
}

const CHAIN_TO = [
  { api: 'data-quality-rules', reason: 'Apply this validated pattern as a "regex" rule across an entire dataset.' },
  { api: 'scraper-test-suite', reason: 'Use this pattern in a "matches" selector assertion against scraped HTML.' },
];
const INVALIDATORS = [
  'Results follow ECMAScript (JavaScript) regex semantics — backreferences, lookbehind, and unicode behavior may differ from PCRE, RE2, Python re, or Go regexp. A pattern that matches here may behave differently in another engine.',
  'Match count depends on the "g" (global) flag: without it /test returns at most one match per input; with it all non-overlapping matches are returned (capped at 1000 per input — "truncated" flags when the cap is hit).',
  'Catastrophic-backtracking detection is a conservative structural heuristic: it may flag some safe patterns and (rarely) miss exotic ones. A flagged pattern is refused by /test by design; use /analyze to inspect it without execution.',
  'Feature flags (lookahead/lookbehind/backreference/quantifier/character-class) are detected structurally and are indicative, not a full parse; capture-group counts and named-group names ARE exact.',
];

const TAIL = (sectionConf: Record<string, number>, conf: number, actions: string[]) => ({
  confidence_score: conf, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

const DISCOVERY = {
  name: 'Regex Tester API', version: '1.0.0',
  description: 'Deterministic regular-expression tester & analyzer (ECMAScript engine). /analyze statically inspects a pattern (compile validity, capture/named groups, features, catastrophic-backtracking risk) without executing it; /test runs the pattern against caller inputs and returns matches with groups, refusing patterns that look catastrophic. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/regex-tester/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/analyze', summary: 'Statically analyze a regex (no execution)', price_usdc: 0.006 },
    { method: 'POST', path: '/test', summary: 'Run a regex against inputs and return matches', price_usdc: 0.008 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL test + reasoning', price_usdc: 0.013 },
  ],
  pricing: [
    { path: '/analyze', price_usdc: 0.006, currency: 'USDC' },
    { path: '/test', price_usdc: 0.008, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.013, currency: 'USDC' },
  ],
  x402_compatible: true,
};

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

router.post('/analyze', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = doAnalyze(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  const actions = !v.valid
    ? [`Pattern does not compile: ${v.compile_error}`]
    : v.catastrophic_risk
      ? ['Catastrophic-backtracking risk detected — rewrite the nested quantifier before using this pattern in production.']
      : [`Pattern is valid with ${v.capture_groups} capture group(s)${v.named_groups.length ? ` (named: ${v.named_groups.join(', ')})` : ''}.`];
  respond(res, t0, { ...v, ...TAIL({ validity: 1, structure: 1, safety: 0.7 }, v.valid ? 0.9 : 1, actions) });
});

router.post('/test', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = doTest(req.body);
  if ('error' in r) return fail(res, t0, 400, r.code || 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, { ...v, ...TAIL({ matching: 1 }, 1, [`Matched ${v.results.filter((x) => x.matched).length}/${v.input_count} input(s); ${v.total_matches} total match(es).`]) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = doTest(req.body);
  if ('error' in r) return fail(res, t0, 400, r.code || 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Ran the ${v.global ? 'global ' : ''}pattern against ${v.input_count} input(s) using the ECMAScript engine; ${v.total_matches} total match(es) across ${v.results.filter((x) => x.matched).length} matching input(s).`,
      key_factors: [
        `Pattern: ${v.pattern}`,
        `Flags: ${v.flags || '(none)'}; global=${v.global}.`,
        `Total matches: ${v.total_matches}.`,
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL({ matching: 1 }, 1, [`Matched ${v.results.filter((x) => x.matched).length}/${v.input_count} input(s); ${v.total_matches} total match(es).`]),
  });
});

export default router;
