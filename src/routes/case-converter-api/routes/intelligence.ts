import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { PRIVACY } from '../../_aplus/util';
import { EXECUTION_METADATA_PLUS } from '../../_aplus/specparts-plus';

// Deterministic identifier case converter. /convert tokenizes a string and renders
// it in a target case (camel, pascal, snake, kebab, constant, dot, path, title,
// sentence, lower, upper); /detect reports the most likely source case and the
// token split. Conversion is exact; case detection is a documented heuristic.
// No LLM, nothing stored.

const router = Router();

const CASES = ['camel', 'pascal', 'snake', 'kebab', 'constant', 'dot', 'path', 'title', 'sentence', 'lower', 'upper'] as const;
type Case = typeof CASES[number];
const MAX_LEN = 10_000;

// Split into lowercased word tokens: break on separators (_ - . / space and other
// non-alphanumerics) and on camelCase/acronym/letter→digit boundaries.
function tokenize(input: string): string[] {
  const withBoundaries = input
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')      // fooBar → foo Bar
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')   // HTTPServer → HTTP Server
    .replace(/([a-zA-Z])([0-9])/g, '$1 $2')      // v2 → v 2
    .replace(/([0-9])([a-zA-Z])/g, '$1 $2');     // 2x → 2 x
  return withBoundaries.split(/[^a-zA-Z0-9]+/).filter((t) => t.length > 0).map((t) => t.toLowerCase());
}

const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

function render(tokens: string[], to: Case): string {
  switch (to) {
    case 'camel': return tokens.map((w, i) => (i === 0 ? w : cap(w))).join('');
    case 'pascal': return tokens.map(cap).join('');
    case 'snake': return tokens.join('_');
    case 'kebab': return tokens.join('-');
    case 'constant': return tokens.join('_').toUpperCase();
    case 'dot': return tokens.join('.');
    case 'path': return tokens.join('/');
    case 'title': return tokens.map(cap).join(' ');
    case 'sentence': return tokens.length ? cap(tokens[0]) + (tokens.length > 1 ? ' ' + tokens.slice(1).join(' ') : '') : '';
    case 'lower': return tokens.join(' ');
    case 'upper': return tokens.join(' ').toUpperCase();
  }
}

// Heuristic source-case detection from the raw string's structure.
function detectCase(s: string): string {
  if (s.trim() === '') return 'empty';
  const hasUpper = /[A-Z]/.test(s), hasLower = /[a-z]/.test(s);
  if (s.includes('_')) return hasLower ? 'snake' : 'constant';
  if (s.includes('-')) return 'kebab';
  if (s.includes('/')) return 'path';
  if (s.includes('.')) return 'dot';
  if (/\s/.test(s)) {
    const words = s.trim().split(/\s+/);
    if (words.every((w) => /^[A-Z]/.test(w))) return 'title';
    if (!hasUpper) return 'lower';
    if (!hasLower) return 'upper';
    return 'sentence';
  }
  if (hasUpper && hasLower) return /^[A-Z]/.test(s) ? 'pascal' : 'camel';
  if (hasUpper && !hasLower) return 'upper';
  return 'lower';
}

function allForms(tokens: string[]): Record<Case, string> {
  const out: Partial<Record<Case, string>> = {};
  for (const c of CASES) out[c] = render(tokens, c);
  return out as Record<Case, string>;
}

export interface ConvertCore { input: string; to: Case; converted: string; tokens: string[]; detected_case: string }
export interface DetectCore { input: string; detected_case: string; tokens: string[]; all_cases: Record<Case, string> }

function validateText(body: any): { error: string } | { text: string } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with a "text" string.' };
  if (typeof body.text !== 'string') return { error: '"text" must be a string.' };
  if (body.text.length > MAX_LEN) return { error: `"text" exceeds the ${MAX_LEN}-character limit.` };
  return { text: body.text };
}

// Recursively re-case every OBJECT KEY in a JSON value to the target case (array
// elements and scalar values are untouched). Reports how many keys changed and any
// collisions (two source keys mapping to the same cased key — last write wins).
type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
const isObj = (v: Json): v is { [k: string]: Json } => v !== null && typeof v === 'object' && !Array.isArray(v);

function recaseKeys(v: Json, to: Case, stats: { renamed: number; collisions: string[] }): Json {
  if (Array.isArray(v)) return v.map((x) => recaseKeys(x, to, stats));
  if (isObj(v)) {
    const out: { [k: string]: Json } = {};
    for (const k of Object.keys(v)) {
      const nk = render(tokenize(k), to);
      if (nk !== k) stats.renamed++;
      if (Object.prototype.hasOwnProperty.call(out, nk)) stats.collisions.push(nk);
      out[nk] = recaseKeys(v[k], to, stats);
    }
    return out;
  }
  return v;
}

const CHAIN_TO = [
  { api: 'data-mapper', reason: 'Remap records onto the freshly re-cased field names.' },
  { api: 'json-schema-validator', reason: 'Validate the re-cased object against a target JSON Schema.' },
  { api: 'jsonpath', reason: 'Query the normalized object by the new key names.' },
];
const INVALIDATORS = [
  'Tokenization breaks on separators (_ - . / whitespace and other non-alphanumerics) and on camelCase, acronym (HTTPServer→HTTP Server), and letter↔digit boundaries; the conversion of those tokens into the target case is exact and reversible up to separator/casing loss.',
  'Source-case "detection" is a structural heuristic (which separators/capitalization are present); ambiguous inputs (e.g. a single all-lowercase word, or a string with no separators) may report a plausible-but-debatable case. The token split and the converted output are NOT heuristic.',
  'Original separators are not preserved: converting "a.b-c" to snake yields "a_b_c". Round-tripping is exact only within a single separator convention.',
  '/normalize-keys re-cases OBJECT KEYS only (recursively); array order and all scalar/values are preserved. When two distinct keys collapse to the same cased key the last one wins and the key is reported in "collisions".',
];

const TAIL = (sectionConf: Record<string, number>, conf: number, actions: string[]) => ({
  confidence_score: conf, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA_PLUS,
});

const CAPABILITIES = ['case_conversion', 'case_detection', 'string_tokenization', 'schema_key_normalization'];

const DISCOVERY = {
  name: 'Case Converter API', version: '1.0.0',
  description: 'Deterministic identifier case converter. /convert tokenizes a string and renders it in a target case (camel, pascal, snake, kebab, constant, dot, path, title, sentence, lower, upper); /detect reports the most likely source case; /normalize-keys recursively re-cases every key of a JSON object. Conversion is exact; detection is heuristic. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/case-converter/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: CAPABILITIES,
  endpoints: [
    { method: 'POST', path: '/convert', summary: 'Convert a string to a target case', price_usdc: 0.004 },
    { method: 'POST', path: '/detect', summary: 'Detect source case + emit all cases', price_usdc: 0.004 },
    { method: 'POST', path: '/normalize-keys', summary: 'Recursively re-case all keys of a JSON object', price_usdc: 0.008 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL all-cases + reasoning', price_usdc: 0.007 },
  ],
  pricing: [
    { path: '/convert', price_usdc: 0.004, currency: 'USDC' },
    { path: '/detect', price_usdc: 0.004, currency: 'USDC' },
    { path: '/normalize-keys', price_usdc: 0.008, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.007, currency: 'USDC' },
  ],
  x402_compatible: true,
};

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

router.post('/convert', (req: Request, res: Response) => {
  const t0 = Date.now();
  const v = validateText(req.body);
  if ('error' in v) return fail(res, t0, 400, 'invalid_request', v.error);
  const to = req.body.to;
  if (!CASES.includes(to)) return fail(res, t0, 400, 'invalid_request', `"to" must be one of: ${CASES.join(', ')}.`);
  const tokens = tokenize(v.text);
  const result: ConvertCore = { input: v.text, to, converted: render(tokens, to), tokens, detected_case: detectCase(v.text) };
  respond(res, t0, { ...result, ...TAIL({ tokenization: 1, conversion: 1, detection: 0.9 }, 1, [`Apply "${result.converted}" as the ${to}-cased identifier.`, 'Use /normalize-keys to re-case an entire object the same way.']) });
});

router.post('/detect', (req: Request, res: Response) => {
  const t0 = Date.now();
  const v = validateText(req.body);
  if ('error' in v) return fail(res, t0, 400, 'invalid_request', v.error);
  const tokens = tokenize(v.text);
  const result: DetectCore = { input: v.text, detected_case: detectCase(v.text), tokens, all_cases: allForms(tokens) };
  respond(res, t0, { ...result, ...TAIL({ tokenization: 1, conversion: 1, detection: 0.9 }, 0.9, [`Pick the target case from all_cases (detected source: ${result.detected_case}).`]) });
});

router.post('/normalize-keys', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b) || !('value' in b)) return fail(res, t0, 400, 'invalid_request', 'Provide an object with a "value" (any JSON) and a "to" target case.');
  if (!CASES.includes(b.to)) return fail(res, t0, 400, 'invalid_request', `"to" must be one of: ${CASES.join(', ')}.`);
  const stats = { renamed: 0, collisions: [] as string[] };
  const normalized = recaseKeys(b.value as Json, b.to, stats);
  respond(res, t0, {
    to: b.to, normalized, keys_renamed: stats.renamed, collisions: [...new Set(stats.collisions)],
    ...TAIL({ tokenization: 1, conversion: 1 }, 1, [
      `Re-cased ${stats.renamed} key(s) to ${b.to}.`,
      ...(stats.collisions.length ? [`Resolve ${new Set(stats.collisions).size} key collision(s) (last value won).`] : ['Pass the normalized object to data-mapper or a schema validator.']),
    ]),
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const v = validateText(req.body);
  if ('error' in v) return fail(res, t0, 400, 'invalid_request', v.error);
  const tokens = tokenize(v.text);
  const result: DetectCore = { input: v.text, detected_case: detectCase(v.text), tokens, all_cases: allForms(tokens) };
  respond(res, t0, {
    ...result,
    reasoning: {
      why_result_generated: `Tokenized "${v.text}" into [${tokens.join(', ')}] and rendered every supported case; detected source case heuristically as "${result.detected_case}".`,
      key_factors: [`Token count: ${tokens.length}.`, `Detected case: ${result.detected_case}.`],
      invalidators: INVALIDATORS,
    },
    ...TAIL({ tokenization: 1, conversion: 1, detection: 0.9 }, 1, [`Pick the target case from all_cases.`, 'Use /normalize-keys to apply it across an entire object.']),
  });
});

export default router;
