import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { monthlyPayment, monthlyRate, round, num, FINANCIAL_DISCLAIMER, EXECUTION_METADATA } from '../../_aplus/finance';

// Deterministic rent-vs-buy comparison over a holding horizon. Models the net
// cost of buying (payments + carrying costs − recovered equity at sale) against
// the net cost of renting (rent − investment gain on the cash a buyer would tie
// up), and finds the break-even year. Real math — no LLM. Assumption-heavy by
// nature, so the assumptions/invalidators are reported explicitly.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };
const CONFIDENCE_PER_SECTION = { buy_cost: 1, rent_cost: 1, breakeven: 1 };

export interface RentBuyInput {
  home_price: number;
  down_payment: number;
  annual_rate: number;
  term_months: number;
  monthly_rent: number;
  years: number;
  property_tax_rate_pct: number;
  home_insurance_annual: number;
  maintenance_pct: number;
  home_appreciation_pct: number;
  rent_growth_pct: number;
  investment_return_pct: number;
  buy_closing_pct: number;
  sell_closing_pct: number;
}

type Parsed = RentBuyInput | { error: string };

export function parseRentBuy(body: any): Parsed {
  const g = (k: string, d?: number) => { const v = num(body?.[k]); return v === undefined ? d : v; };
  const home_price = num(body?.home_price);
  const monthly_rent = num(body?.monthly_rent);
  const annual_rate = num(body?.annual_rate);
  if (home_price === undefined || home_price <= 0) return { error: '"home_price" must be a positive number' };
  if (monthly_rent === undefined || monthly_rent <= 0) return { error: '"monthly_rent" must be a positive number' };
  if (annual_rate === undefined || annual_rate < 0 || annual_rate > 30) return { error: '"annual_rate" must be between 0 and 30' };
  const down_payment = g('down_payment', round(home_price * 0.2))!;
  const term_months = Math.round(g('term_months', 360)!);
  const years = g('years', 7)!;
  const property_tax_rate_pct = g('property_tax_rate_pct', 1.1)!;
  const home_insurance_annual = g('home_insurance_annual', round(home_price * 0.004))!;
  const maintenance_pct = g('maintenance_pct', 1)!;
  const home_appreciation_pct = g('home_appreciation_pct', 3)!;
  const rent_growth_pct = g('rent_growth_pct', 3)!;
  const investment_return_pct = g('investment_return_pct', 6)!;
  const buy_closing_pct = g('buy_closing_pct', 3)!;
  const sell_closing_pct = g('sell_closing_pct', 6)!;

  if (down_payment < 0 || down_payment > home_price) return { error: '"down_payment" must be between 0 and home_price' };
  if (term_months < 1 || term_months > 600) return { error: '"term_months" must be between 1 and 600' };
  if (years < 1 || years > 50) return { error: '"years" (holding horizon) must be between 1 and 50' };
  for (const [k, v] of Object.entries({ property_tax_rate_pct, maintenance_pct, home_appreciation_pct, rent_growth_pct, investment_return_pct, buy_closing_pct, sell_closing_pct, home_insurance_annual })) {
    if ((v as number) < 0) return { error: `"${k}" must be 0 or greater` };
  }
  return { home_price, down_payment, annual_rate, term_months, monthly_rent, years, property_tax_rate_pct, home_insurance_annual, maintenance_pct, home_appreciation_pct, rent_growth_pct, investment_return_pct, buy_closing_pct, sell_closing_pct };
}

// Remaining balance after `n` monthly payments.
function remainingBalance(loan: number, annualPct: number, n: number, pmt: number): number {
  const r = monthlyRate(annualPct);
  if (r === 0) return Math.max(0, loan - pmt * n);
  const f = Math.pow(1 + r, n);
  return Math.max(0, loan * f - pmt * ((f - 1) / r));
}

interface YearCosts { net_buy_cost: number; net_rent_cost: number; }

function costsAt(i: RentBuyInput, years: number): YearCosts {
  const loan = i.home_price - i.down_payment;
  const pi = monthlyPayment(loan, i.annual_rate, i.term_months);
  const months = Math.min(years * 12, i.term_months);

  const buy_closing = i.home_price * (i.buy_closing_pct / 100);
  const total_pi = pi * months;
  const total_tax = i.home_price * (i.property_tax_rate_pct / 100) * years;
  const total_ins = i.home_insurance_annual * years;
  const total_maint = i.home_price * (i.maintenance_pct / 100) * years;

  const home_value = i.home_price * Math.pow(1 + i.home_appreciation_pct / 100, years);
  const remaining = remainingBalance(loan, i.annual_rate, months, pi);
  const sell_costs = home_value * (i.sell_closing_pct / 100);
  const net_sale_proceeds = home_value - remaining - sell_costs;

  const buy_outflows = i.down_payment + buy_closing + total_pi + total_tax + total_ins + total_maint;
  const net_buy_cost = buy_outflows - net_sale_proceeds;

  // rent: grows annually; renter invests the buyer's upfront cash (down + closing) at investment return
  let total_rent = 0;
  for (let y = 0; y < years; y++) total_rent += i.monthly_rent * 12 * Math.pow(1 + i.rent_growth_pct / 100, y);
  const upfront = i.down_payment + buy_closing;
  const investment_gain = upfront * (Math.pow(1 + i.investment_return_pct / 100, years) - 1);
  const net_rent_cost = total_rent - investment_gain;

  return { net_buy_cost, net_rent_cost };
}

export interface RentBuyResult {
  recommendation: 'buy' | 'rent' | 'similar';
  net_buy_cost: number;
  net_rent_cost: number;
  cost_difference: number;
  breakeven_year: number | null;
  monthly_mortgage_payment: number;
  buy_breakdown: { down_payment: number; buy_closing_costs: number; total_mortgage_payments: number; total_property_tax: number; total_insurance: number; total_maintenance: number; home_value_at_end: number; remaining_mortgage_balance: number; selling_costs: number; net_sale_proceeds: number };
  rent_breakdown: { total_rent_paid: number; investment_gain_on_upfront: number };
  horizon_years: number;
}

export function computeRentBuy(i: RentBuyInput): RentBuyResult {
  const loan = i.home_price - i.down_payment;
  const pi = monthlyPayment(loan, i.annual_rate, i.term_months);
  const months = Math.min(i.years * 12, i.term_months);
  const { net_buy_cost, net_rent_cost } = costsAt(i, i.years);
  const cost_difference = round(net_buy_cost - net_rent_cost);

  // threshold: within 5% of the larger magnitude => "similar"
  const scale = Math.max(Math.abs(net_buy_cost), Math.abs(net_rent_cost), 1);
  const recommendation: RentBuyResult['recommendation'] = Math.abs(cost_difference) / scale < 0.05 ? 'similar' : net_buy_cost < net_rent_cost ? 'buy' : 'rent';

  let breakeven_year: number | null = null;
  for (let y = 1; y <= i.years; y++) { const c = costsAt(i, y); if (c.net_buy_cost <= c.net_rent_cost) { breakeven_year = y; break; } }

  const buy_closing = i.home_price * (i.buy_closing_pct / 100);
  const home_value = i.home_price * Math.pow(1 + i.home_appreciation_pct / 100, i.years);
  const remaining = remainingBalance(loan, i.annual_rate, months, pi);
  const sell_costs = home_value * (i.sell_closing_pct / 100);
  let total_rent = 0;
  for (let y = 0; y < i.years; y++) total_rent += i.monthly_rent * 12 * Math.pow(1 + i.rent_growth_pct / 100, y);

  return {
    recommendation,
    net_buy_cost: round(net_buy_cost),
    net_rent_cost: round(net_rent_cost),
    cost_difference,
    breakeven_year,
    monthly_mortgage_payment: round(pi),
    buy_breakdown: {
      down_payment: round(i.down_payment), buy_closing_costs: round(buy_closing),
      total_mortgage_payments: round(pi * months), total_property_tax: round(i.home_price * (i.property_tax_rate_pct / 100) * i.years),
      total_insurance: round(i.home_insurance_annual * i.years), total_maintenance: round(i.home_price * (i.maintenance_pct / 100) * i.years),
      home_value_at_end: round(home_value), remaining_mortgage_balance: round(remaining), selling_costs: round(sell_costs),
      net_sale_proceeds: round(home_value - remaining - sell_costs),
    },
    rent_breakdown: { total_rent_paid: round(total_rent), investment_gain_on_upfront: round((i.down_payment + buy_closing) * (Math.pow(1 + i.investment_return_pct / 100, i.years) - 1)) },
    horizon_years: i.years,
  };
}

function sensitivity(i: RentBuyInput) {
  return [-2, -1, 0, 1, 2].map((d) => {
    const appr = round(i.home_appreciation_pct + d, 2);
    const c = costsAt({ ...i, home_appreciation_pct: appr }, i.years);
    return { home_appreciation_pct: appr, net_buy_cost: round(c.net_buy_cost), net_rent_cost: round(c.net_rent_cost) };
  });
}

function actions(r: RentBuyResult): string[] {
  const out: string[] = [];
  if (r.recommendation === 'buy') out.push(`Over ${r.horizon_years} years, buying is cheaper by ${Math.abs(r.cost_difference)} (net buy ${r.net_buy_cost} vs net rent ${r.net_rent_cost}).`);
  else if (r.recommendation === 'rent') out.push(`Over ${r.horizon_years} years, renting is cheaper by ${Math.abs(r.cost_difference)} (net rent ${r.net_rent_cost} vs net buy ${r.net_buy_cost}).`);
  else out.push(`Over ${r.horizon_years} years the two are within 5% (${r.net_buy_cost} buy vs ${r.net_rent_cost} rent) — the decision is closer to lifestyle than cost.`);
  out.push(r.breakeven_year ? `Buying breaks even around year ${r.breakeven_year}; hold at least that long to come out ahead.` : 'Buying does not break even within the horizon — the shorter you stay, the more renting wins.');
  out.push('Re-run with your real rate, local tax/appreciation, and the rent you would actually pay.');
  return out;
}

const CHAIN_TO = [
  { api: 'loan-affordability-calculator', reason: 'Confirm the purchase price fits your income and DTI.' },
  { api: 'mortgage-refinance', reason: 'After buying, evaluate refinancing the mortgage.' },
  { api: 'savings-goal-optimizer', reason: 'Plan the down-payment savings if buying wins.' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Rent vs Buy Calculator API', version: '1.0.0',
    description: 'Deterministic rent-vs-buy comparison over a holding horizon. Models the net cost of buying (mortgage + taxes + insurance + maintenance − equity recovered at sale) against renting (rent growth − investment gain on the cash a buyer ties up), returns a recommendation and the break-even year. Real math with explicit assumptions — never estimated.',
    openapi_url: 'https://orbis-apis.onrender.com/rent-vs-buy-calculator/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/compare', summary: 'Net buy vs net rent cost + recommendation + break-even', price_usdc: 0.01 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL comparison + reasoning + appreciation sensitivity', price_usdc: 0.02 },
    ],
    pricing: [
      { path: '/compare', price_usdc: 0.01, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.02, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/compare', (req: Request, res: Response) => {
  const t0 = Date.now();
  const parsed = parseRentBuy(req.body);
  if ('error' in parsed) return fail(res, t0, 400, 'invalid_request', parsed.error);
  const r = computeRentBuy(parsed);
  respond(res, t0, {
    ...r,
    confidence_score: 1.0,
    confidence_per_section: CONFIDENCE_PER_SECTION,
    recommended_actions_priority_order: actions(r),
    chain_to: CHAIN_TO,
    financial_disclaimer: FINANCIAL_DISCLAIMER,
    privacy: PRIVACY,
    execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const parsed = parseRentBuy(req.body);
  if ('error' in parsed) return fail(res, t0, 400, 'invalid_request', parsed.error);
  const r = computeRentBuy(parsed);
  respond(res, t0, {
    ...r,
    assumptions: [
      `Holding horizon ${parsed.years} years; home appreciates ${parsed.home_appreciation_pct}%/yr, rent grows ${parsed.rent_growth_pct}%/yr.`,
      `The buyer's upfront cash (down payment + closing) is assumed invested at ${parsed.investment_return_pct}%/yr in the rent scenario (opportunity cost).`,
      `Property tax ${parsed.property_tax_rate_pct}%/yr of initial value, maintenance ${parsed.maintenance_pct}%/yr, selling costs ${parsed.sell_closing_pct}% of sale price. Taxes/maintenance are on the initial value (not appreciated) and tax-deduction effects are not modeled.`,
    ],
    sensitivity_analysis: sensitivity(parsed),
    reasoning: {
      why_result_generated: `Compared net buy cost ${r.net_buy_cost} (outflows minus ${r.buy_breakdown.net_sale_proceeds} net sale proceeds) against net rent cost ${r.net_rent_cost} (${r.rent_breakdown.total_rent_paid} rent minus ${r.rent_breakdown.investment_gain_on_upfront} investment gain) over ${r.horizon_years} years.`,
      key_factors: [
        `Recommendation: ${r.recommendation} (difference ${r.cost_difference}).`,
        r.breakeven_year ? `Break-even at year ${r.breakeven_year}.` : 'No break-even within the horizon.',
        `Home value at end ${r.buy_breakdown.home_value_at_end}; equity recovered ${r.buy_breakdown.net_sale_proceeds}.`,
      ],
      invalidators: [
        'Appreciation and investment-return assumptions drive the result more than any other input (see sensitivity).',
        'A shorter stay favors renting because buy closing/selling costs are amortized over fewer years.',
        'Local taxes, HOA, PMI, and mortgage-interest deductions can shift the comparison.',
      ],
    },
    confidence_score: 1.0,
    confidence_per_section: CONFIDENCE_PER_SECTION,
    recommended_actions_priority_order: actions(r),
    chain_to: CHAIN_TO,
    financial_disclaimer: FINANCIAL_DISCLAIMER,
    privacy: PRIVACY,
    execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
