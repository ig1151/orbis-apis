import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, FINANCIAL_DISCLAIMER, chainTo, round } from '../../_aplus/finance';

// Deterministic discounted-cash-flow valuation. Discounts a projected free-cash-flow
// stream (years 1..n) at a discount rate and adds a Gordon-growth terminal value
// (optional). Optionally nets debt and divides by shares for an equity value /
// per-share value. Pure arithmetic — no LLM, nothing stored.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };
const MAX_YEARS = 200;

interface DcfInput { cf: number[]; r: number; g: number | null; netDebt: number | null; shares: number | null }

function parse(body: any): { error: string } | { i: DcfInput } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide "cashflows" (years 1..n) and "discount_rate".' };
  const cf = body.cashflows;
  const fin = (x: any) => typeof x === 'number' && Number.isFinite(x);
  if (!Array.isArray(cf) || cf.length < 1) return { error: '"cashflows" must be a non-empty array of projected free cash flows (year 1..n).' };
  if (cf.length > MAX_YEARS) return { error: `"cashflows" exceeds the ${MAX_YEARS}-year limit.` };
  for (let k = 0; k < cf.length; k++) if (!fin(cf[k])) return { error: `cashflows[${k}] must be a finite number.` };
  if (!fin(body.discount_rate)) return { error: '"discount_rate" must be a number (annual percent).' };
  if (body.discount_rate <= -100) return { error: '"discount_rate" must be greater than -100 percent.' };
  const g = body.terminal_growth_rate;
  if (g !== undefined && !fin(g)) return { error: '"terminal_growth_rate" must be a number when provided.' };
  if (g !== undefined && g / 100 >= body.discount_rate / 100) return { error: 'terminal_growth_rate must be strictly less than discount_rate for a finite Gordon terminal value.' };
  const netDebt = body.net_debt;
  if (netDebt !== undefined && !fin(netDebt)) return { error: '"net_debt" must be a number when provided.' };
  const shares = body.shares_outstanding;
  if (shares !== undefined && (!fin(shares) || shares <= 0)) return { error: '"shares_outstanding" must be a positive number when provided.' };
  return { i: { cf, r: body.discount_rate / 100, g: g === undefined ? null : g / 100, netDebt: netDebt === undefined ? null : netDebt, shares: shares === undefined ? null : shares } };
}

export interface DcfCore {
  years: number; discount_rate_percent: number; terminal_growth_percent: number | null;
  pv_explicit: number; terminal_value: number; pv_terminal: number; enterprise_value: number;
  equity_value: number | null; value_per_share: number | null;
}

function compute(i: DcfInput): DcfCore {
  const n = i.cf.length;
  let pvExplicit = 0;
  for (let t = 1; t <= n; t++) pvExplicit += i.cf[t - 1] / Math.pow(1 + i.r, t);
  let terminalValue = 0, pvTerminal = 0;
  if (i.g !== null) {
    terminalValue = (i.cf[n - 1] * (1 + i.g)) / (i.r - i.g);
    pvTerminal = terminalValue / Math.pow(1 + i.r, n);
  }
  const ev = pvExplicit + pvTerminal;
  const equity = i.netDebt === null ? null : ev - i.netDebt;
  const perShare = equity === null || i.shares === null ? null : equity / i.shares;
  return {
    years: n, discount_rate_percent: round(i.r * 100, 6), terminal_growth_percent: i.g === null ? null : round(i.g * 100, 6),
    pv_explicit: round(pvExplicit, 6), terminal_value: round(terminalValue, 6), pv_terminal: round(pvTerminal, 6), enterprise_value: round(ev, 6),
    equity_value: equity === null ? null : round(equity, 6), value_per_share: perShare === null ? null : round(perShare, 6),
  };
}

const CHAIN_TO = [
  { api: 'npv-irr', reason: 'Compute the IRR of the same projected cashflow stream.' },
  { api: 'risk-ratios', reason: 'Assess the risk-adjusted return of the valued asset in a portfolio.' },
];
const INVALIDATORS = [
  'Cashflows are discounted as YEAR-END amounts (year 1..n) at a flat annual discount rate; there is no mid-year convention. A terminal value is added only when terminal_growth_rate is supplied (Gordon growth on the final year).',
  'The Gordon terminal value requires discount_rate > terminal_growth_rate and is extremely sensitive near r≈g — a small change in either input can swing enterprise value dramatically (see the /lookup sensitivity grid).',
  'enterprise_value is pre-capital-structure; equity_value subtracts net_debt and value_per_share divides by shares_outstanding only when you supply them. Results are only as good as the projected free cash flows you provide.',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, calculation_certainty: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: chainTo(CHAIN_TO), privacy: PRIVACY, execution_metadata: EXECUTION_METADATA, financial_disclaimer: FINANCIAL_DISCLAIMER,
});

const DISCOVERY = {
  name: 'DCF Valuation API', version: '1.0.0',
  description: 'Deterministic discounted-cash-flow valuation. Discounts projected free cash flows (years 1..n) at a discount rate and adds an optional Gordon-growth terminal value; optionally nets debt and divides by shares for equity / per-share value. /lookup adds a discount-rate sensitivity grid. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/dcf-valuation/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['dcf', 'valuation', 'enterprise_value', 'terminal_value', 'equity_value'],
  typical_use_cases: ['Value a company from projected free cash flows', 'Derive an implied per-share value net of debt', 'Stress-test enterprise value across discount rates'],
  endpoints: [
    { method: 'POST', path: '/value', summary: 'Enterprise / equity value from projected FCF', price_usdc: 0.01 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL valuation + sensitivity + reasoning', price_usdc: 0.016 },
  ],
  pricing: [
    { path: '/value', price_usdc: 0.01, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.016, currency: 'USDC' },
  ],
  x402_compatible: true,
};

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

router.post('/value', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parse(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const v = compute(p.i);
  respond(res, t0, { ...v, ...TAIL({ valuation: 1 }, [
    `Enterprise value is ${v.enterprise_value} (${v.pv_explicit} explicit + ${v.pv_terminal} terminal).`,
    ...(v.value_per_share !== null ? [`Implied value per share: ${v.value_per_share}.`] : ['Provide net_debt + shares_outstanding for an equity and per-share value.']),
  ]) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parse(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const v = compute(p.i);
  // Discount-rate sensitivity: ±1pp and ±2pp around the chosen rate.
  const grid = [-2, -1, 0, 1, 2].map((d) => {
    const rate = p.i.r * 100 + d;
    if (rate <= -100 || (p.i.g !== null && p.i.g >= rate / 100)) return { discount_rate_percent: round(rate, 4), enterprise_value: null as number | null };
    const ev = compute({ ...p.i, r: rate / 100 }).enterprise_value;
    return { discount_rate_percent: round(rate, 4), enterprise_value: ev };
  });
  respond(res, t0, {
    ...v,
    discount_rate_sensitivity: grid,
    reasoning: {
      why_result_generated: `Discounted ${v.years} year(s) of free cash flow at ${v.discount_rate_percent}%${v.terminal_growth_percent !== null ? ` with a ${v.terminal_growth_percent}% Gordon terminal value` : ' with no terminal value'}.`,
      key_factors: [
        `Enterprise value ${v.enterprise_value} = ${v.pv_explicit} explicit + ${v.pv_terminal} terminal.`,
        v.terminal_growth_percent !== null ? `Terminal value is ${v.pv_terminal} of EV (${round((v.pv_terminal / (v.enterprise_value || 1)) * 100, 1)}%).` : 'No terminal value (finite horizon).',
        v.value_per_share !== null ? `Value per share ${v.value_per_share}.` : 'Equity/per-share not computed (net_debt/shares not supplied).',
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL({ valuation: 1 }, [
      `Use enterprise value ${v.enterprise_value}; check the sensitivity grid — terminal value drives ${v.terminal_growth_percent !== null ? round((v.pv_terminal / (v.enterprise_value || 1)) * 100, 0) + '%' : '0%'} of it.`,
    ]),
  });
});

export default router;
