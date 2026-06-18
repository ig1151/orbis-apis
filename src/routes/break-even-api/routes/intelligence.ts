import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, FINANCIAL_DISCLAIMER, chainTo, round } from '../../_aplus/finance';

// Deterministic cost-volume-profit (break-even) analysis. /units does unit-based CVP
// (break-even units & revenue, contribution margin, target-profit units, margin of
// safety); /revenue does ratio-based CVP for service businesses that price by revenue,
// not units. Pure arithmetic — no LLM, nothing stored.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };
function numField(v: unknown): number | undefined { return typeof v === 'number' && Number.isFinite(v) ? v : undefined; }

export interface UnitsCore {
  fixed_costs: number; price_per_unit: number; variable_cost_per_unit: number;
  contribution_margin_per_unit: number; contribution_margin_ratio: number;
  break_even_units: number; break_even_revenue: number;
  target_profit: number; target_profit_units: number; target_profit_revenue: number;
  current_units: number | null; margin_of_safety_units: number | null; margin_of_safety_percent: number | null;
}
export interface RevenueCore {
  fixed_costs: number; contribution_margin_ratio: number;
  break_even_revenue: number; target_profit: number; target_profit_revenue: number;
  current_revenue: number | null; margin_of_safety_revenue: number | null; margin_of_safety_percent: number | null;
}

function unitsCvp(fixed: number, price: number, vc: number, targetProfit: number, currentUnits: number | undefined): UnitsCore {
  const cm = price - vc;
  const cmr = price === 0 ? 0 : cm / price;
  const beUnits = cm <= 0 ? Infinity : fixed / cm;
  const beRev = beUnits * price;
  const tpUnits = cm <= 0 ? Infinity : (fixed + targetProfit) / cm;
  let mosUnits: number | null = null, mosPct: number | null = null;
  if (currentUnits !== undefined) {
    mosUnits = currentUnits - beUnits;
    mosPct = currentUnits === 0 ? null : round((mosUnits / currentUnits) * 100, 4);
  }
  return {
    fixed_costs: fixed, price_per_unit: price, variable_cost_per_unit: vc,
    contribution_margin_per_unit: round(cm, 6), contribution_margin_ratio: round(cmr, 6),
    break_even_units: Number.isFinite(beUnits) ? round(beUnits, 4) : beUnits,
    break_even_revenue: Number.isFinite(beRev) ? round(beRev, 2) : beRev,
    target_profit: targetProfit,
    target_profit_units: Number.isFinite(tpUnits) ? round(tpUnits, 4) : tpUnits,
    target_profit_revenue: Number.isFinite(tpUnits) ? round(tpUnits * price, 2) : tpUnits,
    current_units: currentUnits ?? null,
    margin_of_safety_units: mosUnits === null ? null : round(mosUnits, 4),
    margin_of_safety_percent: mosPct,
  };
}

function revenueCvp(fixed: number, cmr: number, targetProfit: number, currentRevenue: number | undefined): RevenueCore {
  const beRev = cmr <= 0 ? Infinity : fixed / cmr;
  const tpRev = cmr <= 0 ? Infinity : (fixed + targetProfit) / cmr;
  let mosRev: number | null = null, mosPct: number | null = null;
  if (currentRevenue !== undefined) {
    mosRev = currentRevenue - beRev;
    mosPct = currentRevenue === 0 ? null : round((mosRev / currentRevenue) * 100, 4);
  }
  return {
    fixed_costs: fixed, contribution_margin_ratio: round(cmr, 6),
    break_even_revenue: Number.isFinite(beRev) ? round(beRev, 2) : beRev,
    target_profit: targetProfit, target_profit_revenue: Number.isFinite(tpRev) ? round(tpRev, 2) : tpRev,
    current_revenue: currentRevenue ?? null,
    margin_of_safety_revenue: mosRev === null ? null : round(mosRev, 2),
    margin_of_safety_percent: mosPct,
  };
}

function readUnits(b: any): { error: string } | { fixed: number; price: number; vc: number; tp: number; cur?: number } {
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return { error: 'Provide fixed_costs, price_per_unit and variable_cost_per_unit.' };
  const fixed = numField(b.fixed_costs), price = numField(b.price_per_unit), vc = numField(b.variable_cost_per_unit);
  if (fixed === undefined || fixed < 0) return { error: '"fixed_costs" must be a non-negative number.' };
  if (price === undefined || price <= 0) return { error: '"price_per_unit" must be a positive number.' };
  if (vc === undefined || vc < 0) return { error: '"variable_cost_per_unit" must be a non-negative number.' };
  if (vc >= price) return { error: 'variable_cost_per_unit must be less than price_per_unit (contribution margin would be ≤ 0, so there is no break-even).' };
  let tp = 0; if (b.target_profit !== undefined) { const t = numField(b.target_profit); if (t === undefined || t < 0) return { error: '"target_profit" must be a non-negative number.' }; tp = t; }
  let cur: number | undefined; if (b.current_units !== undefined) { const c = numField(b.current_units); if (c === undefined || c < 0) return { error: '"current_units" must be a non-negative number.' }; cur = c; }
  return { fixed, price, vc, tp, cur };
}

function readRevenue(b: any): { error: string } | { fixed: number; cmr: number; tp: number; cur?: number } {
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return { error: 'Provide fixed_costs and contribution_margin_ratio.' };
  const fixed = numField(b.fixed_costs), cmr = numField(b.contribution_margin_ratio);
  if (fixed === undefined || fixed < 0) return { error: '"fixed_costs" must be a non-negative number.' };
  if (cmr === undefined || cmr <= 0 || cmr > 1) return { error: '"contribution_margin_ratio" must be a number in (0, 1].' };
  let tp = 0; if (b.target_profit !== undefined) { const t = numField(b.target_profit); if (t === undefined || t < 0) return { error: '"target_profit" must be a non-negative number.' }; tp = t; }
  let cur: number | undefined; if (b.current_revenue !== undefined) { const c = numField(b.current_revenue); if (c === undefined || c < 0) return { error: '"current_revenue" must be a non-negative number.' }; cur = c; }
  return { fixed, cmr, tp, cur };
}

const CHAIN_TO = [
  { api: 'payback-period', reason: 'Once break-even is known, evaluate how long the upfront investment takes to pay back.' },
  { api: 'unit-economics', reason: 'Translate per-unit contribution margin into CAC payback and LTV:CAC.' },
];
const INVALIDATORS = [
  'Break-even assumes a CONSTANT price and variable cost per unit and fixed costs that do not change with volume; volume discounts, step-fixed costs or price changes shift the point.',
  'Contribution margin = price − variable cost; if variable cost ≥ price the contribution margin is ≤ 0 and there is no finite break-even.',
  'Margin of safety is only computed when current_units (or current_revenue) is supplied, and is relative to that figure.',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, calculation_certainty: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: chainTo(CHAIN_TO), privacy: PRIVACY, execution_metadata: EXECUTION_METADATA, financial_disclaimer: FINANCIAL_DISCLAIMER,
});

export const DISCOVERY = {
  name: 'Break-Even Analysis API', version: '1.0.0',
  description: 'Deterministic cost-volume-profit / break-even analysis. /units does unit-based CVP (break-even units & revenue, contribution margin, target-profit units, margin of safety); /revenue does ratio-based CVP for service businesses. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/break-even/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['break_even_units', 'break_even_revenue', 'contribution_margin', 'target_profit_volume', 'margin_of_safety'],
  typical_use_cases: [
    'Compute the units a product must sell to cover fixed costs',
    'Find the revenue a service business needs to break even from its contribution margin ratio',
    'Size the volume needed to hit a target profit',
    'Measure how far current sales are above break-even (margin of safety)',
  ],
  input_examples: [
    { endpoint: '/units', body: { fixed_costs: 50000, price_per_unit: 40, variable_cost_per_unit: 25, target_profit: 20000, current_units: 5000 } },
    { endpoint: '/revenue', body: { fixed_costs: 50000, contribution_margin_ratio: 0.375, current_revenue: 200000 } },
  ],
  output_examples: [
    { endpoint: '/units', response: { contribution_margin_per_unit: 15, break_even_units: 3333.3333, break_even_revenue: 133333.33 } },
    { endpoint: '/revenue', response: { break_even_revenue: 133333.33, margin_of_safety_percent: 33.3333 } },
  ],
  endpoints: [
    { method: 'POST', path: '/units', summary: 'Unit-based break-even + contribution margin', price_usdc: 0.007 },
    { method: 'POST', path: '/revenue', summary: 'Ratio-based break-even revenue', price_usdc: 0.006 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL full CVP analysis + reasoning', price_usdc: 0.012 },
  ],
  pricing: [
    { path: '/units', price_usdc: 0.007, currency: 'USDC' },
    { path: '/revenue', price_usdc: 0.006, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
  ],
  x402_compatible: true,
};

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

router.post('/units', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = readUnits(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = unitsCvp(r.fixed, r.price, r.vc, r.tp, r.cur);
  respond(res, t0, { ...v, ...TAIL({ units: 1 }, [`Break-even at ${v.break_even_units} units ($${v.break_even_revenue} revenue); contribution margin $${v.contribution_margin_per_unit}/unit.`]) });
});

router.post('/revenue', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = readRevenue(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = revenueCvp(r.fixed, r.cmr, r.tp, r.cur);
  respond(res, t0, { ...v, ...TAIL({ revenue: 1 }, [`Break-even revenue $${v.break_even_revenue} at a ${round(r.cmr * 100, 2)}% contribution margin.`]) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = readUnits(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = unitsCvp(r.fixed, r.price, r.vc, r.tp, r.cur);
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Contribution margin $${v.contribution_margin_per_unit}/unit (price $${v.price_per_unit} − variable $${v.variable_cost_per_unit}); break-even = fixed $${v.fixed_costs} ÷ CM = ${v.break_even_units} units.${r.tp ? ` Target profit $${v.target_profit} needs ${v.target_profit_units} units.` : ''}`,
      key_factors: [
        `Break-even ${v.break_even_units} units ($${v.break_even_revenue}).`,
        `Contribution margin ratio ${round(v.contribution_margin_ratio * 100, 2)}%.`,
        ...(v.margin_of_safety_percent !== null ? [`Margin of safety ${v.margin_of_safety_percent}% above break-even.`] : []),
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL({ units: 1, target_profit: 1 }, [
      `Sell at least ${v.break_even_units} units to break even.`,
      ...(r.tp ? [`Reach ${v.target_profit_units} units for a $${v.target_profit} profit.`] : []),
    ]),
  });
});

export default router;
