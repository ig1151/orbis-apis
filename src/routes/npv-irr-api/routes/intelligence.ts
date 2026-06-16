import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, FINANCIAL_DISCLAIMER, npv as npvCalc, irr as irrCalc, round } from '../../_aplus/finance';

// Deterministic NPV / IRR calculator for a cashflow series. /npv discounts a series
// at a given per-period rate; /irr finds the per-period rate that zeroes NPV via a
// bracket scan + bisection. Pure arithmetic — no LLM, nothing stored.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };
const MAX_FLOWS = 1200;

function parseFlows(body: any): { error: string } | { flows: number[] } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with a "cashflows" array (index 0 = today).' };
  const cf = body.cashflows;
  if (!Array.isArray(cf) || cf.length < 2) return { error: '"cashflows" must be an array of at least 2 numbers (index 0 = t=0).' };
  if (cf.length > MAX_FLOWS) return { error: `"cashflows" exceeds the ${MAX_FLOWS}-period limit.` };
  for (let i = 0; i < cf.length; i++) if (typeof cf[i] !== 'number' || !Number.isFinite(cf[i])) return { error: `cashflows[${i}] must be a finite number.` };
  return { flows: cf };
}

export interface NpvCore { rate_percent: number; period_count: number; cashflow_total: number; npv: number }
export interface IrrCore { period_count: number; cashflow_total: number; irr_percent: number | null; converged: boolean; npv_at_irr: number | null; sign_changes: number }

function signChanges(cf: number[]): number {
  let n = 0, prev = 0;
  for (const x of cf) { const s = Math.sign(x); if (s !== 0) { if (prev !== 0 && s !== prev) n++; prev = s; } }
  return n;
}

function doNpv(body: any): { error: string } | { result: NpvCore } {
  const p = parseFlows(body);
  if ('error' in p) return p;
  if (typeof body.rate !== 'number' || !Number.isFinite(body.rate)) return { error: '"rate" must be a finite number (per-period percent, e.g. 8 for 8%).' };
  if (body.rate <= -100) return { error: '"rate" must be greater than -100 percent.' };
  const r = body.rate / 100;
  return { result: { rate_percent: body.rate, period_count: p.flows.length, cashflow_total: round(p.flows.reduce((a, b) => a + b, 0), 6), npv: round(npvCalc(r, p.flows), 6) } };
}

function doIrr(body: any): { error: string } | { result: IrrCore } {
  const p = parseFlows(body);
  if ('error' in p) return p;
  const r = irrCalc(p.flows);
  return {
    result: {
      period_count: p.flows.length,
      cashflow_total: round(p.flows.reduce((a, b) => a + b, 0), 6),
      irr_percent: r === null ? null : round(r * 100, 6),
      converged: r !== null,
      npv_at_irr: r === null ? null : round(npvCalc(r, p.flows), 6),
      sign_changes: signChanges(p.flows),
    },
  };
}

const CHAIN_TO = [
  { api: 'dcf-valuation', reason: 'Discount a projected free-cash-flow stream into an enterprise value with a terminal value.' },
  { api: 'bond-analytics', reason: 'Price a fixed-coupon bond or solve its yield to maturity.' },
];
const INVALIDATORS = [
  'NPV is exact arithmetic at the rate you supply; it changes with the discount rate and the timing/sign of each cashflow (index 0 is treated as today, t=0, and is NOT discounted).',
  'IRR is found numerically (bracket scan + bisection). A series with no sign change has NO real IRR (returns null); a series with multiple sign changes may have multiple IRRs and only the first bracketed root is returned — check sign_changes and prefer NPV at your cost of capital for the decision.',
  'Rates are per PERIOD, not annualized — if your cashflows are monthly, supply a monthly rate and read IRR as a monthly rate.',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA, financial_disclaimer: FINANCIAL_DISCLAIMER,
});

const DISCOVERY = {
  name: 'NPV / IRR API', version: '1.0.0',
  description: 'Deterministic net-present-value and internal-rate-of-return calculator for a cashflow series. /npv discounts cashflows at a per-period rate; /irr solves the rate that zeroes NPV (bracket scan + bisection). Per-period rates, index 0 = today. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/npv-irr/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['npv', 'irr', 'cashflow_analysis', 'discounting', 'capital_budgeting'],
  endpoints: [
    { method: 'POST', path: '/npv', summary: 'Net present value at a per-period rate', price_usdc: 0.006 },
    { method: 'POST', path: '/irr', summary: 'Internal rate of return of a cashflow series', price_usdc: 0.008 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL NPV + IRR + reasoning', price_usdc: 0.012 },
  ],
  pricing: [
    { path: '/npv', price_usdc: 0.006, currency: 'USDC' },
    { path: '/irr', price_usdc: 0.008, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
  ],
  x402_compatible: true,
};

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

router.post('/npv', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = doNpv(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, { ...v, ...TAIL({ npv: 1 }, [v.npv >= 0 ? `NPV is positive (${v.npv}) at ${v.rate_percent}% — the series creates value at this rate.` : `NPV is negative (${v.npv}) at ${v.rate_percent}% — the series destroys value at this rate.`, 'Solve /irr to find the breakeven rate.']) });
});

router.post('/irr', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = doIrr(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, { ...v, ...TAIL({ irr: 1 }, v.converged
    ? [`IRR is ${v.irr_percent}% per period — accept if it exceeds your cost of capital.`, ...(v.sign_changes > 1 ? ['Multiple sign changes detected — verify against NPV; more than one IRR may exist.'] : [])]
    : ['No real IRR (no sign change in the cashflows) — use /npv at your cost of capital instead.']) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parseFlows(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const hasRate = typeof req.body.rate === 'number' && Number.isFinite(req.body.rate);
  const irrR = doIrr(req.body) as { result: IrrCore };
  const npvR = hasRate ? (doNpv(req.body) as { result: NpvCore } | { error: string }) : null;
  const npvOut = npvR && 'result' in npvR ? npvR.result : null;
  respond(res, t0, {
    period_count: irrR.result.period_count,
    cashflow_total: irrR.result.cashflow_total,
    npv: npvOut ? npvOut.npv : null,
    rate_percent: npvOut ? npvOut.rate_percent : null,
    irr_percent: irrR.result.irr_percent,
    converged: irrR.result.converged,
    sign_changes: irrR.result.sign_changes,
    reasoning: {
      why_result_generated: `Computed IRR by bracket-scan + bisection over ${irrR.result.period_count} period(s)${hasRate ? ` and NPV at ${npvOut!.rate_percent}%` : ''}.`,
      key_factors: [
        `IRR: ${irrR.result.irr_percent === null ? 'none (no sign change)' : irrR.result.irr_percent + '% per period'}.`,
        hasRate ? `NPV at ${npvOut!.rate_percent}%: ${npvOut!.npv}.` : 'No rate supplied — NPV not computed.',
        `Sign changes: ${irrR.result.sign_changes}.`,
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL({ npv: hasRate ? 1 : 0, irr: 1 }, irrR.result.converged
      ? [`Compare the ${irrR.result.irr_percent}% IRR to your hurdle rate; accept if it clears.`]
      : ['No real IRR — decide on NPV at your cost of capital.']),
  });
});

export default router;
