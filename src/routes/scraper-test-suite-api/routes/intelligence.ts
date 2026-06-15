import { Router, Request, Response } from 'express';
import * as cheerio from 'cheerio';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY, round } from '../../_aplus/util';
import { gradeOf } from '../../_aplus/dataset';

// Deterministic web-scraper test suite & validator. Given a sample HTML document
// and a list of selector tests with assertions (exists / count / equals / contains
// / matches / non_empty, optionally on an attribute), parses the HTML with a real
// HTML parser (cheerio) and reports per-test pass/fail, extracted values, an
// overall score and grade. Use it to assert a scraper's selectors still extract
// what they should against a captured page. No fetching, no LLM, nothing stored.

const router = Router();

const MAX_HTML = 1_000_000;        // chars; bounds the parse surface (≈ request body cap)
const MAX_TESTS = 200;
const MAX_SAMPLE_VALUES = 50;
const MAX_REGEX_LEN = 300;

// Conservative catastrophic-backtracking ("ReDoS") guard — flags a group that is
// itself quantified by */+ and whose body contains another unbounded quantifier,
// e.g. (a+)+, (.+)*. May over-reject; that trade-off is intended for caller-supplied
// regex. (Mirrors data-quality-rules-api.)
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

type AssertionType = 'exists' | 'count' | 'min_count' | 'max_count' | 'equals' | 'contains' | 'matches' | 'non_empty';
const ASSERT_KEYS = ['exists', 'count', 'min_count', 'max_count', 'equals', 'contains', 'matches', 'non_empty', 'attr'];

export interface AssertionResult { type: AssertionType; expected: unknown; actual: unknown; pass: boolean; }
export interface TestResult {
  name: string; selector: string; extraction_mode: string;
  matched_count: number; extracted_value: string | null; sample_values: (string | null)[];
  assertions: AssertionResult[]; error: string | null; passed: boolean;
}
export interface SuiteCore {
  test_count: number; passed_count: number; failed_count: number; all_passed: boolean;
  score: number; grade: string; results: TestResult[];
}

interface TestSpec { name: string; selector: string; assert: Record<string, unknown>; }

function parse(body: any): { error: string } | { html: string; tests: TestSpec[] } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with "html" and "tests".' };
  if (typeof body.html !== 'string') return { error: '"html" must be a string.' };
  if (body.html.length > MAX_HTML) return { error: `"html" exceeds the ${MAX_HTML}-character limit (got ${body.html.length}).` };
  if (!Array.isArray(body.tests) || body.tests.length === 0) return { error: '"tests" must be a non-empty array of selector tests.' };
  if (body.tests.length > MAX_TESTS) return { error: `"tests" exceeds the ${MAX_TESTS}-test limit.` };

  const tests: TestSpec[] = [];
  const names = new Set<string>();
  for (let i = 0; i < body.tests.length; i++) {
    const t = body.tests[i];
    if (t === null || typeof t !== 'object' || Array.isArray(t)) return { error: `tests[${i}] must be an object.` };
    if (typeof t.name !== 'string' || t.name === '') return { error: `tests[${i}].name must be a non-empty string.` };
    if (names.has(t.name)) return { error: `tests[${i}].name "${t.name}" is duplicated; test names must be unique.` };
    names.add(t.name);
    if (typeof t.selector !== 'string' || t.selector === '') return { error: `tests[${i}].selector must be a non-empty string.` };
    let assert: Record<string, unknown> = {};
    if (t.assert !== undefined) {
      if (t.assert === null || typeof t.assert !== 'object' || Array.isArray(t.assert)) return { error: `tests[${i}].assert must be an object.` };
      assert = t.assert as Record<string, unknown>;
      for (const k of Object.keys(assert)) if (!ASSERT_KEYS.includes(k)) return { error: `tests[${i}].assert has unknown key "${k}". Allowed: ${ASSERT_KEYS.join(', ')}.` };
      const intKeys = ['count', 'min_count', 'max_count'];
      for (const k of intKeys) if (assert[k] !== undefined && (typeof assert[k] !== 'number' || !Number.isInteger(assert[k]) || (assert[k] as number) < 0)) return { error: `tests[${i}].assert.${k} must be a non-negative integer.` };
      for (const k of ['exists', 'non_empty']) if (assert[k] !== undefined && typeof assert[k] !== 'boolean') return { error: `tests[${i}].assert.${k} must be a boolean.` };
      for (const k of ['equals', 'contains', 'matches', 'attr']) if (assert[k] !== undefined && typeof assert[k] !== 'string') return { error: `tests[${i}].assert.${k} must be a string.` };
      if (typeof assert.matches === 'string') {
        if (assert.matches.length > MAX_REGEX_LEN) return { error: `tests[${i}].assert.matches exceeds the ${MAX_REGEX_LEN}-character regex limit.` };
        if (looksCatastrophic(assert.matches)) return { error: `tests[${i}].assert.matches rejected: nested unbounded quantifiers risk catastrophic backtracking — simplify it.` };
        try { new RegExp(assert.matches); } catch { return { error: `tests[${i}].assert.matches is not a valid regular expression.` }; }
      }
    }
    tests.push({ name: t.name, selector: t.selector, assert });
  }
  return { html: body.html, tests };
}

function runTest($: cheerio.CheerioAPI, t: TestSpec): TestResult {
  const attr = typeof t.assert.attr === 'string' ? t.assert.attr : null;
  const extraction_mode = attr ? `attr:${attr}` : 'text';
  let sel: cheerio.Cheerio<any>;
  try { sel = $(t.selector); } catch (e: any) {
    return { name: t.name, selector: t.selector, extraction_mode, matched_count: 0, extracted_value: null, sample_values: [], assertions: [], error: `invalid_selector: ${e?.message ?? 'unparseable CSS selector'}`, passed: false };
  }
  const matched_count = sel.length;
  const valueOf = (el: any): string | null => {
    if (attr) { const a = $(el).attr(attr); return a === undefined ? null : a; }
    return $(el).text().trim();
  };
  const extracted_value = matched_count > 0 ? valueOf(sel.get(0)) : null;
  const sample_values: (string | null)[] = sel.toArray().slice(0, MAX_SAMPLE_VALUES).map((el) => valueOf(el));

  const assertions: AssertionResult[] = [];
  const a = t.assert;
  const push = (type: AssertionType, expected: unknown, actual: unknown, pass: boolean) => assertions.push({ type, expected, actual, pass });
  if (typeof a.exists === 'boolean') push('exists', a.exists, matched_count > 0, (matched_count > 0) === a.exists);
  if (typeof a.count === 'number') push('count', a.count, matched_count, matched_count === a.count);
  if (typeof a.min_count === 'number') push('min_count', a.min_count, matched_count, matched_count >= a.min_count);
  if (typeof a.max_count === 'number') push('max_count', a.max_count, matched_count, matched_count <= a.max_count);
  if (typeof a.equals === 'string') push('equals', a.equals, extracted_value, extracted_value === a.equals);
  if (typeof a.contains === 'string') push('contains', a.contains, extracted_value, typeof extracted_value === 'string' && extracted_value.includes(a.contains));
  if (typeof a.matches === 'string') { const re = new RegExp(a.matches); push('matches', a.matches, extracted_value, typeof extracted_value === 'string' && re.test(extracted_value)); }
  if (typeof a.non_empty === 'boolean') { const ne = extracted_value !== null && extracted_value.trim() !== ''; push('non_empty', a.non_empty, ne, ne === a.non_empty); }
  // No explicit assertions → implicit "element exists".
  if (assertions.length === 0) push('exists', true, matched_count > 0, matched_count > 0);

  const passed = assertions.every((x) => x.pass);
  return { name: t.name, selector: t.selector, extraction_mode, matched_count, extracted_value, sample_values, assertions, error: null, passed };
}

function build(html: string, tests: TestSpec[]): SuiteCore {
  const $ = cheerio.load(html);
  const results = tests.map((t) => runTest($, t));
  const passed_count = results.filter((r) => r.passed).length;
  const failed_count = results.length - passed_count;
  const score = round((passed_count / results.length) * 100, 1);
  return {
    test_count: results.length, passed_count, failed_count, all_passed: failed_count === 0,
    score, grade: gradeOf(score), results,
  };
}

const CHAIN_TO = [
  { api: 'scrape-data-pipeline-validator', reason: 'Validate the records these selectors extract against an expected schema across many pages.' },
  { api: 'website-structure-mapper', reason: 'Map the site’s navigation graph to discover the pages these selectors should run against.' },
];
const INVALIDATORS = [
  'Tests run only against the supplied HTML snapshot — they prove a selector works on this capture, not on the live (possibly changed) page.',
  'HTML is parsed leniently by cheerio (like a browser): malformed markup is auto-corrected, so a selector may match more/less than a strict parser would.',
  'Text extraction uses the concatenated text of all descendants, trimmed; attribute extraction reads the first matched element’s attribute (null if absent).',
  'Regex assertions are safety-bounded: patterns over 300 chars or with nested unbounded quantifiers (e.g. (a+)+) are rejected before evaluation.',
];

function actions(r: SuiteCore): string[] {
  const out = [`${r.passed_count}/${r.test_count} test(s) passed — score ${r.score}/100 (${r.grade}), ${r.all_passed ? 'ALL PASSED' : 'FAILURES PRESENT'}.`];
  const failing = r.results.filter((x) => !x.passed);
  const invalidSel = failing.filter((x) => x.error).map((x) => x.name);
  if (invalidSel.length) out.push(`Invalid selector(s): ${invalidSel.join(', ')} — fix the CSS syntax.`);
  const zeroMatch = failing.filter((x) => !x.error && x.matched_count === 0).map((x) => x.name);
  if (zeroMatch.length) out.push(`Selector(s) matched nothing (likely changed markup): ${zeroMatch.join(', ')}.`);
  const assertFail = failing.filter((x) => !x.error && x.matched_count > 0).map((x) => x.name);
  if (assertFail.length) out.push(`Assertion failure(s) on matched elements: ${assertFail.join(', ')} — compare expected vs actual.`);
  return out;
}

const TAIL = (r: SuiteCore) => ({
  confidence_score: 1, confidence_per_section: { extraction: 1, assertions: 1 },
  recommended_actions_priority_order: actions(r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Web Scraper Test Suite & Validator API', version: '1.0.0',
    description: 'Deterministic scraper test suite. Parses a supplied HTML snapshot with a real HTML parser (cheerio) and runs selector assertions (exists/count/equals/contains/matches/non_empty, optionally on an attribute), returning per-test pass/fail, extracted values, score and grade. No fetching, no LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/scraper-test-suite/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/run', summary: 'Run selector assertions against sample HTML', price_usdc: 0.008 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL run + reasoning', price_usdc: 0.014 },
    ],
    pricing: [
      { path: '/run', price_usdc: 0.008, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.014, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/run', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parse(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const r = build(p.html, p.tests);
  respond(res, t0, { ...r, ...TAIL(r) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parse(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const r = build(p.html, p.tests);
  respond(res, t0, {
    ...r,
    reasoning: {
      why_result_generated: `Ran ${r.test_count} selector test(s) against the supplied HTML: ${r.passed_count} passed, ${r.failed_count} failed (score ${r.score}/100).`,
      key_factors: [
        `Result: ${r.all_passed ? 'ALL PASSED' : 'FAILURES PRESENT'} (grade ${r.grade}).`,
        `Failing test(s): ${r.results.filter((x) => !x.passed).map((x) => x.name).join(', ') || 'none'}.`,
        `Selector error(s): ${r.results.filter((x) => x.error).map((x) => x.name).join(', ') || 'none'}.`,
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL(r),
  });
});

export default router;
