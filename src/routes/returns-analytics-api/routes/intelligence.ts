import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, FINANCIAL_DISCLAIMER, chainTo, round, mean, cagr } from '../../_aplus/finance';

// Deterministic return analytics from a value (NAV/price) series. /summary derives
// total return, CAGR, annualized arithmetic return, and best/worst period; /cagr
// computes the compound annual growth rate from begin/end values over N periods.
// Pure arithmetic — no LLM, nothing stored.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };
const MAX_VALUES = 5000;

function parseValues(body: any): { error: string } | { values: number[]; ppy: number } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide a "values" array of the level series (NAV/price).' };
  const v = body.values;
  if (!Array.isArray(v) || v.length < 2) return { error: '"values" must be an array of at least 2 level observations.' };
  if (v.length > MAX_VALUES) return { error: `"values" exceeds the ${MAX_VALUES}-observation limit.` };
  for (let i = 0; i < v.length; i++) {
    if (typeof v[i] !== 'number' || !Number.isFinite(v[i])) return { error: `values[${i}] must be a finite number.` };
    if (v[i] <= 0) return { error: `values[${i}] must be positive (levels, not returns).` };
  }
  const ppy = body.periods_per_year ?? 12;
  if (typeof ppy !== 'number' || !Number.isFinite(ppy) || ppy <= 0) return { error: '"periods_per_year" must be a positive number (default 12).' };
  return { values: v, ppy };
}

export interface SummaryCore {
  observations: number; periods: number; periods_per_year: number; years: number;
  total_return_percent: number; cagr_percent: number; annualized_arithmetic_percent: number;
  mean_period_return_percent: number; best_period_return_percent: number; worst_period_return_percent: number;
}
export interface CagrCore {
  begin_value: number; end_value: number; periods: number; periods_per_year: number; years: number;
  total_return_percent: number; cagr_percent: number;
}

function periodReturns(values: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < values.length; i++) out.push(values[i] / values[i - 1] - 1);
  return out;
}

function summarize(values: number[], ppy: number): SummaryCore {
  const rets = periodReturns(values);
  const periods = rets.length;
  const years = periods / ppy;
  const total = values[values.length - 1] / values[0] - 1;
  const g = cagr(values[0], values[values.length - 1], years);
  const m = mean(rets);
  return {
    observations: values.length, periods, periods_per_year: ppy, years: round(years, 6),
    total_return_percent: round(total * 100, 6), cagr_percent: round(g * 100, 6),
    annualized_arithmetic_percent: round(m * ppy * 100, 6), mean_period_return_percent: round(m * 100, 6),
    best_period_return_percent: round(Math.max(...rets) * 100, 6), worst_period_return_percent: round(Math.min(...rets) * 100, 6),
  };
}

function cagrOnly(begin: number, end: number, periods: number, ppy: number): CagrCore {
  const years = periods / ppy;
  const g = cagr(begin, end, years);
  return {
    begin_value: begin, end_value: end, periods, periods_per_year: ppy, years: round(years, 6),
    total_return_percent: round((end / begin - 1) * 100, 6), cagr_percent: round(g * 100, 6),
  };
}

const CHAIN_TO = [
  { api: 'risk-ratios', reason: 'Score the same series risk-adjusted (Sharpe/Sortino).' },
  { api: 'max-drawdown', reason: 'Measure the worst peak-to-trough decline of this series.' },
];
const INVALIDATORS = [
  '"values" are LEVELS (NAV/price), not returns; period returns are derived from consecutive levels. CAGR uses the geometric end/begin growth; annualized_arithmetic is mean(period return) × periods_per_year and will exceed CAGR when returns are volatile.',
  'years = periods ÷ periods_per_year, where periods = observations − 1. A wrong periods_per_year rescales CAGR and the annualized figure.',
  'Results assume the series is evenly spaced in time and contains no external cashflows; for money-weighted returns with deposits/withdrawals use an IRR-based method instead.',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, calculation_certainty: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: chainTo(CHAIN_TO), privacy: PRIVACY, execution_metadata: EXECUTION_METADATA, financial_disclaimer: FINANCIAL_DISCLAIMER,
});

export const DISCOVERY = {
  name: 'Returns Analytics API', version: '1.0.0',
  description: 'Deterministic return analytics from a value (NAV/price) series. /summary derives total return, CAGR, annualized arithmetic return, and best/worst period; /cagr computes the compound annual growth rate from begin/end values over N periods. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/returns-analytics/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['total_return', 'cagr', 'annualized_return', 'period_returns', 'best_worst_period'],
  typical_use_cases: [
    'Compute the CAGR and total return of a strategy from its equity curve',
    'Annualize a series of periodic returns for cross-strategy comparison',
    'Get the best and worst single-period return in a track record',
  ],
  input_examples: [
    { endpoint: '/summary', body: { values: [100, 108, 102, 115, 121], periods_per_year: 12 } },
    { endpoint: '/cagr', body: { begin_value: 100, end_value: 121, periods: 4, periods_per_year: 12 } },
  ],
  output_examples: [
    { endpoint: '/summary', response: { observations: 5, periods: 4, total_return_percent: 21, cagr_percent: 77.1561 } },
    { endpoint: '/cagr', response: { begin_value: 100, end_value: 121, years: 0.333333, total_return_percent: 21, cagr_percent: 77.1561 } },
  ],
  endpoints: [
    { method: 'POST', path: '/summary', summary: 'Total return, CAGR, annualized & best/worst from a series', price_usdc: 0.007 },
    { method: 'POST', path: '/cagr', summary: 'CAGR from begin/end values over N periods', price_usdc: 0.006 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL summary + reasoning', price_usdc: 0.012 },
  ],
  pricing: [
    { path: '/summary', price_usdc: 0.007, currency: 'USDC' },
    { path: '/cagr', price_usdc: 0.006, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
  ],
  x402_compatible: true,
};

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

router.post('/summary', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parseValues(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const v = summarize(p.values, p.ppy);
  respond(res, t0, { ...v, ...TAIL({ returns: 1 }, [`Total return ${v.total_return_percent}%, CAGR ${v.cagr_percent}% over ${v.years} year(s).`]) });
});

router.post('/cagr', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide begin_value, end_value and periods.');
  for (const k of ['begin_value', 'end_value', 'periods']) if (typeof b[k] !== 'number' || !Number.isFinite(b[k])) return fail(res, t0, 400, 'invalid_request', `"${k}" must be a finite number.`);
  if (b.begin_value <= 0 || b.end_value <= 0) return fail(res, t0, 400, 'invalid_request', 'begin_value and end_value must be positive.');
  if (b.periods <= 0) return fail(res, t0, 400, 'invalid_request', '"periods" must be greater than 0.');
  const ppy = b.periods_per_year ?? 12;
  if (typeof ppy !== 'number' || !Number.isFinite(ppy) || ppy <= 0) return fail(res, t0, 400, 'invalid_request', '"periods_per_year" must be a positive number (default 12).');
  const v = cagrOnly(b.begin_value, b.end_value, b.periods, ppy);
  respond(res, t0, { ...v, ...TAIL({ cagr: 1 }, [`CAGR ${v.cagr_percent}% (total ${v.total_return_percent}% over ${v.years} year(s)).`]) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parseValues(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const v = summarize(p.values, p.ppy);
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Derived ${v.periods} period return(s) from ${v.observations} levels, then total return ${v.total_return_percent}%, geometric CAGR ${v.cagr_percent}% over ${v.years} year(s), and annualized arithmetic ${v.annualized_arithmetic_percent}%.`,
      key_factors: [`Total return ${v.total_return_percent}%.`, `CAGR ${v.cagr_percent}% (geometric).`, `Best ${v.best_period_return_percent}%, worst ${v.worst_period_return_percent}% period.`],
      invalidators: INVALIDATORS,
    },
    ...TAIL({ returns: 1 }, [`CAGR ${v.cagr_percent}% vs total ${v.total_return_percent}% — the gap reflects volatility drag.`]),
  });
});

export default router;
