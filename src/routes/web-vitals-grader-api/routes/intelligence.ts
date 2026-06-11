import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { num, round, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic Core Web Vitals grader. Caller supplies measured metric values
// (LCP/INP/CLS, optional FCP/TTFB); we apply Google's published thresholds and
// return per-metric ratings, a pass/fail on Core Web Vitals, a 0–100 score, and
// a letter grade. No fetch, no LLM — thresholds are public constants.

const router = Router();

export type Rating = 'good' | 'needs-improvement' | 'poor';
interface MetricDef { key: string; label: string; unit: 'ms' | 'score'; good: number; ni: number; core: boolean; lowerIsBetter: true; }

// Thresholds: value ≤ good → good; ≤ ni → needs-improvement; else poor.
export const METRICS: MetricDef[] = [
  { key: 'lcp_ms', label: 'LCP', unit: 'ms', good: 2500, ni: 4000, core: true, lowerIsBetter: true },
  { key: 'inp_ms', label: 'INP', unit: 'ms', good: 200, ni: 500, core: true, lowerIsBetter: true },
  { key: 'cls', label: 'CLS', unit: 'score', good: 0.1, ni: 0.25, core: true, lowerIsBetter: true },
  { key: 'fcp_ms', label: 'FCP', unit: 'ms', good: 1800, ni: 3000, core: false, lowerIsBetter: true },
  { key: 'ttfb_ms', label: 'TTFB', unit: 'ms', good: 800, ni: 1800, core: false, lowerIsBetter: true },
];

export function rate(value: number, d: MetricDef): Rating {
  if (value <= d.good) return 'good';
  if (value <= d.ni) return 'needs-improvement';
  return 'poor';
}
const RATING_SCORE: Record<Rating, number> = { good: 100, 'needs-improvement': 60, poor: 20 };

export interface MetricResult { metric: string; value: number; unit: string; rating: Rating; good_threshold: number; needs_improvement_threshold: number; is_core: boolean; }
export interface GradeResult { metrics: MetricResult[]; passes_cwv: boolean; core_metrics_provided: number; overall_rating: Rating; score: number; grade: string; }

export function grade(body: any): { error: string } | { result: GradeResult } {
  const results: MetricResult[] = [];
  for (const d of METRICS) {
    const v = num(body?.[d.key]) ?? (d.key === 'inp_ms' ? num(body?.fid_ms) : undefined);
    if (v === undefined) continue;
    if (v < 0) return { error: `"${d.key}" must be 0 or greater.` };
    results.push({ metric: d.label, value: v, unit: d.unit, rating: rate(v, d), good_threshold: d.good, needs_improvement_threshold: d.ni, is_core: d.core });
  }
  const core = results.filter((r) => r.is_core);
  if (core.length === 0) return { error: 'Provide at least one Core Web Vital: lcp_ms, inp_ms (or fid_ms), or cls.' };
  const passes_cwv = core.length === 3 && core.every((r) => r.rating === 'good');
  // Score: equal-weighted mean of rating scores across all provided metrics.
  const score = round(results.reduce((s, r) => s + RATING_SCORE[r.rating], 0) / results.length, 1);
  const overall_rating: Rating = results.some((r) => r.rating === 'poor') ? 'poor' : results.some((r) => r.rating === 'needs-improvement') ? 'needs-improvement' : 'good';
  const letter = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
  return { result: { metrics: results, passes_cwv, core_metrics_provided: core.length, overall_rating, score, grade: letter } };
}

function actions(r: GradeResult): string[] {
  const out: string[] = [];
  out.push(r.passes_cwv ? 'Passes Core Web Vitals (all three core metrics are "good").' : `Does NOT pass Core Web Vitals${r.core_metrics_provided < 3 ? ` — only ${r.core_metrics_provided}/3 core metrics supplied` : ''}.`);
  const worst = [...r.metrics].filter((m) => m.rating !== 'good').sort((a, b) => RATING_SCORE[a.rating] - RATING_SCORE[b.rating]);
  for (const m of worst.slice(0, 3)) {
    if (m.metric === 'LCP') out.push('Improve LCP: optimize the largest image/text paint — preload the hero asset, compress images, cut render-blocking CSS/JS.');
    else if (m.metric === 'INP') out.push('Improve INP: break up long tasks, defer non-critical JS, and reduce main-thread work on interaction.');
    else if (m.metric === 'CLS') out.push('Improve CLS: set explicit width/height on images & embeds and reserve space for late-loading content.');
    else if (m.metric === 'FCP') out.push('Improve FCP: reduce TTFB and eliminate render-blocking resources above the fold.');
    else if (m.metric === 'TTFB') out.push('Improve TTFB: add caching/CDN, reduce server work, and use early hints.');
  }
  if (worst.length === 0) out.push('All measured metrics are good — monitor field data to keep them there.');
  return out;
}

const CHAIN_TO = [
  { api: 'web-performance-budget-checker', reason: 'Set per-asset weight budgets that keep LCP/INP within the good band.' },
  { api: 'mobile-seo-audit', reason: 'Core Web Vitals feed Google ranking — pair with an on-page mobile SEO audit.' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Web Vitals Grader API', version: '1.0.0',
    description: 'Deterministic Core Web Vitals grader. Supply measured LCP/INP/CLS (and optional FCP/TTFB); returns per-metric ratings against Google\'s published good/needs-improvement/poor thresholds and a Core Web Vitals pass/fail. The 0–100 score and A–F letter grade are an opinionated rollup of those official ratings, not a Google-defined metric. Input-driven — no fetch, no LLM.',
    openapi_url: 'https://orbis-apis.onrender.com/web-vitals-grader/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/grade', summary: 'Grade supplied Web Vitals → ratings, pass/fail, score', price_usdc: 0.005 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL grade + reasoning + fix priorities', price_usdc: 0.01 },
    ],
    pricing: [
      { path: '/grade', price_usdc: 0.005, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.01, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/grade', (req: Request, res: Response) => {
  const t0 = Date.now();
  const g = grade(req.body);
  if ('error' in g) return fail(res, t0, 400, 'invalid_request', g.error);
  respond(res, t0, {
    ...g.result,
    confidence_score: 1.0, confidence_per_section: { ratings: 1, score: 1 },
    recommended_actions_priority_order: actions(g.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const g = grade(req.body);
  if ('error' in g) return fail(res, t0, 400, 'invalid_request', g.error);
  const r = g.result;
  respond(res, t0, {
    ...r,
    reasoning: {
      why_result_generated: `Rated ${r.metrics.length} metric(s) against Google thresholds → score ${r.score}, grade ${r.grade}; Core Web Vitals ${r.passes_cwv ? 'pass' : 'fail'}.`,
      key_factors: r.metrics.map((m) => `${m.metric} ${m.value}${m.unit === 'ms' ? 'ms' : ''}: ${m.rating} (good ≤ ${m.good_threshold}).`),
      invalidators: ['Grade reflects only the supplied values; real CWV uses the 75th percentile of field data over 28 days.', 'Lab values (Lighthouse) often differ from field (CrUX) values.', 'Core Web Vitals pass requires all three of LCP, INP, and CLS — omitting one cannot pass.'],
    },
    confidence_score: 1.0, confidence_per_section: { ratings: 1, score: 1 },
    recommended_actions_priority_order: actions(r), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
