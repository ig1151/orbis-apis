import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, FINANCIAL_DISCLAIMER, round, mean, stdev, normInv, normPdf } from '../../_aplus/finance';

// Deterministic Value-at-Risk from a series of per-period returns (percents).
// /historical = empirical quantile + expected shortfall; /parametric = Gaussian
// VaR (mean + z·σ) + closed-form expected shortfall. VaR/CVaR are reported as
// POSITIVE loss percents at the chosen confidence. Pure statistics — no LLM, nothing stored.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };
const MAX_RETURNS = 5000;

function parse(body: any): { error: string } | { returns: number[]; confidence: number } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide a "returns" array of per-period percents.' };
  const r = body.returns;
  if (!Array.isArray(r) || r.length < 2) return { error: '"returns" must be an array of at least 2 per-period percents.' };
  if (r.length > MAX_RETURNS) return { error: `"returns" exceeds the ${MAX_RETURNS}-observation limit.` };
  for (let i = 0; i < r.length; i++) if (typeof r[i] !== 'number' || !Number.isFinite(r[i])) return { error: `returns[${i}] must be a finite number (percent).` };
  const confidence = body.confidence ?? 0.95;
  if (typeof confidence !== 'number' || !(confidence > 0.5 && confidence < 1)) return { error: '"confidence" must be a number between 0.5 and 1 (default 0.95).' };
  return { returns: r, confidence };
}

// Percentile at probability q (linear interpolation on the sorted losses), q in [0,1].
function quantile(sorted: number[], q: number): number {
  if (sorted.length === 1) return sorted[0];
  const idx = q * (sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export interface HistoricalCore {
  method: 'historical'; observations: number; confidence: number; alpha: number;
  threshold_return_percent: number; var_percent: number; cvar_percent: number;
}
export interface ParametricCore {
  method: 'parametric_gaussian'; observations: number; confidence: number; alpha: number;
  mean_percent: number; stdev_percent: number; z_score: number; var_percent: number; cvar_percent: number;
}

function historical(returns: number[], confidence: number): HistoricalCore {
  const alpha = 1 - confidence;
  const sorted = [...returns].sort((a, b) => a - b);
  const threshold = quantile(sorted, alpha); // the alpha-quantile return (a low/negative value)
  const tail = sorted.filter((x) => x <= threshold);
  const es = tail.length ? mean(tail) : threshold;
  return {
    method: 'historical', observations: returns.length, confidence, alpha: round(alpha, 6),
    threshold_return_percent: round(threshold, 6),
    var_percent: round(-threshold, 6),
    cvar_percent: round(-es, 6),
  };
}

function parametric(returns: number[], confidence: number): ParametricCore {
  const alpha = 1 - confidence;
  const m = mean(returns), sd = stdev(returns, true);
  const z = normInv(alpha); // negative z for the lower tail
  const varReturn = m + z * sd; // quantile return
  const es = m - sd * (normPdf(z) / alpha); // closed-form Gaussian expected shortfall (return)
  return {
    method: 'parametric_gaussian', observations: returns.length, confidence, alpha: round(alpha, 6),
    mean_percent: round(m, 6), stdev_percent: round(sd, 6), z_score: round(z, 6),
    var_percent: round(-varReturn, 6), cvar_percent: round(-es, 6),
  };
}

const CHAIN_TO = [
  { api: 'max-drawdown', reason: 'Pair single-period tail loss with worst realized peak-to-trough decline.' },
  { api: 'risk-ratios', reason: 'Add Sharpe/Sortino for a risk-adjusted view of the same returns.' },
];
const INVALIDATORS = [
  'Returns are PER-PERIOD percents; VaR/CVaR are reported as POSITIVE loss percents for the SAME period length (not annualized or scaled to a horizon). A negative var_percent means even the tail quantile was a gain.',
  'Historical VaR is the empirical α-quantile (α = 1 − confidence) by linear interpolation; it is only as representative as the sample and says nothing about losses rarer than the data.',
  'Parametric VaR assumes i.i.d. Gaussian returns (VaR = −(μ + zα·σ); CVaR = −(μ − σ·φ(zα)/α)); it understates tail risk for fat-tailed/skewed return distributions. CVaR (expected shortfall) ≥ VaR by construction.',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA, financial_disclaimer: FINANCIAL_DISCLAIMER,
});

export const DISCOVERY = {
  name: 'Value at Risk API', version: '1.0.0',
  description: 'Deterministic Value-at-Risk from a series of per-period returns. /historical = empirical α-quantile + expected shortfall; /parametric = Gaussian VaR (μ + z·σ) + closed-form expected shortfall. VaR/CVaR reported as positive loss percents at the chosen confidence. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/value-at-risk/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['historical_var', 'parametric_var', 'expected_shortfall', 'cvar', 'tail_risk'],
  typical_use_cases: [
    'Estimate the 95% one-period Value-at-Risk of a strategy from its return history',
    'Compare empirical (historical) vs Gaussian (parametric) tail-loss estimates',
    'Get expected shortfall (CVaR) for risk limits and capital sizing',
  ],
  input_examples: [
    { endpoint: '/historical', body: { returns: [1.2, -0.8, 2.1, -3.4, 0.5, -1.1, 1.8, -2.2, 0.9, -0.3], confidence: 0.95 } },
    { endpoint: '/parametric', body: { returns: [1.2, -0.8, 2.1, -3.4, 0.5, -1.1, 1.8, -2.2, 0.9, -0.3], confidence: 0.95 } },
  ],
  output_examples: [
    { endpoint: '/historical', response: { method: 'historical', confidence: 0.95, var_percent: 2.86, cvar_percent: 3.4 } },
    { endpoint: '/parametric', response: { method: 'parametric_gaussian', confidence: 0.95, z_score: -1.644854, var_percent: 3.047832 } },
  ],
  endpoints: [
    { method: 'POST', path: '/historical', summary: 'Empirical VaR + expected shortfall', price_usdc: 0.008 },
    { method: 'POST', path: '/parametric', summary: 'Gaussian VaR + expected shortfall', price_usdc: 0.008 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL historical + parametric + reasoning', price_usdc: 0.014 },
  ],
  pricing: [
    { path: '/historical', price_usdc: 0.008, currency: 'USDC' },
    { path: '/parametric', price_usdc: 0.008, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.014, currency: 'USDC' },
  ],
  x402_compatible: true,
};

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

router.post('/historical', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parse(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const v = historical(p.returns, p.confidence);
  respond(res, t0, { ...v, ...TAIL({ historical_var: 1 }, [`Historical ${Math.round(p.confidence * 100)}% VaR ${v.var_percent}% (CVaR ${v.cvar_percent}%).`]) });
});

router.post('/parametric', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parse(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const v = parametric(p.returns, p.confidence);
  respond(res, t0, { ...v, ...TAIL({ parametric_var: 1 }, [`Gaussian ${Math.round(p.confidence * 100)}% VaR ${v.var_percent}% (CVaR ${v.cvar_percent}%).`]) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parse(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const h = historical(p.returns, p.confidence), g = parametric(p.returns, p.confidence);
  respond(res, t0, {
    observations: h.observations, confidence: p.confidence, alpha: h.alpha,
    historical: { threshold_return_percent: h.threshold_return_percent, var_percent: h.var_percent, cvar_percent: h.cvar_percent },
    parametric: { mean_percent: g.mean_percent, stdev_percent: g.stdev_percent, z_score: g.z_score, var_percent: g.var_percent, cvar_percent: g.cvar_percent },
    reasoning: {
      why_result_generated: `At ${Math.round(p.confidence * 100)}% confidence (α=${h.alpha}) over ${h.observations} returns: historical VaR ${h.var_percent}% / CVaR ${h.cvar_percent}%; Gaussian VaR ${g.var_percent}% / CVaR ${g.cvar_percent}% using μ=${g.mean_percent}%, σ=${g.stdev_percent}%.`,
      key_factors: [`Historical VaR ${h.var_percent}%, CVaR ${h.cvar_percent}%.`, `Parametric VaR ${g.var_percent}%, CVaR ${g.cvar_percent}%.`, `z(α)=${g.z_score}.`],
      invalidators: INVALIDATORS,
    },
    ...TAIL({ historical_var: 1, parametric_var: 1 }, [
      `Compare historical (${h.var_percent}%) vs Gaussian (${g.var_percent}%) VaR; a large gap signals non-normal/fat-tailed returns.`,
    ]),
  });
});

export default router;
