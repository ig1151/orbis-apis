import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, FINANCIAL_DISCLAIMER, chainTo, round } from '../../_aplus/finance';

// Deterministic compound-interest math. /future-value grows a principal plus optional
// periodic contributions at a nominal annual rate compounded m times per year;
// /effective-rate converts a nominal annual rate to its effective annual rate (APY).
// Pure arithmetic — no LLM, nothing stored.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };

function numField(v: unknown): number | undefined { return typeof v === 'number' && Number.isFinite(v) ? v : undefined; }

export interface FvCore {
  principal: number; annual_rate_percent: number; years: number; compounds_per_year: number; periods: number;
  contribution: number; contribution_timing: 'end' | 'begin';
  future_value: number; total_contributions: number; total_deposited: number; total_interest: number;
  effective_annual_rate_percent: number;
}
export interface EarCore {
  nominal_annual_rate_percent: number; compounds_per_year: number; period_rate_percent: number; effective_annual_rate_percent: number;
}

function futureValue(principal: number, annualPct: number, years: number, m: number, contribution: number, timing: 'end' | 'begin'): FvCore {
  const i = annualPct / 100 / m;
  const n = years * m;
  const growth = Math.pow(1 + i, n);
  const fvPrincipal = principal * growth;
  let fvContrib: number;
  if (i === 0) fvContrib = contribution * n;
  else fvContrib = contribution * ((growth - 1) / i) * (timing === 'begin' ? 1 + i : 1);
  const fv = fvPrincipal + fvContrib;
  const totalContrib = contribution * n;
  const ear = (Math.pow(1 + i, m) - 1) * 100;
  return {
    principal, annual_rate_percent: annualPct, years, compounds_per_year: m, periods: round(n, 6),
    contribution, contribution_timing: timing,
    future_value: round(fv, 2), total_contributions: round(totalContrib, 2), total_deposited: round(principal + totalContrib, 2),
    total_interest: round(fv - principal - totalContrib, 2), effective_annual_rate_percent: round(ear, 6),
  };
}

function effectiveRate(nominalPct: number, m: number): EarCore {
  const i = nominalPct / 100 / m;
  return {
    nominal_annual_rate_percent: nominalPct, compounds_per_year: m,
    period_rate_percent: round(i * 100, 6), effective_annual_rate_percent: round((Math.pow(1 + i, m) - 1) * 100, 6),
  };
}

function readFv(b: any): { error: string } | { principal: number; rate: number; years: number; m: number; contribution: number; timing: 'end' | 'begin' } {
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return { error: 'Provide principal, annual_rate_percent and years.' };
  const principal = numField(b.principal); const rate = numField(b.annual_rate_percent); const years = numField(b.years);
  if (principal === undefined || principal < 0) return { error: '"principal" must be a non-negative number.' };
  if (rate === undefined) return { error: '"annual_rate_percent" must be a finite number.' };
  if (years === undefined || years <= 0) return { error: '"years" must be greater than 0.' };
  const m = b.compounds_per_year ?? 12;
  if (typeof m !== 'number' || !Number.isInteger(m) || m <= 0) return { error: '"compounds_per_year" must be a positive integer (default 12).' };
  let contribution = 0;
  if (b.contribution !== undefined) { const c = numField(b.contribution); if (c === undefined || c < 0) return { error: '"contribution" must be a non-negative number.' }; contribution = c; }
  let timing: 'end' | 'begin' = 'end';
  if (b.contribution_timing !== undefined) { if (b.contribution_timing !== 'end' && b.contribution_timing !== 'begin') return { error: '"contribution_timing" must be "end" or "begin".' }; timing = b.contribution_timing; }
  return { principal, rate, years, m, contribution, timing };
}

const CHAIN_TO = [
  { api: 'returns-analytics', reason: 'Convert a realized value series into CAGR/total return.' },
  { api: 'dcf-valuation', reason: 'Discount future cashflows back to present value.' },
];
const INVALIDATORS = [
  'annual_rate_percent is a NOMINAL annual rate compounded compounds_per_year times; the effective annual rate (APY) is (1 + rate/m)^m − 1 and exceeds the nominal rate whenever m > 1.',
  'Contributions form an ordinary annuity (end of period) by default; set contribution_timing:"begin" for an annuity-due (each deposit earns one extra period). total_interest = future_value − principal − total_contributions.',
  'No taxes, fees or inflation are modeled and the rate is assumed constant; results are nominal future dollars. Use a real (inflation-adjusted) rate if you need real purchasing power.',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, calculation_certainty: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: chainTo(CHAIN_TO), privacy: PRIVACY, execution_metadata: EXECUTION_METADATA, financial_disclaimer: FINANCIAL_DISCLAIMER,
});

export const DISCOVERY = {
  name: 'Compound Interest API', version: '1.0.0',
  description: 'Deterministic compound-interest math. /future-value grows a principal plus optional periodic contributions at a nominal annual rate compounded m times per year; /effective-rate converts a nominal annual rate to its effective annual rate (APY). No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/compound-interest/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['future_value', 'compound_growth', 'annuity', 'effective_annual_rate', 'apr_to_apy'],
  typical_use_cases: [
    'Project the future value of savings with regular monthly contributions',
    'Convert a nominal APR into its effective annual yield (APY)',
    'Estimate total interest earned on an investment over a horizon',
  ],
  input_examples: [
    { endpoint: '/future-value', body: { principal: 10000, annual_rate_percent: 6, years: 10, compounds_per_year: 12, contribution: 200 } },
    { endpoint: '/effective-rate', body: { nominal_annual_rate_percent: 6, compounds_per_year: 12 } },
  ],
  output_examples: [
    { endpoint: '/future-value', response: { future_value: 50969.84, total_deposited: 34000, total_interest: 16969.84, effective_annual_rate_percent: 6.167781 } },
    { endpoint: '/effective-rate', response: { nominal_annual_rate_percent: 6, compounds_per_year: 12, effective_annual_rate_percent: 6.167781 } },
  ],
  endpoints: [
    { method: 'POST', path: '/future-value', summary: 'Future value of principal + contributions', price_usdc: 0.007 },
    { method: 'POST', path: '/effective-rate', summary: 'Nominal annual rate → effective annual rate (APY)', price_usdc: 0.005 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL future value + EAR + reasoning', price_usdc: 0.012 },
  ],
  pricing: [
    { path: '/future-value', price_usdc: 0.007, currency: 'USDC' },
    { path: '/effective-rate', price_usdc: 0.005, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
  ],
  x402_compatible: true,
};

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

router.post('/future-value', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = readFv(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = futureValue(r.principal, r.rate, r.years, r.m, r.contribution, r.timing);
  respond(res, t0, { ...v, ...TAIL({ future_value: 1 }, [`Future value ${v.future_value} after ${v.years}y; ${v.total_interest} interest on ${v.total_deposited} deposited.`]) });
});

router.post('/effective-rate', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide nominal_annual_rate_percent and compounds_per_year.');
  const rate = numField(b.nominal_annual_rate_percent);
  if (rate === undefined) return fail(res, t0, 400, 'invalid_request', '"nominal_annual_rate_percent" must be a finite number.');
  const m = b.compounds_per_year ?? 12;
  if (typeof m !== 'number' || !Number.isInteger(m) || m <= 0) return fail(res, t0, 400, 'invalid_request', '"compounds_per_year" must be a positive integer (default 12).');
  const v = effectiveRate(rate, m);
  respond(res, t0, { ...v, ...TAIL({ effective_rate: 1 }, [`Nominal ${rate}% compounded ${m}×/yr ⇒ effective ${v.effective_annual_rate_percent}% APY.`]) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = readFv(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = futureValue(r.principal, r.rate, r.years, r.m, r.contribution, r.timing);
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Grew ${v.principal} at ${v.annual_rate_percent}% nominal compounded ${v.compounds_per_year}×/yr for ${v.years}y (${v.periods} periods)${v.contribution ? ` with ${v.contribution}/period contributions (${v.contribution_timing}-of-period)` : ''} → ${v.future_value}.`,
      key_factors: [`Future value ${v.future_value}.`, `Total deposited ${v.total_deposited}, interest ${v.total_interest}.`, `Effective annual rate ${v.effective_annual_rate_percent}% APY.`],
      invalidators: INVALIDATORS,
    },
    ...TAIL({ future_value: 1 }, [`Future value ${v.future_value} (APY ${v.effective_annual_rate_percent}%); interest ${v.total_interest} on ${v.total_deposited} deposited.`]),
  });
});

export default router;
