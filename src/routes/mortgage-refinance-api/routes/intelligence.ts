import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { monthlyPayment, totalInterest, ltv, round, num, clamp, FINANCIAL_DISCLAIMER } from '../../_aplus/finance';

// Deterministic mortgage-specific refinance analysis: LTV, PMI removal, discount
// points, cash-out, and rate-and-term. Real amortization math — no LLM.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };
const PMI_LTV_THRESHOLD = 0.8; // PMI typically drops at or below 80% LTV.

export interface MortgageInput {
  home_value: number;
  current_balance: number;
  current_rate: number;
  current_remaining_months: number;
  new_rate: number;
  new_term_months: number;
  closing_costs: number;
  points: number;
  pmi_monthly: number;
  cash_out: number;
}

export interface MortgageResult {
  ltv: number | null;
  pmi_removal_eligible: boolean;
  points_cost: number;
  upfront_cost: number;
  current_monthly_payment: number;
  new_monthly_payment: number;
  new_pmi_monthly: number;
  monthly_savings: number;
  break_even_months: number | null;
  new_total_interest: number;
  lifetime_savings: number;
  worth_it: boolean;
  risk_level: 'low' | 'moderate' | 'high';
}

type ParsedInput = MortgageInput | { error: string };

export function parseMortgage(body: any): ParsedInput {
  const home_value = num(body?.home_value);
  const current_balance = num(body?.current_balance);
  const current_rate = num(body?.current_rate);
  const current_remaining_months = num(body?.current_remaining_months);
  const new_rate = num(body?.new_rate);
  const new_term_months = num(body?.new_term_months);
  const closing_costs = num(body?.closing_costs) ?? 0;
  const points = num(body?.points) ?? 0;
  const pmi_monthly = num(body?.pmi_monthly) ?? 0;
  const cash_out = num(body?.cash_out) ?? 0;

  if (home_value === undefined || home_value <= 0) return { error: '"home_value" must be a positive number' };
  if (current_balance === undefined || current_balance <= 0) return { error: '"current_balance" must be a positive number' };
  if (current_rate === undefined || current_rate < 0 || current_rate > 100) return { error: '"current_rate" must be between 0 and 100' };
  if (current_remaining_months === undefined || current_remaining_months < 1 || current_remaining_months > 600) return { error: '"current_remaining_months" must be an integer between 1 and 600' };
  if (new_rate === undefined || new_rate < 0 || new_rate > 100) return { error: '"new_rate" must be between 0 and 100' };
  if (new_term_months === undefined || new_term_months < 1 || new_term_months > 600) return { error: '"new_term_months" must be an integer between 1 and 600' };
  if (closing_costs < 0) return { error: '"closing_costs" must be 0 or greater' };
  if (points < 0 || points > 10) return { error: '"points" must be between 0 and 10' };
  if (pmi_monthly < 0) return { error: '"pmi_monthly" must be 0 or greater' };
  if (cash_out < 0) return { error: '"cash_out" must be 0 or greater' };

  return {
    home_value, current_balance, current_rate,
    current_remaining_months: Math.round(current_remaining_months),
    new_rate, new_term_months: Math.round(new_term_months),
    closing_costs, points, pmi_monthly, cash_out,
  };
}

export function computeMortgage(i: MortgageInput): MortgageResult {
  const new_loan_amount = i.current_balance + i.cash_out;
  const newLtv = ltv(new_loan_amount, i.home_value);
  const pmi_removal_eligible = newLtv !== null && newLtv <= PMI_LTV_THRESHOLD && i.pmi_monthly > 0;
  // PMI continues on the new loan if still above the threshold; carried at the same rate.
  const new_pmi_monthly = newLtv !== null && newLtv > PMI_LTV_THRESHOLD ? i.pmi_monthly : 0;

  const points_cost = (i.points / 100) * new_loan_amount;
  const upfront_cost = i.closing_costs + points_cost;

  const current_pi = monthlyPayment(i.current_balance, i.current_rate, i.current_remaining_months);
  const current_total = current_pi + i.pmi_monthly;
  const new_pi = monthlyPayment(new_loan_amount, i.new_rate, i.new_term_months);
  const new_total = new_pi + new_pmi_monthly;
  const monthly_savings = current_total - new_total;

  const break_even_months = monthly_savings > 0 ? Math.ceil(upfront_cost / monthly_savings) : null;
  const new_total_interest = totalInterest(new_loan_amount, new_pi, i.new_term_months);
  const old_total_cost = current_total * i.current_remaining_months;
  const new_total_cost = new_total * i.new_term_months + upfront_cost;
  const lifetime_savings = old_total_cost - new_total_cost;

  const worth_it = monthly_savings > 0 && break_even_months !== null && break_even_months <= 36 && lifetime_savings > 0;

  let risk_level: MortgageResult['risk_level'] = 'low';
  if (monthly_savings <= 0 || lifetime_savings <= 0) risk_level = 'high';
  else if (break_even_months === null || break_even_months > 36 || (newLtv !== null && newLtv > 0.95)) risk_level = 'moderate';

  return {
    ltv: newLtv === null ? null : round(newLtv, 4),
    pmi_removal_eligible,
    points_cost: round(points_cost),
    upfront_cost: round(upfront_cost),
    current_monthly_payment: round(current_total),
    new_monthly_payment: round(new_total),
    new_pmi_monthly: round(new_pmi_monthly),
    monthly_savings: round(monthly_savings),
    break_even_months,
    new_total_interest: round(new_total_interest),
    lifetime_savings: round(lifetime_savings),
    worth_it,
    risk_level,
  };
}

function sensitivity(i: MortgageInput) {
  const current_total = monthlyPayment(i.current_balance, i.current_rate, i.current_remaining_months) + i.pmi_monthly;
  const newLtv = ltv(i.current_balance + i.cash_out, i.home_value);
  const new_pmi = newLtv !== null && newLtv > PMI_LTV_THRESHOLD ? i.pmi_monthly : 0;
  return [-0.5, -0.25, 0, 0.25, 0.5].map((d) => {
    const rate = round(clamp(i.new_rate + d, 0, 100), 3);
    const pay = monthlyPayment(i.current_balance + i.cash_out, rate, i.new_term_months) + new_pmi;
    return { new_rate: rate, new_monthly_payment: round(pay), monthly_savings: round(current_total - pay) };
  });
}

function assumptions(i: MortgageInput): string[] {
  const a = [
    'Fixed rate and fully-amortizing payments; payment shown is principal + interest (+ PMI where applicable), excluding taxes and insurance escrow.',
    'PMI is assumed removed when the new loan-to-value is at or below 80%.',
    'Discount points cost points% of the new loan amount and are paid upfront with closing costs.',
  ];
  if (i.cash_out > 0) a.push(`Cash-out of ${i.cash_out} is added to the new loan principal and raises LTV.`);
  return a;
}

function actions(r: MortgageResult): string[] {
  const out: string[] = [];
  if (r.worth_it) out.push(`Refinance saves ${r.monthly_savings}/mo and breaks even in ${r.break_even_months} month(s) — strong candidate if you hold past break-even.`);
  else if (r.monthly_savings > 0 && r.break_even_months !== null) out.push(`Payment drops ${r.monthly_savings}/mo but break-even is ${r.break_even_months} month(s); refinance only if you keep the home that long.`);
  else out.push('These terms do not lower your monthly payment — revisit the rate, term, points, or cash-out amount.');
  if (r.pmi_removal_eligible) out.push('New LTV is at/below 80% — refinancing can eliminate PMI; confirm the lender drops it.');
  if (r.lifetime_savings <= 0) out.push('Total cost rises over the loan life — a lower payment here comes from a longer term, not real savings.');
  out.push('Confirm rate, APR, points, and PMI terms in a written loan estimate before committing.');
  return out;
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Mortgage Refinance API', version: '1.0.0',
    description: 'Deterministic mortgage refinance analysis: LTV, PMI removal eligibility, discount points break-even, cash-out, and rate-and-term savings. Real amortization math — never estimated.',
    openapi_url: 'https://orbis-apis.onrender.com/mortgage-refinance/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/analyze', summary: 'LTV, PMI removal, points, payment & break-even', price_usdc: 0.01 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL mortgage refinance analysis + reasoning + rate sensitivity', price_usdc: 0.025 },
    ],
    pricing: [
      { path: '/analyze', price_usdc: 0.01, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.025, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

function chains() {
  return [
    { api: 'refinance-calculator', reason: 'General-loan view of the same refinance (auto/student/personal).' },
    { api: 'financial-health-checker', reason: 'Check how the new mortgage payment affects DTI and overall financial health.' },
  ];
}

router.post('/analyze', (req: Request, res: Response) => {
  const t0 = Date.now();
  const parsed = parseMortgage(req.body);
  if ('error' in parsed) return fail(res, t0, 400, 'invalid_request', parsed.error);
  const r = computeMortgage(parsed);
  respond(res, t0, {
    ...r,
    confidence_score: 1.0,
    recommended_actions_priority_order: actions(r),
    chain_to: chains(),
    financial_disclaimer: FINANCIAL_DISCLAIMER,
    privacy: PRIVACY,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const parsed = parseMortgage(req.body);
  if ('error' in parsed) return fail(res, t0, 400, 'invalid_request', parsed.error);
  const r = computeMortgage(parsed);
  respond(res, t0, {
    ...r,
    assumptions: assumptions(parsed),
    sensitivity_analysis: sensitivity(parsed),
    reasoning: {
      why_result_generated: `Computed new LTV ${r.ltv}, amortized the ${parsed.new_term_months}-month loan at ${parsed.new_rate}%, and compared total monthly cost (incl. PMI) net of ${r.upfront_cost} upfront.`,
      key_factors: [
        `Monthly payment change: ${r.monthly_savings >= 0 ? '-' : '+'}${Math.abs(r.monthly_savings)} (${r.current_monthly_payment} → ${r.new_monthly_payment}).`,
        r.pmi_removal_eligible ? 'New LTV ≤ 80% → PMI removable.' : `PMI ${r.new_pmi_monthly > 0 ? 'continues at ' + r.new_pmi_monthly + '/mo' : 'not applicable'}.`,
        r.break_even_months !== null ? `Break-even in ${r.break_even_months} month(s) on ${r.upfront_cost} upfront.` : 'No break-even — payment not lower.',
      ],
      invalidators: [
        'Selling or paying off before break-even erases the savings.',
        'An appraisal below the entered home_value raises LTV and may keep PMI.',
        'A higher actual APR or points than entered reduces the benefit.',
      ],
    },
    confidence_score: 1.0,
    recommended_actions_priority_order: actions(r),
    chain_to: chains(),
    financial_disclaimer: FINANCIAL_DISCLAIMER,
    privacy: PRIVACY,
  });
});

export default router;
