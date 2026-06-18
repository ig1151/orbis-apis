import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, FINANCIAL_DISCLAIMER, chainTo, round } from '../../_aplus/finance';

// Deterministic fixed-coupon bond analytics. /price values a bond from its yield;
// /yield solves yield-to-maturity from a price (bisection); /lookup adds Macaulay &
// modified duration and convexity. Coupons assumed at period ends, n = round(years ×
// frequency) periods. Pure arithmetic — no LLM, nothing stored.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };
const FREQS = [1, 2, 4, 12];

interface BondBase { face: number; couponRate: number; freq: number; n: number; coupon: number }

function parseBase(body: any): { error: string } | { b: BondBase } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide face, coupon_rate, years_to_maturity, frequency.' };
  const fin = (x: any) => typeof x === 'number' && Number.isFinite(x);
  const face = body.face ?? 1000;
  const couponRate = body.coupon_rate;
  const years = body.years_to_maturity;
  const freq = body.frequency ?? 2;
  if (!fin(face) || face <= 0) return { error: '"face" must be a positive number (default 1000).' };
  if (!fin(couponRate) || couponRate < 0) return { error: '"coupon_rate" must be a non-negative annual percent.' };
  if (!fin(years) || years <= 0) return { error: '"years_to_maturity" must be a positive number.' };
  if (!FREQS.includes(freq)) return { error: `"frequency" must be one of: ${FREQS.join(', ')} (coupons per year).` };
  const n = Math.round(years * freq);
  if (n < 1) return { error: 'years_to_maturity × frequency must be at least 1 period.' };
  const coupon = (face * couponRate / 100) / freq;
  return { b: { face, couponRate, freq, n, coupon } };
}

// Price + risk measures at a per-period yield yPer.
function valueAt(b: BondBase, yPer: number): { price: number; macaulay: number; modified: number; convexity: number } {
  let price = 0, weightedT = 0, conv = 0;
  for (let k = 1; k <= b.n; k++) {
    const cf = b.coupon + (k === b.n ? b.face : 0);
    const disc = cf / Math.pow(1 + yPer, k);
    price += disc;
    weightedT += (k / b.freq) * disc;
    conv += (k * (k + 1) * cf) / Math.pow(1 + yPer, k + 2);
  }
  const macaulay = price > 0 ? weightedT / price : 0;
  const modified = macaulay / (1 + yPer);
  const convexity = price > 0 ? (conv / price) / (b.freq * b.freq) : 0;
  return { price, macaulay, modified, convexity };
}

function solveYield(b: BondBase, target: number): number | null {
  const f = (yPer: number) => valueAt(b, yPer).price - target;
  let lo = -0.5 + 1e-9, hi = 1.0; // per-period yield search band
  let flo = f(lo), fhi = f(hi);
  if (flo === 0) return lo;
  if (flo * fhi > 0) return null; // target price unreachable in band
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2, fmid = f(mid);
    if (Math.abs(fmid) < 1e-9 || (hi - lo) / 2 < 1e-12) return mid;
    if (flo * fmid < 0) hi = mid; else { lo = mid; flo = fmid; }
  }
  return (lo + hi) / 2;
}

export interface PriceCore { face: number; coupon_rate: number; frequency: number; periods: number; yield_percent: number; price: number; current_yield_percent: number }
export interface YieldCore { face: number; coupon_rate: number; frequency: number; periods: number; price: number; yield_to_maturity_percent: number | null; converged: boolean }

const CHAIN_TO = [
  { api: 'npv-irr', reason: 'Treat the coupon + principal cashflows as a series and compute NPV/IRR.' },
  { api: 'risk-ratios', reason: 'Fold the bond return into a portfolio Sharpe/Sortino calculation.' },
];
const INVALIDATORS = [
  'Prices/yields use a flat per-period yield with coupons at period ends and n = round(years × frequency) whole periods — there is no accrued-interest / settlement-date day-count (this is clean price on a coupon date, not dirty price).',
  'yield_rate and coupon_rate are ANNUAL percents; the model converts to per-period by dividing by frequency (a bond-equivalent/nominal convention, not effective annual).',
  'Yield-to-maturity is solved numerically by bisection over a per-period band of roughly -50%..+100%; a target price outside that band returns null (converged=false).',
  'Duration is in YEARS (Macaulay and modified); convexity is in years². Modified duration approximates price sensitivity for small yield moves and degrades for large ones — convexity is the second-order correction.',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, calculation_certainty: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: chainTo(CHAIN_TO), privacy: PRIVACY, execution_metadata: EXECUTION_METADATA, financial_disclaimer: FINANCIAL_DISCLAIMER,
});

const DISCOVERY = {
  name: 'Bond Analytics API', version: '1.0.0',
  description: 'Deterministic fixed-coupon bond analytics. /price values a bond from its yield (+ current yield); /yield solves yield-to-maturity from a price; /lookup adds Macaulay & modified duration and convexity. Clean price on a coupon date. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/bond-analytics/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['bond_pricing', 'yield_to_maturity', 'duration', 'convexity', 'fixed_income'],
  typical_use_cases: ['Price a fixed-coupon bond at a target yield', 'Solve a bond yield to maturity from its market price', 'Estimate rate sensitivity via modified duration and convexity'],
  endpoints: [
    { method: 'POST', path: '/price', summary: 'Bond price from yield', price_usdc: 0.008 },
    { method: 'POST', path: '/yield', summary: 'Yield to maturity from price', price_usdc: 0.01 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL price + duration/convexity + reasoning', price_usdc: 0.015 },
  ],
  pricing: [
    { path: '/price', price_usdc: 0.008, currency: 'USDC' },
    { path: '/yield', price_usdc: 0.01, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.015, currency: 'USDC' },
  ],
  x402_compatible: true,
};

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

router.post('/price', (req: Request, res: Response) => {
  const t0 = Date.now();
  const pb = parseBase(req.body);
  if ('error' in pb) return fail(res, t0, 400, 'invalid_request', pb.error);
  const yr = req.body.yield_rate;
  if (typeof yr !== 'number' || !Number.isFinite(yr) || yr <= -100) return fail(res, t0, 400, 'invalid_request', '"yield_rate" must be an annual percent greater than -100.');
  const yPer = yr / 100 / pb.b.freq;
  const v = valueAt(pb.b, yPer);
  const currentYield = v.price > 0 ? (pb.b.coupon * pb.b.freq) / v.price * 100 : 0;
  const result: PriceCore = { face: pb.b.face, coupon_rate: pb.b.couponRate, frequency: pb.b.freq, periods: pb.b.n, yield_percent: yr, price: round(v.price, 6), current_yield_percent: round(currentYield, 6) };
  const rel = result.price > pb.b.face ? 'at a premium' : result.price < pb.b.face ? 'at a discount' : 'at par';
  respond(res, t0, { ...result, ...TAIL({ price: 1 }, [`Bond prices to ${result.price} (${rel} to face ${pb.b.face}) at a ${yr}% yield.`, 'Call /lookup for duration & convexity before estimating rate risk.']) });
});

router.post('/yield', (req: Request, res: Response) => {
  const t0 = Date.now();
  const pb = parseBase(req.body);
  if ('error' in pb) return fail(res, t0, 400, 'invalid_request', pb.error);
  const price = req.body.price;
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return fail(res, t0, 400, 'invalid_request', '"price" must be a positive number.');
  const yPer = solveYield(pb.b, price);
  const result: YieldCore = { face: pb.b.face, coupon_rate: pb.b.couponRate, frequency: pb.b.freq, periods: pb.b.n, price: round(price, 6), yield_to_maturity_percent: yPer === null ? null : round(yPer * pb.b.freq * 100, 6), converged: yPer !== null };
  respond(res, t0, { ...result, ...TAIL({ yield: 1 }, result.converged ? [`Yield to maturity is ${result.yield_to_maturity_percent}% at a price of ${result.price}.`] : ['Could not solve a yield for that price — check that the price is achievable for this bond.']) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const pb = parseBase(req.body);
  if ('error' in pb) return fail(res, t0, 400, 'invalid_request', pb.error);
  const yr = req.body.yield_rate;
  if (typeof yr !== 'number' || !Number.isFinite(yr) || yr <= -100) return fail(res, t0, 400, 'invalid_request', '"yield_rate" must be an annual percent greater than -100.');
  const yPer = yr / 100 / pb.b.freq;
  const v = valueAt(pb.b, yPer);
  const currentYield = v.price > 0 ? (pb.b.coupon * pb.b.freq) / v.price * 100 : 0;
  respond(res, t0, {
    face: pb.b.face, coupon_rate: pb.b.couponRate, frequency: pb.b.freq, periods: pb.b.n, yield_percent: yr,
    price: round(v.price, 6), current_yield_percent: round(currentYield, 6),
    macaulay_duration_years: round(v.macaulay, 6), modified_duration_years: round(v.modified, 6), convexity_years2: round(v.convexity, 6),
    reasoning: {
      why_result_generated: `Discounted ${pb.b.n} period(s) of coupons (${round(pb.b.coupon, 6)} each) + face ${pb.b.face} at a ${yr}% annual yield (${round(yPer * 100, 6)}% per period).`,
      key_factors: [
        `Price ${round(v.price, 6)} vs face ${pb.b.face}.`,
        `Modified duration ${round(v.modified, 6)} yr — a +1% yield move ≈ ${round(-v.modified, 4)}% price change (before convexity).`,
        `Convexity ${round(v.convexity, 6)} yr².`,
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL({ price: 1, yield: 1 }, [`Hold/trade decision: modified duration ${round(v.modified, 4)} yr sets the rate sensitivity.`]),
  });
});

export default router;
