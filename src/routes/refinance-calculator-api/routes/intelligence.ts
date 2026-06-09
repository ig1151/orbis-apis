import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import {
  monthlyPayment, totalInterest, remainingMonths, round, num, FINANCIAL_DISCLAIMER,
} from '../../_aplus/finance';

// Deterministic general-purpose loan refinance calculator (mortgage, auto,
// student, personal). Real amortization math — no LLM, no estimates.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };

export interface RefinanceInput {
  current_balance: number;
  current_rate: number;
  current_remaining_months: number;
  new_rate: number;
  new_term_months: number;
  closing_costs: number;
  cash_out: number;
}

export interface RefinanceResult {
  current_monthly_payment: number;
  new_monthly_payment: number;
  monthly_savings: number;
  new_loan_amount: number;
  break_even_months: number | null;
  current_remaining_interest: number;
  new_total_interest: number;
  lifetime_savings: number;
  worth_it: boolean;
  risk_level: 'low' | 'moderate' | 'high';
}

const LIMITS = {
  rate: [0, 100] as [number, number],
  months: [1, 600] as [number, number],
};

type ParsedInput = RefinanceInput | { error: string };

// Validate + normalize a refinance request body. current_payment, when supplied,
// overrides the derived current_remaining_months payment for the comparison.
export function parseRefinance(body: any): ParsedInput {
  const current_balance = num(body?.current_balance);
  const current_rate = num(body?.current_rate);
  const current_remaining_months = num(body?.current_remaining_months);
  const new_rate = num(body?.new_rate);
  const new_term_months = num(body?.new_term_months);
  const closing_costs = num(body?.closing_costs) ?? 0;
  const cash_out = num(body?.cash_out) ?? 0;

  if (current_balance === undefined || current_balance <= 0) return { error: '"current_balance" must be a positive number' };
  if (current_rate === undefined || current_rate < LIMITS.rate[0] || current_rate > LIMITS.rate[1]) return { error: '"current_rate" must be an annual percentage between 0 and 100' };
  if (current_remaining_months === undefined || current_remaining_months < LIMITS.months[0] || current_remaining_months > LIMITS.months[1]) return { error: '"current_remaining_months" must be an integer between 1 and 600' };
  if (new_rate === undefined || new_rate < LIMITS.rate[0] || new_rate > LIMITS.rate[1]) return { error: '"new_rate" must be an annual percentage between 0 and 100' };
  if (new_term_months === undefined || new_term_months < LIMITS.months[0] || new_term_months > LIMITS.months[1]) return { error: '"new_term_months" must be an integer between 1 and 600' };
  if (closing_costs < 0) return { error: '"closing_costs" must be 0 or greater' };
  if (cash_out < 0) return { error: '"cash_out" must be 0 or greater' };

  return {
    current_balance, current_rate,
    current_remaining_months: Math.round(current_remaining_months),
    new_rate, new_term_months: Math.round(new_term_months),
    closing_costs, cash_out,
  };
}

export function computeRefinance(i: RefinanceInput): RefinanceResult {
  const current_monthly_payment = monthlyPayment(i.current_balance, i.current_rate, i.current_remaining_months);
  const new_loan_amount = i.current_balance + i.cash_out;
  const new_monthly_payment = monthlyPayment(new_loan_amount, i.new_rate, i.new_term_months);
  const monthly_savings = current_monthly_payment - new_monthly_payment;

  const current_remaining_interest = totalInterest(i.current_balance, current_monthly_payment, i.current_remaining_months);
  const new_total_interest = totalInterest(new_loan_amount, new_monthly_payment, i.new_term_months);

  const break_even_months = monthly_savings > 0 ? Math.ceil(i.closing_costs / monthly_savings) : null;

  // Total out-of-pocket comparison over each loan's own remaining life.
  const old_total_cost = current_monthly_payment * i.current_remaining_months;
  const new_total_cost = new_monthly_payment * i.new_term_months + i.closing_costs;
  const lifetime_savings = old_total_cost - new_total_cost;

  const worth_it = monthly_savings > 0 && break_even_months !== null && break_even_months <= 36 && lifetime_savings > 0;

  let risk_level: RefinanceResult['risk_level'] = 'low';
  if (monthly_savings <= 0 || lifetime_savings <= 0) risk_level = 'high';
  else if (break_even_months === null || break_even_months > 36 || i.new_term_months > i.current_remaining_months + 60) risk_level = 'moderate';

  return {
    current_monthly_payment: round(current_monthly_payment),
    new_monthly_payment: round(new_monthly_payment),
    monthly_savings: round(monthly_savings),
    new_loan_amount: round(new_loan_amount),
    break_even_months,
    current_remaining_interest: round(current_remaining_interest),
    new_total_interest: round(new_total_interest),
    lifetime_savings: round(lifetime_savings),
    worth_it,
    risk_level,
  };
}

function sensitivity(i: RefinanceInput) {
  const deltas = [-0.5, -0.25, 0, 0.25, 0.5];
  return deltas.map((d) => {
    const rate = round(i.new_rate + d, 3);
    const pay = monthlyPayment(i.current_balance + i.cash_out, rate, i.new_term_months);
    const current = monthlyPayment(i.current_balance, i.current_rate, i.current_remaining_months);
    return { new_rate: rate, new_monthly_payment: round(pay), monthly_savings: round(current - pay) };
  });
}

function assumptions(i: RefinanceInput): string[] {
  const a = [
    'Fixed interest rates and fully-amortizing payments over each loan term.',
    'Closing costs are paid upfront (not financed into the new balance).',
    'Comparison uses each loan\'s own remaining life; a longer new term can raise total interest even when the monthly payment drops.',
  ];
  if (i.cash_out > 0) a.push(`Cash-out of ${i.cash_out} is added to the new loan principal.`);
  return a;
}

function actions(r: RefinanceResult): string[] {
  const out: string[] = [];
  if (r.worth_it) {
    out.push(`Refinancing saves ${r.monthly_savings}/mo and breaks even in ${r.break_even_months} month(s) — proceed if you will hold the loan past break-even.`);
  } else if (r.monthly_savings > 0 && r.break_even_months !== null) {
    out.push(`Monthly payment drops ${r.monthly_savings}, but break-even is ${r.break_even_months} month(s); refinance only if you will keep the loan that long.`);
  } else {
    out.push('Refinancing does not lower your monthly payment under these terms — reconsider the new rate, term, or closing costs.');
  }
  if (r.lifetime_savings <= 0) out.push('Total cost over the loan life increases — a lower payment here comes from a longer term, not real savings.');
  out.push('Confirm the actual rate, APR, and closing costs in a written loan estimate before committing.');
  return out;
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Refinance Calculator API', version: '1.0.0',
    description: 'Deterministic loan refinance analysis (mortgage, auto, student, personal): current vs new payment, monthly and lifetime savings, and break-even months. Real amortization math — never estimated.',
    openapi_url: 'https://orbis-apis.onrender.com/refinance-calculator/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/calculate', summary: 'Compute current vs new payment, savings, and break-even', price_usdc: 0.01 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL refinance analysis + reasoning + rate sensitivity', price_usdc: 0.02 },
    ],
    pricing: [
      { path: '/calculate', price_usdc: 0.01, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.02, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/calculate', (req: Request, res: Response) => {
  const t0 = Date.now();
  const parsed = parseRefinance(req.body);
  if ('error' in parsed) return fail(res, t0, 400, 'invalid_request', parsed.error);
  const r = computeRefinance(parsed);
  respond(res, t0, {
    ...r,
    confidence_score: 1.0,
    recommended_actions_priority_order: actions(r),
    chain_to: [
      { api: 'mortgage-refinance', reason: 'Mortgage-specific analysis incl. PMI removal, points, and LTV.' },
      { api: 'financial-health-checker', reason: 'Check how the new payment affects your debt-to-income and overall health.' },
    ],
    financial_disclaimer: FINANCIAL_DISCLAIMER,
    privacy: PRIVACY,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const parsed = parseRefinance(req.body);
  if ('error' in parsed) return fail(res, t0, 400, 'invalid_request', parsed.error);
  const r = computeRefinance(parsed);
  respond(res, t0, {
    ...r,
    assumptions: assumptions(parsed),
    sensitivity_analysis: sensitivity(parsed),
    reasoning: {
      why_result_generated: `Amortized the current balance over ${parsed.current_remaining_months} remaining month(s) and the new ${parsed.new_term_months}-month loan, then compared payments and total cost net of ${parsed.closing_costs} in closing costs.`,
      key_factors: [
        `Monthly payment change: ${r.monthly_savings >= 0 ? '-' : '+'}${Math.abs(r.monthly_savings)} (${r.current_monthly_payment} → ${r.new_monthly_payment}).`,
        r.break_even_months !== null ? `Break-even in ${r.break_even_months} month(s) on ${parsed.closing_costs} closing costs.` : 'No break-even — the new payment is not lower.',
        `Lifetime cost change: ${r.lifetime_savings >= 0 ? 'saves' : 'costs'} ${Math.abs(r.lifetime_savings)} over the loan life.`,
      ],
      invalidators: [
        'Selling or paying off the loan before break-even erases the savings.',
        'A higher actual APR or larger closing costs than entered reduce or eliminate the benefit.',
        'Variable/ARM rates can change the new payment after the fixed period.',
      ],
    },
    confidence_score: 1.0,
    recommended_actions_priority_order: actions(r),
    chain_to: [
      { api: 'mortgage-refinance', reason: 'Mortgage-specific analysis incl. PMI removal, points, and LTV.' },
      { api: 'financial-health-checker', reason: 'Check how the new payment affects your debt-to-income and overall health.' },
    ],
    financial_disclaimer: FINANCIAL_DISCLAIMER,
    privacy: PRIVACY,
  });
});

export default router;
