import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

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

const CHAIN_TO = [{ api: 'semver-tools', reason: 'Normalize and compare version identifiers after casing field names.' }];
const INVALIDATORS = [
  'Tokenization breaks on separators (_ - . / whitespace and other non-alphanumerics) and on camelCase, acronym (HTTPServer→HTTP Server), and letter↔digit boundaries; the conversion of those tokens into the target case is exact and reversible up to separator/casing loss.',
  'Source-case "detection" is a structural heuristic (which separators/capitalization are present); ambiguous inputs (e.g. a single all-lowercase word, or a string with no separators) may report a plausible-but-debatable case. The token split and the converted output are NOT heuristic.',
  'Original separators are not preserved: converting "a.b-c" to snake yields "a_b_c". Round-tripping is exact only within a single separator convention.',
];

const TAIL = (sectionConf: Record<string, number>, conf: number, actions: string[]) => ({
  confidence_score: conf, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

const DISCOVERY = {
  name: 'Case Converter API', version: '1.0.0',
  description: 'Deterministic identifier case converter. /convert tokenizes a string and renders it in a target case (camel, pascal, snake, kebab, constant, dot, path, title, sentence, lower, upper); /detect reports the most likely source case and the token split. Conversion is exact; detection is heuristic. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/case-converter/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/convert', summary: 'Convert a string to a target case', price_usdc: 0.005 },
    { method: 'POST', path: '/detect', summary: 'Detect source case + emit all cases', price_usdc: 0.005 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL all-cases + reasoning', price_usdc: 0.01 },
  ],
  pricing: [
    { path: '/convert', price_usdc: 0.005, currency: 'USDC' },
    { path: '/detect', price_usdc: 0.005, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.01, currency: 'USDC' },
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
  respond(res, t0, { ...result, ...TAIL({ conversion: 1, detection: 0.9 }, 1, [`Converted to ${to}: "${result.converted}".`]) });
});

router.post('/detect', (req: Request, res: Response) => {
  const t0 = Date.now();
  const v = validateText(req.body);
  if ('error' in v) return fail(res, t0, 400, 'invalid_request', v.error);
  const tokens = tokenize(v.text);
  const result: DetectCore = { input: v.text, detected_case: detectCase(v.text), tokens, all_cases: allForms(tokens) };
  respond(res, t0, { ...result, ...TAIL({ detection: 0.9, conversion: 1 }, 0.9, [`Detected source case: ${result.detected_case}.`]) });
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
    ...TAIL({ detection: 0.9, conversion: 1 }, 1, [`Tokenized into ${tokens.length} token(s); emitted all ${CASES.length} cases.`]),
  });
});

export default router;
