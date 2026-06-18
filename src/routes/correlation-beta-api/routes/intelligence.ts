import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, FINANCIAL_DISCLAIMER, chainTo, round, mean, stdev, variance, covariance, correlation } from '../../_aplus/finance';

// Deterministic portfolio statistics. /correlation returns the Pearson correlation and
// covariance of two return series; /beta regresses an asset's returns on a benchmark to
// get beta, Jensen's alpha and R². Pure statistics — no LLM, nothing stored. (Distinct
// from the LLM/crypto market-correlation service: this is exact math on supplied series.)

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };
function numField(v: unknown): number | undefined { return typeof v === 'number' && Number.isFinite(v) ? v : undefined; }

export interface CorrelationCore {
  n: number; correlation: number; covariance: number;
  mean_a: number; mean_b: number; stdev_a: number; stdev_b: number; r_squared: number; relationship: string;
}
export interface BetaCore {
  n: number; beta: number; alpha_per_period: number; r_squared: number; correlation: number;
  mean_asset: number; mean_benchmark: number; benchmark_variance: number;
  alpha_annualized_percent: number | null; sensitivity: string;
}

function describeCorr(r: number): string {
  const a = Math.abs(r);
  const strength = a >= 0.8 ? 'very strong' : a >= 0.6 ? 'strong' : a >= 0.4 ? 'moderate' : a >= 0.2 ? 'weak' : 'negligible';
  if (a < 0.2) return 'negligible';
  return `${strength} ${r >= 0 ? 'positive' : 'negative'}`;
}

function correlate(a: number[], b: number[]): CorrelationCore {
  const r = correlation(a, b);
  return {
    n: a.length, correlation: round(r, 6), covariance: round(covariance(a, b), 8),
    mean_a: round(mean(a), 6), mean_b: round(mean(b), 6),
    stdev_a: round(stdev(a), 6), stdev_b: round(stdev(b), 6),
    r_squared: round(r * r, 6), relationship: describeCorr(r),
  };
}

function betaOf(asset: number[], bench: number[], ppy: number | undefined): BetaCore {
  const cov = covariance(asset, bench);
  const varB = variance(bench);
  const beta = cov / varB;
  const mA = mean(asset), mB = mean(bench);
  const alpha = mA - beta * mB;
  const r = correlation(asset, bench);
  return {
    n: asset.length, beta: round(beta, 6), alpha_per_period: round(alpha, 8),
    r_squared: round(r * r, 6), correlation: round(r, 6),
    mean_asset: round(mA, 6), mean_benchmark: round(mB, 6), benchmark_variance: round(varB, 8),
    alpha_annualized_percent: ppy ? round(alpha * ppy * 100, 6) : null,
    sensitivity: beta > 1 ? 'more volatile than benchmark' : beta < 0 ? 'inversely related to benchmark' : beta < 1 ? 'less volatile than benchmark' : 'moves with benchmark',
  };
}

function readPair(b: any, ka: string, kb: string): { error: string } | { a: number[]; b: number[] } {
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return { error: `Provide "${ka}" and "${kb}" arrays of equal length.` };
  const ra = b[ka], rb = b[kb];
  if (!Array.isArray(ra) || !Array.isArray(rb)) return { error: `"${ka}" and "${kb}" must both be arrays.` };
  if (ra.length !== rb.length) return { error: `"${ka}" and "${kb}" must be the same length (got ${ra.length} and ${rb.length}).` };
  if (ra.length < 2) return { error: `"${ka}" and "${kb}" must each have at least 2 observations.` };
  const a: number[] = [], bb: number[] = [];
  for (const x of ra) { const n = numField(x); if (n === undefined) return { error: `Every entry in "${ka}" must be a finite number.` }; a.push(n); }
  for (const x of rb) { const n = numField(x); if (n === undefined) return { error: `Every entry in "${kb}" must be a finite number.` }; bb.push(n); }
  return { a, b: bb };
}

function readBeta(b: any): { error: string } | { asset: number[]; bench: number[]; ppy?: number } {
  const p = readPair(b, 'asset_returns', 'benchmark_returns');
  if ('error' in p) return p;
  if (variance(p.b) === 0) return { error: 'benchmark_returns has zero variance, so beta is undefined (cannot regress on a constant benchmark).' };
  let ppy: number | undefined; if (b.periods_per_year !== undefined) { const x = numField(b.periods_per_year); if (x === undefined || x <= 0) return { error: '"periods_per_year" must be a positive number.' }; ppy = x; }
  return { asset: p.a, bench: p.b, ppy };
}

const CHAIN_TO = [
  { api: 'risk-ratios', reason: 'Combine beta with the Sharpe/Sortino ratios for full risk-adjusted analysis.' },
  { api: 'value-at-risk', reason: 'Quantify downside risk of the same return series.' },
];
const INVALIDATORS = [
  'Correlation measures LINEAR association only and is unit-free in [-1, 1]; a near-zero correlation does not rule out a non-linear relationship, and correlation is not causation.',
  'Beta = cov(asset, benchmark) / var(benchmark); it is sensitive to the sample window and assumes a stable linear relationship. A short or non-stationary series gives an unreliable beta.',
  'Jensen\'s alpha here is mean(asset) − beta·mean(benchmark) in the SAME per-period units you supplied; the annualized figure (if returned) is a simple ×periods_per_year scaling, not compounded.',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, calculation_certainty: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: chainTo(CHAIN_TO), privacy: PRIVACY, execution_metadata: EXECUTION_METADATA, financial_disclaimer: FINANCIAL_DISCLAIMER,
});

export const DISCOVERY = {
  name: 'Correlation & Beta API', version: '1.0.0',
  description: 'Deterministic portfolio statistics. /correlation returns Pearson correlation and covariance of two return series; /beta regresses an asset on a benchmark for beta, Jensen\'s alpha and R². Exact math on supplied data — no LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/correlation-beta/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['pearson_correlation', 'covariance', 'beta', 'jensens_alpha', 'r_squared'],
  typical_use_cases: [
    'Measure how correlated two assets or strategies are before combining them',
    'Compute a stock\'s beta and alpha versus a market benchmark',
    'Quantify how much of an asset\'s movement the benchmark explains (R²)',
  ],
  input_examples: [
    { endpoint: '/correlation', body: { series_a: [1.2, -0.8, 2.1, -3.4, 0.5], series_b: [0.9, -0.5, 1.7, -2.9, 0.2] } },
    { endpoint: '/beta', body: { asset_returns: [1.2, -0.8, 2.1, -3.4, 0.5], benchmark_returns: [0.9, -0.5, 1.7, -2.9, 0.2], periods_per_year: 252 } },
  ],
  output_examples: [
    { endpoint: '/correlation', response: { correlation: 0.9939, r_squared: 0.9879, relationship: 'very strong positive' } },
    { endpoint: '/beta', response: { beta: 1.1739, alpha_per_period: -0.0091, r_squared: 0.9879 } },
  ],
  endpoints: [
    { method: 'POST', path: '/correlation', summary: 'Pearson correlation + covariance of two series', price_usdc: 0.008 },
    { method: 'POST', path: '/beta', summary: 'Beta, alpha and R² of an asset vs a benchmark', price_usdc: 0.008 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL correlation + beta + reasoning', price_usdc: 0.014 },
  ],
  pricing: [
    { path: '/correlation', price_usdc: 0.008, currency: 'USDC' },
    { path: '/beta', price_usdc: 0.008, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.014, currency: 'USDC' },
  ],
  x402_compatible: true,
};

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

router.post('/correlation', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = readPair(req.body, 'series_a', 'series_b');
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = correlate(r.a, r.b);
  respond(res, t0, { ...v, ...TAIL({ correlation: 1 }, [`Correlation ${v.correlation} (${v.relationship}); R² ${v.r_squared}.`]) });
});

router.post('/beta', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = readBeta(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = betaOf(r.asset, r.bench, r.ppy);
  respond(res, t0, { ...v, ...TAIL({ beta: 1 }, [`Beta ${v.beta} (${v.sensitivity}); alpha ${v.alpha_per_period}/period; R² ${v.r_squared}.`]) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = readBeta(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const c = correlate(r.asset, r.bench);
  const beta = betaOf(r.asset, r.bench, r.ppy);
  respond(res, t0, {
    ...beta, correlation_detail: c,
    reasoning: {
      why_result_generated: `Over ${beta.n} observations the asset has correlation ${c.correlation} with the benchmark and beta ${beta.beta} (${beta.sensitivity}); the benchmark explains R² ${beta.r_squared} of its variance, with Jensen's alpha ${beta.alpha_per_period}/period.`,
      key_factors: [
        `Beta ${beta.beta} — ${beta.sensitivity}.`,
        `Correlation ${c.correlation} (${c.relationship}).`,
        `R² ${beta.r_squared}; alpha ${beta.alpha_per_period}/period.`,
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL({ correlation: 1, beta: 1 }, [
      Math.abs(c.correlation) >= 0.8 ? `High correlation (${c.correlation}) — limited diversification benefit between these two.` : `Correlation ${c.correlation} — some diversification benefit; chain to risk-ratios.`,
    ]),
  });
});

export default router;
