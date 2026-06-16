import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic glob → regular-expression translator & path matcher. /convert
// translates a shell-style glob (*, **, ?, [..], {a,b}) into an anchored regex
// source; /test translates the glob and reports which of the supplied paths match.
// The generated regex uses only bounded constructs (no nested unbounded
// quantifiers), so it is ReDoS-safe by construction. No LLM, nothing stored.

const router = Router();

const MAX_GLOB_LEN = 1000;
const MAX_PATHS = 1000;
const MAX_PATH_LEN = 4096;

function escapeLiteral(c: string): string {
  return '.+^$()|{}*?\\/'.includes(c) ? '\\' + c : c;
}

interface GlobOptions { globstar: boolean; nocase: boolean }

// Translate glob → regex source (NOT yet anchored). Safe-by-construction:
//   *   → [^/]*        ?   → [^/]
//   **  → .*           **/ → (?:.*/)?     (only when globstar enabled)
//   [..] → char class (leading ! or ^ → negation)   {a,b} → (?:a|b)
function globToRegex(glob: string, opts: GlobOptions): { error: string } | { source: string } {
  let re = '', i = 0, braceDepth = 0;
  const n = glob.length;
  while (i < n) {
    const c = glob[i];
    if (c === '\\') {
      const next = glob[i + 1];
      if (next !== undefined) { re += escapeLiteral(next); i += 2; continue; }
      re += '\\\\'; i++; continue;
    }
    if (c === '*') {
      if (glob[i + 1] === '*') {
        let j = i; while (glob[j] === '*') j++;
        if (opts.globstar) {
          if (glob[j] === '/') { re += '(?:.*/)?'; i = j + 1; continue; }
          re += '.*'; i = j; continue;
        }
        re += '[^/]*'; i = j; continue;
      }
      re += '[^/]*'; i++; continue;
    }
    if (c === '?') { re += '[^/]'; i++; continue; }
    if (c === '[') {
      let j = i + 1, neg = false;
      if (glob[j] === '!' || glob[j] === '^') { neg = true; j++; }
      let body = '';
      if (glob[j] === ']') { body += '\\]'; j++; }
      while (j < n && glob[j] !== ']') {
        if (glob[j] === '\\') { body += '\\' + (glob[j + 1] ?? ''); j += 2; continue; }
        body += glob[j]; j++;
      }
      if (j >= n) { re += '\\['; i++; continue; }   // unterminated → literal '['
      re += '[' + (neg ? '^' : '') + body + ']'; i = j + 1; continue;
    }
    if (c === '{') { braceDepth++; re += '(?:'; i++; continue; }
    if (c === '}') { if (braceDepth > 0) { braceDepth--; re += ')'; i++; continue; } re += '\\}'; i++; continue; }
    if (c === ',') { re += braceDepth > 0 ? '|' : ','; i++; continue; }
    re += escapeLiteral(c); i++;
  }
  if (braceDepth !== 0) return { error: 'unbalanced "{" / "}" in glob.' };
  return { source: re };
}

function parseOptions(o: any): { error: string } | { opts: GlobOptions } {
  if (o === undefined) return { opts: { globstar: true, nocase: false } };
  if (o === null || typeof o !== 'object' || Array.isArray(o)) return { error: '"options" must be an object.' };
  if (o.globstar !== undefined && typeof o.globstar !== 'boolean') return { error: '"options.globstar" must be a boolean.' };
  if (o.nocase !== undefined && typeof o.nocase !== 'boolean') return { error: '"options.nocase" must be a boolean.' };
  return { opts: { globstar: o.globstar ?? true, nocase: o.nocase ?? false } };
}

export interface ConvertCore { glob: string; regex_source: string; regex: string; flags: string; options: GlobOptions }
export interface TestResult { path: string; matched: boolean }
export interface TestCore { glob: string; regex_source: string; regex: string; flags: string; options: GlobOptions; matched_count: number; results: TestResult[] }

function build(glob: unknown, optsRaw: any): { error: string } | { core: ConvertCore; re: RegExp } {
  if (typeof glob !== 'string' || glob === '') return { error: '"glob" must be a non-empty string.' };
  if (glob.length > MAX_GLOB_LEN) return { error: `"glob" exceeds the ${MAX_GLOB_LEN}-character limit.` };
  const po = parseOptions(optsRaw);
  if ('error' in po) return { error: po.error };
  const g = globToRegex(glob, po.opts);
  if ('error' in g) return { error: g.error };
  const flags = po.opts.nocase ? 'i' : '';
  const anchored = `^${g.source}$`;
  let re: RegExp;
  try { re = new RegExp(anchored, flags); } catch (e: any) { return { error: `generated regex did not compile: ${e?.message}` }; }
  return { core: { glob, regex_source: g.source, regex: anchored, flags, options: po.opts }, re };
}

const CHAIN_TO = [{ api: 'regex-tester', reason: 'Run or further analyze the generated regular expression against more inputs.' }];
const INVALIDATORS = [
  'Translation targets ECMAScript regex and matches a WHOLE path (the regex is anchored ^…$). Supported glob syntax: * (any run of non-slash chars), ** (any chars incl. slash, when globstar is on), ? (one non-slash char), [abc]/[a-z]/[!abc] classes, {a,b,c} brace alternation, and \\ escaping.',
  'The generated regex uses only bounded/possessive-free constructs with no nested unbounded quantifiers, so it cannot exhibit catastrophic backtracking — it is ReDoS-safe by construction.',
  'NOT supported: nested braces, POSIX class names ([[:alpha:]]), extglob (+(...)/@(...)), and brace numeric ranges ({1..3}). Path separators are treated literally as "/"; backslash is an escape, not a Windows separator. With globstar off, ** behaves like *.',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

const DISCOVERY = {
  name: 'Glob to Regex API', version: '1.0.0',
  description: 'Deterministic glob → regular-expression translator & path matcher. /convert translates a shell-style glob (*, **, ?, [..], {a,b}) into an anchored ECMAScript regex; /test reports which supplied paths match. The generated regex is ReDoS-safe by construction. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/glob-to-regex/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/convert', summary: 'Translate a glob into an anchored regex', price_usdc: 0.005 },
    { method: 'POST', path: '/test', summary: 'Match paths against a glob', price_usdc: 0.006 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL match + reasoning', price_usdc: 0.01 },
  ],
  pricing: [
    { path: '/convert', price_usdc: 0.005, currency: 'USDC' },
    { path: '/test', price_usdc: 0.006, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.01, currency: 'USDC' },
  ],
  x402_compatible: true,
};

function readPaths(body: any): { error: string } | { paths: string[] } {
  if (!Array.isArray(body.paths)) return { error: '"paths" must be an array of strings.' };
  if (body.paths.length > MAX_PATHS) return { error: `"paths" exceeds the ${MAX_PATHS}-item limit.` };
  for (let i = 0; i < body.paths.length; i++) {
    if (typeof body.paths[i] !== 'string') return { error: `paths[${i}] must be a string.` };
    if (body.paths[i].length > MAX_PATH_LEN) return { error: `paths[${i}] exceeds the ${MAX_PATH_LEN}-character limit.` };
  }
  return { paths: body.paths };
}

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

router.post('/convert', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide an object with a "glob" string.');
  const r = build(b.glob, b.options);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.core, ...TAIL({ conversion: 1 }, [`Translated glob to /${r.core.regex}/${r.core.flags}.`]) });
});

router.post('/test', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide a "glob" and a "paths" array.');
  const r = build(b.glob, b.options);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const p = readPaths(b);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const results: TestResult[] = p.paths.map((path) => ({ path, matched: r.re.test(path) }));
  const core: TestCore = { ...r.core, matched_count: results.filter((x) => x.matched).length, results };
  respond(res, t0, { ...core, ...TAIL({ conversion: 1, matching: 1 }, [`${core.matched_count}/${results.length} path(s) matched glob "${core.glob}".`]) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide a "glob" and a "paths" array.');
  const r = build(b.glob, b.options);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const p = readPaths(b);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const results: TestResult[] = p.paths.map((path) => ({ path, matched: r.re.test(path) }));
  const core: TestCore = { ...r.core, matched_count: results.filter((x) => x.matched).length, results };
  respond(res, t0, {
    ...core,
    reasoning: {
      why_result_generated: `Translated glob "${core.glob}" to the anchored regex /${core.regex}/${core.flags} and tested ${results.length} path(s); ${core.matched_count} matched.`,
      key_factors: [`Regex source: ${core.regex_source}`, `globstar=${core.options.globstar}, nocase=${core.options.nocase}.`, `Matched: ${core.matched_count}/${results.length}.`],
      invalidators: INVALIDATORS,
    },
    ...TAIL({ conversion: 1, matching: 1 }, [`${core.matched_count}/${results.length} path(s) matched.`]),
  });
});

export default router;
