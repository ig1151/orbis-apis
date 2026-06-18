import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, FINANCIAL_DISCLAIMER, chainTo, round, npv } from '../../_aplus/finance';

// Deterministic capital-budgeting payback analysis. /simple finds how many periods of
// (undiscounted) cashflows it takes to recover an upfront investment; /discounted does
// the same on present-valued cashflows and also returns NPV. Pure arithmetic — no LLM,
// nothing stored. cashflows[k] is the inflow in period k+1.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };
function numField(v: unknown): number | undefined { return typeof v === 'number' && Number.isFinite(v) ? v : undefined; }

// Fractional payback period (or null if never recovered). flows[k] = period k+1 inflow.
function paybackOf(outlay: number, flows: number[]): number | null {
  let cum = 0;
  for (let k = 0; k < flows.length; k++) {
    const before = cum;
    cum += flows[k];
    if (cum >= outlay) {
      const need = outlay - before;
      const frac = flows[k] > 0 ? need / flows[k] : 0;
      return round(k + frac, 6);
    }
  }
  return null;
}

export interface SimpleCore {
  initial_investment: number; periods: number; total_inflows: number;
  payback_periods: number | null; recovered: boolean; payback_years: number | null;
}
export interface DiscountedCore {
  initial_investment: number; discount_rate_percent: number; periods: number;
  discounted_payback_periods: number | null; recovered: boolean; payback_years: number | null;
  npv: number; profitability_index: number | null;
}

function simple(outlay: number, flows: number[], ppy: number | undefined): SimpleCore {
  const pb = paybackOf(outlay, flows);
  return {
    initial_investment: outlay, periods: flows.length, total_inflows: round(flows.reduce((a, b) => a + b, 0), 6),
    payback_periods: pb, recovered: pb !== null,
    payback_years: pb !== null && ppy ? round(pb / ppy, 6) : null,
  };
}

function discounted(outlay: number, flows: number[], ratePct: number, ppy: number | undefined): DiscountedCore {
  const r = ratePct / 100;
  const disc = flows.map((f, k) => f / Math.pow(1 + r, k + 1));
  const pb = paybackOf(outlay, disc);
  const pvInflows = disc.reduce((a, b) => a + b, 0);
  const npvVal = npv(r, [-outlay, ...flows]);
  return {
    initial_investment: outlay, discount_rate_percent: ratePct, periods: flows.length,
    discounted_payback_periods: pb, recovered: pb !== null,
    payback_years: pb !== null && ppy ? round(pb / ppy, 6) : null,
    npv: round(npvVal, 6),
    profitability_index: outlay > 0 ? round(pvInflows / outlay, 6) : null,
  };
}

function readBase(b: any): { error: string } | { outlay: number; flows: number[]; ppy?: number } {
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return { error: 'Provide initial_investment and a cashflows array.' };
  const outlay = numField(b.initial_investment);
  if (outlay === undefined || outlay <= 0) return { error: '"initial_investment" must be a positive number (the upfront outlay).' };
  if (!Array.isArray(b.cashflows) || b.cashflows.length < 1) return { error: '"cashflows" must be a non-empty array of per-period inflows.' };
  const flows: number[] = [];
  for (const x of b.cashflows) { const n = numField(x); if (n === undefined) return { error: 'Every entry in "cashflows" must be a finite number.' }; flows.push(n); }
  let ppy: number | undefined; if (b.periods_per_year !== undefined) { const p = numField(b.periods_per_year); if (p === undefined || p <= 0) return { error: '"periods_per_year" must be a positive number.' }; ppy = p; }
  return { outlay, flows, ppy };
}

function readDiscounted(b: any): { error: string } | { outlay: number; flows: number[]; rate: number; ppy?: number } {
  const base = readBase(b);
  if ('error' in base) return base;
  const rate = numField(b.discount_rate_percent);
  if (rate === undefined || rate <= -100) return { error: '"discount_rate_percent" must be a number greater than -100.' };
  return { ...base, rate };
}

const CHAIN_TO = [
  { api: 'npv-irr', reason: 'Get the full NPV and IRR of the same cashflow series for an accept/reject decision.' },
  { api: 'dcf-valuation', reason: 'Value the project as a discounted cashflow stream.' },
];
const INVALIDATORS = [
  'Payback ignores all cashflows AFTER recovery and (for the simple variant) the time value of money — a shorter payback is not automatically the better investment; use NPV/IRR for the accept/reject decision.',
  'cashflows[k] is the inflow in period k+1; the initial outlay is a separate positive initial_investment, not the first array element.',
  'A null payback means the cumulative (or discounted) inflows never reach the initial investment within the periods supplied.',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, calculation_certainty: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: chainTo(CHAIN_TO), privacy: PRIVACY, execution_metadata: EXECUTION_METADATA, financial_disclaimer: FINANCIAL_DISCLAIMER,
});

export const DISCOVERY = {
  name: 'Payback Period API', version: '1.0.0',
  description: 'Deterministic capital-budgeting payback analysis. /simple computes the undiscounted payback period; /discounted present-values the cashflows, returns the discounted payback, NPV and profitability index. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/payback-period/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['simple_payback', 'discounted_payback', 'npv', 'profitability_index'],
  typical_use_cases: [
    'Compute how many periods a capital project takes to recoup its upfront cost',
    'Discount the cashflows and find the time-value-adjusted payback',
    'Compare payback against NPV before approving an investment',
  ],
  input_examples: [
    { endpoint: '/simple', body: { initial_investment: 100000, cashflows: [30000, 30000, 30000, 30000, 30000], periods_per_year: 1 } },
    { endpoint: '/discounted', body: { initial_investment: 100000, cashflows: [30000, 30000, 30000, 30000, 30000], discount_rate_percent: 10, periods_per_year: 1 } },
  ],
  output_examples: [
    { endpoint: '/simple', response: { payback_periods: 3.3333, recovered: true } },
    { endpoint: '/discounted', response: { discounted_payback_periods: 4.2543, npv: 13723.6, profitability_index: 1.137236 } },
  ],
  endpoints: [
    { method: 'POST', path: '/simple', summary: 'Undiscounted payback period', price_usdc: 0.007 },
    { method: 'POST', path: '/discounted', summary: 'Discounted payback + NPV + profitability index', price_usdc: 0.008 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL simple + discounted payback + reasoning', price_usdc: 0.013 },
  ],
  pricing: [
    { path: '/simple', price_usdc: 0.007, currency: 'USDC' },
    { path: '/discounted', price_usdc: 0.008, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.013, currency: 'USDC' },
  ],
  x402_compatible: true,
};

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

router.post('/simple', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = readBase(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = simple(r.outlay, r.flows, r.ppy);
  respond(res, t0, { ...v, ...TAIL({ simple: 1 }, [v.recovered ? `Recovers the $${v.initial_investment} outlay in ${v.payback_periods} periods.` : `Does not recover the $${v.initial_investment} outlay within ${v.periods} periods.`]) });
});

router.post('/discounted', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = readDiscounted(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = discounted(r.outlay, r.flows, r.rate, r.ppy);
  respond(res, t0, { ...v, ...TAIL({ discounted: 1 }, [v.recovered ? `Discounted payback ${v.discounted_payback_periods} periods at ${v.discount_rate_percent}%; NPV $${v.npv}.` : `Discounted inflows never recover the outlay at ${v.discount_rate_percent}%; NPV $${v.npv}.`]) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = readDiscounted(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const s = simple(r.outlay, r.flows, r.ppy);
  const d = discounted(r.outlay, r.flows, r.rate, r.ppy);
  respond(res, t0, {
    ...s, discounted: d,
    reasoning: {
      why_result_generated: `Simple payback ${s.payback_periods ?? 'never'} periods (cumulative inflows vs the $${s.initial_investment} outlay); discounted payback ${d.discounted_payback_periods ?? 'never'} periods at ${d.discount_rate_percent}% with NPV $${d.npv}.`,
      key_factors: [
        `Simple payback ${s.payback_periods ?? 'not recovered'}.`,
        `Discounted payback ${d.discounted_payback_periods ?? 'not recovered'} at ${d.discount_rate_percent}%.`,
        `NPV $${d.npv} (profitability index ${d.profitability_index}).`,
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL({ simple: 1, discounted: 1 }, [
      d.npv >= 0 ? `NPV is positive ($${d.npv}) — accept on a value basis; chain to npv-irr for the IRR.` : `NPV is negative ($${d.npv}) — reject on a value basis despite payback; chain to npv-irr.`,
    ]),
  });
});

export default router;
