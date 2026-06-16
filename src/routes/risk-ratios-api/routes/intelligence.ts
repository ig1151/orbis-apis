import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, FINANCIAL_DISCLAIMER, round, mean, stdev, downsideDeviation } from '../../_aplus/finance';

// Deterministic risk-adjusted return ratios from a series of periodic returns.
// /sharpe = (mean − risk-free) / stdev; /sortino = (mean − MAR) / downside deviation.
// Both annualized by √(periods per year). Returns are percents per period. Pure
// statistics — no LLM, nothing stored.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };
const MAX_RETURNS = 5000;

function parseReturns(body: any): { error: string } | { returns: number[]; ppy: number } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide a "returns" array of per-period percents.' };
  const r = body.returns;
  if (!Array.isArray(r) || r.length < 2) return { error: '"returns" must be an array of at least 2 per-period percents.' };
  if (r.length > MAX_RETURNS) return { error: `"returns" exceeds the ${MAX_RETURNS}-observation limit.` };
  for (let i = 0; i < r.length; i++) if (typeof r[i] !== 'number' || !Number.isFinite(r[i])) return { error: `returns[${i}] must be a finite number (percent).` };
  const ppy = body.periods_per_year ?? 12;
  if (typeof ppy !== 'number' || !Number.isFinite(ppy) || ppy <= 0) return { error: '"periods_per_year" must be a positive number (default 12).' };
  return { returns: r, ppy };
}

export interface SharpeCore {
  observations: number; periods_per_year: number; mean_return_percent: number; stdev_percent: number;
  risk_free_rate_percent: number; sharpe_ratio: number | null; annualized_sharpe: number | null;
  annualized_return_percent: number; annualized_volatility_percent: number;
}
export interface SortinoCore {
  observations: number; periods_per_year: number; mean_return_percent: number; minimum_acceptable_return_percent: number;
  downside_deviation_percent: number; sortino_ratio: number | null; annualized_sortino: number | null;
}

function sharpe(returns: number[], ppy: number, rf: number): SharpeCore {
  const m = mean(returns), sd = stdev(returns, true);
  const sr = sd === 0 ? null : (m - rf) / sd;
  return {
    observations: returns.length, periods_per_year: ppy,
    mean_return_percent: round(m, 6), stdev_percent: round(sd, 6), risk_free_rate_percent: rf,
    sharpe_ratio: sr === null ? null : round(sr, 6),
    annualized_sharpe: sr === null ? null : round(sr * Math.sqrt(ppy), 6),
    annualized_return_percent: round(m * ppy, 6), annualized_volatility_percent: round(sd * Math.sqrt(ppy), 6),
  };
}

function sortino(returns: number[], ppy: number, mar: number): SortinoCore {
  const m = mean(returns), dd = downsideDeviation(returns, mar);
  const sr = dd === 0 ? null : (m - mar) / dd;
  return {
    observations: returns.length, periods_per_year: ppy,
    mean_return_percent: round(m, 6), minimum_acceptable_return_percent: mar,
    downside_deviation_percent: round(dd, 6),
    sortino_ratio: sr === null ? null : round(sr, 6),
    annualized_sortino: sr === null ? null : round(sr * Math.sqrt(ppy), 6),
  };
}

const CHAIN_TO = [
  { api: 'dcf-valuation', reason: 'Value an asset whose risk-adjusted return you just scored.' },
  { api: 'bond-analytics', reason: 'Compare the strategy against a fixed-income alternative.' },
];
const INVALIDATORS = [
  'Returns are treated as PER-PERIOD percents in arithmetic (not geometric/log) terms; mean and standard deviation use the sample (n−1) divisor. Feeding decimals (0.01) instead of percents (1.0) scales every ratio by 100.',
  'Annualization multiplies the periodic ratio by √(periods_per_year) and assumes i.i.d. returns — it overstates the annual ratio when returns autocorrelate. annualized_return is simple (mean × periods), not compounded.',
  'Sharpe divides by total volatility; Sortino divides by downside deviation below the MAR (with an n divisor over ALL observations). With zero volatility (Sharpe) or no downside (Sortino) the ratio is undefined and returned as null.',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA, financial_disclaimer: FINANCIAL_DISCLAIMER,
});

const DISCOVERY = {
  name: 'Sharpe / Sortino Risk Ratios API', version: '1.0.0',
  description: 'Deterministic risk-adjusted return ratios from a series of periodic returns. /sharpe uses total volatility; /sortino uses downside deviation below a minimum-acceptable return. Both annualized by √(periods per year), with annualized return & volatility. Returns are per-period percents. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/risk-ratios/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['sharpe_ratio', 'sortino_ratio', 'volatility', 'downside_risk', 'risk_adjusted_return'],
  typical_use_cases: ['Score a strategy risk-adjusted return with the Sharpe ratio', 'Measure downside-only risk with Sortino vs a target', 'Compare annualized return and volatility across strategies'],
  endpoints: [
    { method: 'POST', path: '/sharpe', summary: 'Sharpe ratio + annualized return/vol', price_usdc: 0.007 },
    { method: 'POST', path: '/sortino', summary: 'Sortino ratio + downside deviation', price_usdc: 0.007 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL Sharpe + Sortino + reasoning', price_usdc: 0.012 },
  ],
  pricing: [
    { path: '/sharpe', price_usdc: 0.007, currency: 'USDC' },
    { path: '/sortino', price_usdc: 0.007, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
  ],
  x402_compatible: true,
};

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

router.post('/sharpe', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parseReturns(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const rf = typeof req.body.risk_free_rate === 'number' && Number.isFinite(req.body.risk_free_rate) ? req.body.risk_free_rate : 0;
  const v = sharpe(p.returns, p.ppy, rf);
  respond(res, t0, { ...v, ...TAIL({ sharpe: 1 }, v.annualized_sharpe === null
    ? ['Volatility is zero — Sharpe is undefined; the series has no dispersion.']
    : [`Annualized Sharpe ${v.annualized_sharpe} (annual return ${v.annualized_return_percent}%, vol ${v.annualized_volatility_percent}%).`, 'Use /sortino to score downside risk only.']) });
});

router.post('/sortino', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parseReturns(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const mar = typeof req.body.minimum_acceptable_return === 'number' && Number.isFinite(req.body.minimum_acceptable_return) ? req.body.minimum_acceptable_return : 0;
  const v = sortino(p.returns, p.ppy, mar);
  respond(res, t0, { ...v, ...TAIL({ sortino: 1 }, v.annualized_sortino === null
    ? [`No returns fell below the ${mar}% MAR — Sortino is undefined (no downside).`]
    : [`Annualized Sortino ${v.annualized_sortino} vs a ${mar}% minimum-acceptable return.`]) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parseReturns(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const rf = typeof req.body.risk_free_rate === 'number' && Number.isFinite(req.body.risk_free_rate) ? req.body.risk_free_rate : 0;
  const mar = typeof req.body.minimum_acceptable_return === 'number' && Number.isFinite(req.body.minimum_acceptable_return) ? req.body.minimum_acceptable_return : 0;
  const s = sharpe(p.returns, p.ppy, rf), so = sortino(p.returns, p.ppy, mar);
  respond(res, t0, {
    observations: s.observations, periods_per_year: s.periods_per_year,
    mean_return_percent: s.mean_return_percent, stdev_percent: s.stdev_percent,
    annualized_return_percent: s.annualized_return_percent, annualized_volatility_percent: s.annualized_volatility_percent,
    risk_free_rate_percent: rf, sharpe_ratio: s.sharpe_ratio, annualized_sharpe: s.annualized_sharpe,
    minimum_acceptable_return_percent: mar, downside_deviation_percent: so.downside_deviation_percent,
    sortino_ratio: so.sortino_ratio, annualized_sortino: so.annualized_sortino,
    reasoning: {
      why_result_generated: `Computed mean ${s.mean_return_percent}% and stdev ${s.stdev_percent}% over ${s.observations} periods, then Sharpe (vs ${rf}% rf) and Sortino (vs ${mar}% MAR), annualized by √${s.periods_per_year}.`,
      key_factors: [
        `Annualized Sharpe ${s.annualized_sharpe ?? 'undefined'}; annualized Sortino ${so.annualized_sortino ?? 'undefined'}.`,
        `Annual return ${s.annualized_return_percent}%, annual vol ${s.annualized_volatility_percent}%.`,
        `Downside deviation ${so.downside_deviation_percent}% below the ${mar}% MAR.`,
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL({ sharpe: 1, sortino: 1 }, [
      s.annualized_sharpe === null ? 'Sharpe undefined (zero volatility).' : `Annualized Sharpe ${s.annualized_sharpe}, Sortino ${so.annualized_sortino ?? 'n/a'} — compare against your benchmark.`,
    ]),
  });
});

export default router;
