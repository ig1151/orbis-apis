import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, FINANCIAL_DISCLAIMER, chainTo, round } from '../../_aplus/finance';

// Deterministic weighted-average cost of capital. /wacc blends the cost of equity and
// after-tax cost of debt by market-value weights; /capm derives the cost of equity from
// the risk-free rate, beta and the equity risk premium. Pure arithmetic — no LLM,
// nothing stored. Complements the DCF Valuation API (use WACC as the discount rate).

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };

function numField(v: unknown): number | undefined { return typeof v === 'number' && Number.isFinite(v) ? v : undefined; }

export interface WaccCore {
  equity_value: number; debt_value: number; total_value: number; equity_weight: number; debt_weight: number;
  cost_of_equity_percent: number; cost_of_debt_percent: number; tax_rate_percent: number;
  after_tax_cost_of_debt_percent: number; wacc_percent: number;
}
export interface CapmCore {
  risk_free_percent: number; beta: number; equity_risk_premium_percent: number; market_return_percent: number; cost_of_equity_percent: number;
}

function wacc(E: number, D: number, re: number, rd: number, tax: number): WaccCore {
  const V = E + D;
  const we = V === 0 ? 0 : E / V, wd = V === 0 ? 0 : D / V;
  const afterTaxRd = rd * (1 - tax / 100);
  return {
    equity_value: E, debt_value: D, total_value: V,
    equity_weight: round(we, 6), debt_weight: round(wd, 6),
    cost_of_equity_percent: re, cost_of_debt_percent: rd, tax_rate_percent: tax,
    after_tax_cost_of_debt_percent: round(afterTaxRd, 6),
    wacc_percent: round(we * re + wd * afterTaxRd, 6),
  };
}

// equity risk premium: explicit, else derived from market_return - risk_free.
function capm(rf: number, beta: number, erp: number, marketReturn: number): CapmCore {
  return {
    risk_free_percent: rf, beta, equity_risk_premium_percent: round(erp, 6), market_return_percent: round(marketReturn, 6),
    cost_of_equity_percent: round(rf + beta * erp, 6),
  };
}

function readWacc(b: any): { error: string } | { E: number; D: number; re: number; rd: number; tax: number } {
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return { error: 'Provide equity_value, debt_value, cost_of_equity_percent and cost_of_debt_percent.' };
  const E = numField(b.equity_value), D = numField(b.debt_value), re = numField(b.cost_of_equity_percent), rd = numField(b.cost_of_debt_percent);
  if (E === undefined || E < 0) return { error: '"equity_value" must be a non-negative number.' };
  if (D === undefined || D < 0) return { error: '"debt_value" must be a non-negative number.' };
  if (E + D <= 0) return { error: 'equity_value + debt_value must be greater than 0.' };
  if (re === undefined) return { error: '"cost_of_equity_percent" must be a finite number.' };
  if (rd === undefined) return { error: '"cost_of_debt_percent" must be a finite number.' };
  let tax = 0;
  if (b.tax_rate_percent !== undefined) { const t = numField(b.tax_rate_percent); if (t === undefined || t < 0 || t > 100) return { error: '"tax_rate_percent" must be between 0 and 100.' }; tax = t; }
  return { E, D, re, rd, tax };
}

// CAPM inputs: risk_free_percent, beta, and EITHER equity_risk_premium_percent OR market_return_percent.
function readCapm(b: any): { error: string } | { rf: number; beta: number; erp: number; market: number } {
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return { error: 'Provide risk_free_percent, beta and an equity_risk_premium_percent or market_return_percent.' };
  const rf = numField(b.risk_free_percent), beta = numField(b.beta);
  if (rf === undefined) return { error: '"risk_free_percent" must be a finite number.' };
  if (beta === undefined) return { error: '"beta" must be a finite number.' };
  const erpIn = numField(b.equity_risk_premium_percent), marketIn = numField(b.market_return_percent);
  if (erpIn === undefined && marketIn === undefined) return { error: 'Provide either "equity_risk_premium_percent" or "market_return_percent".' };
  const erp = erpIn !== undefined ? erpIn : (marketIn as number) - rf;
  const market = marketIn !== undefined ? marketIn : rf + erp;
  return { rf, beta, erp, market };
}

const CHAIN_TO = [
  { api: 'dcf-valuation', reason: 'Use the WACC as the discount rate for a DCF valuation.' },
  { api: 'bond-analytics', reason: 'Estimate the pre-tax cost of debt from a bond yield.' },
];
const INVALIDATORS = [
  'Weights are MARKET-VALUE based: we = E/(E+D), wd = D/(E+D). Using book values changes the weights and the WACC.',
  'WACC = we·Re + wd·Rd·(1 − tax); only debt interest is tax-deductible, so the tax shield is applied to the cost of debt, not equity. tax_rate_percent defaults to 0 (no shield).',
  'CAPM cost of equity = Rf + β·ERP, where ERP is supplied directly or derived as market_return − risk_free. It assumes a single-factor model and a stable beta; it is an estimate, not a guaranteed return.',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, calculation_certainty: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: chainTo(CHAIN_TO), privacy: PRIVACY, execution_metadata: EXECUTION_METADATA, financial_disclaimer: FINANCIAL_DISCLAIMER,
});

export const DISCOVERY = {
  name: 'WACC API', version: '1.0.0',
  description: 'Deterministic weighted-average cost of capital. /wacc blends the cost of equity and after-tax cost of debt by market-value weights; /capm derives the cost of equity from the risk-free rate, beta and equity risk premium. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/wacc/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['wacc', 'cost_of_equity', 'after_tax_cost_of_debt', 'capm', 'capital_weights'],
  typical_use_cases: [
    'Compute a discount rate (WACC) for a DCF valuation',
    'Derive the cost of equity from CAPM (risk-free + beta · equity risk premium)',
    'Compare capital cost across different debt/equity mixes',
  ],
  input_examples: [
    { endpoint: '/wacc', body: { equity_value: 600000, debt_value: 400000, cost_of_equity_percent: 9, cost_of_debt_percent: 5, tax_rate_percent: 21 } },
    { endpoint: '/capm', body: { risk_free_percent: 4, beta: 1.2, market_return_percent: 10 } },
  ],
  output_examples: [
    { endpoint: '/wacc', response: { equity_weight: 0.6, debt_weight: 0.4, after_tax_cost_of_debt_percent: 3.95, wacc_percent: 6.98 } },
    { endpoint: '/capm', response: { equity_risk_premium_percent: 6, cost_of_equity_percent: 11.2 } },
  ],
  endpoints: [
    { method: 'POST', path: '/wacc', summary: 'Weighted-average cost of capital', price_usdc: 0.008 },
    { method: 'POST', path: '/capm', summary: 'Cost of equity via CAPM', price_usdc: 0.006 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL CAPM cost of equity → WACC + reasoning', price_usdc: 0.014 },
  ],
  pricing: [
    { path: '/wacc', price_usdc: 0.008, currency: 'USDC' },
    { path: '/capm', price_usdc: 0.006, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.014, currency: 'USDC' },
  ],
  x402_compatible: true,
};

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

router.post('/wacc', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = readWacc(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = wacc(r.E, r.D, r.re, r.rd, r.tax);
  respond(res, t0, { ...v, ...TAIL({ wacc: 1 }, [`WACC ${v.wacc_percent}% (equity ${v.equity_weight}, debt ${v.debt_weight}, after-tax Rd ${v.after_tax_cost_of_debt_percent}%).`]) });
});

router.post('/capm', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = readCapm(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = capm(r.rf, r.beta, r.erp, r.market);
  respond(res, t0, { ...v, ...TAIL({ capm: 1 }, [`Cost of equity ${v.cost_of_equity_percent}% = ${v.risk_free_percent}% + ${v.beta}·${v.equity_risk_premium_percent}%.`]) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const c = readCapm(req.body);
  if ('error' in c) return fail(res, t0, 400, 'invalid_request', c.error);
  const capmV = capm(c.rf, c.beta, c.erp, c.market);
  // WACC inputs reuse the body but take cost_of_equity from CAPM.
  const r = readWacc({ ...req.body, cost_of_equity_percent: capmV.cost_of_equity_percent });
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = wacc(r.E, r.D, r.re, r.rd, r.tax);
  respond(res, t0, {
    ...v,
    capm: capmV,
    reasoning: {
      why_result_generated: `CAPM cost of equity ${capmV.cost_of_equity_percent}% (= ${capmV.risk_free_percent}% + β ${capmV.beta} · ERP ${capmV.equity_risk_premium_percent}%), then WACC = ${v.equity_weight}·${v.cost_of_equity_percent}% + ${v.debt_weight}·${v.cost_of_debt_percent}%·(1−${v.tax_rate_percent}%) = ${v.wacc_percent}%.`,
      key_factors: [`WACC ${v.wacc_percent}%.`, `Cost of equity ${v.cost_of_equity_percent}% (CAPM).`, `After-tax cost of debt ${v.after_tax_cost_of_debt_percent}%.`],
      invalidators: INVALIDATORS,
    },
    ...TAIL({ wacc: 1, capm: 1 }, [`Use ${v.wacc_percent}% as the DCF discount rate; chain to dcf-valuation.`]),
  });
});

export default router;
