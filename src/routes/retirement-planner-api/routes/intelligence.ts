import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import {
  monthlyRate, realMonthlyRate, futureValue, requiredContribution, round, num, FINANCIAL_DISCLAIMER,
} from '../../_aplus/finance';

// Deterministic retirement projection. Compounds current savings + monthly
// contributions to the retirement date, reports the balance in nominal and
// today's (inflation-adjusted) dollars, and — when a target income is given —
// sizes the nest egg via the 4% safe-withdrawal rule. Real FV math, no LLM.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };
const SWR = 0.04; // 4% safe-withdrawal rule

export interface RetirementInput {
  current_age: number;
  retirement_age: number;
  current_savings: number;
  monthly_contribution: number;
  annual_return_pct: number;
  inflation_pct: number;
  desired_annual_retirement_income?: number;
  current_annual_income?: number;
}

export interface RetirementResult {
  years_to_retirement: number;
  months_to_retirement: number;
  total_contributions: number;
  projected_balance: number;
  projected_balance_todays_dollars: number;
  investment_growth: number;
  sustainable_annual_income_todays_dollars: number;
  nest_egg_target_todays_dollars: number | null;
  surplus_or_gap_todays_dollars: number | null;
  income_replacement_ratio: number | null;
  on_track: boolean | null;
}

type Parsed = RetirementInput | { error: string };

export function parseRetirement(body: any): Parsed {
  const current_age = num(body?.current_age);
  const retirement_age = num(body?.retirement_age);
  const current_savings = num(body?.current_savings) ?? 0;
  const monthly_contribution = num(body?.monthly_contribution) ?? 0;
  const annual_return_pct = num(body?.annual_return_pct) ?? 7;
  const inflation_pct = num(body?.inflation_pct) ?? 3;
  const desired_annual_retirement_income = num(body?.desired_annual_retirement_income);
  const current_annual_income = num(body?.current_annual_income);

  if (current_age === undefined || current_age < 0 || current_age > 110) return { error: '"current_age" must be between 0 and 110' };
  if (retirement_age === undefined || retirement_age <= current_age || retirement_age > 110) return { error: '"retirement_age" must be greater than current_age and at most 110' };
  if (current_savings < 0) return { error: '"current_savings" must be 0 or greater' };
  if (monthly_contribution < 0) return { error: '"monthly_contribution" must be 0 or greater' };
  if (annual_return_pct < -20 || annual_return_pct > 30) return { error: '"annual_return_pct" must be between -20 and 30' };
  if (inflation_pct < 0 || inflation_pct > 20) return { error: '"inflation_pct" must be between 0 and 20' };
  if (desired_annual_retirement_income !== undefined && desired_annual_retirement_income < 0) return { error: '"desired_annual_retirement_income" must be 0 or greater' };
  if (current_annual_income !== undefined && current_annual_income <= 0) return { error: '"current_annual_income" must be a positive number' };

  return {
    current_age, retirement_age, current_savings, monthly_contribution,
    annual_return_pct, inflation_pct,
    desired_annual_retirement_income, current_annual_income,
  };
}

export function computeRetirement(i: RetirementInput): RetirementResult {
  const months = Math.round((i.retirement_age - i.current_age) * 12);
  const rNom = monthlyRate(i.annual_return_pct);
  const rReal = realMonthlyRate(i.annual_return_pct, i.inflation_pct);

  const projected = futureValue(i.current_savings, i.monthly_contribution, rNom, months);
  const projectedReal = futureValue(i.current_savings, i.monthly_contribution, rReal, months);
  const total_contributions = i.monthly_contribution * months;
  const investment_growth = projected - i.current_savings - total_contributions;

  const sustainableIncomeReal = projectedReal * SWR;

  let nest_egg_target_todays_dollars: number | null = null;
  let surplus_or_gap_todays_dollars: number | null = null;
  let on_track: boolean | null = null;
  if (i.desired_annual_retirement_income !== undefined) {
    nest_egg_target_todays_dollars = i.desired_annual_retirement_income / SWR;
    surplus_or_gap_todays_dollars = projectedReal - nest_egg_target_todays_dollars;
    on_track = projectedReal >= nest_egg_target_todays_dollars;
  }

  const income_replacement_ratio = i.current_annual_income
    ? round(sustainableIncomeReal / i.current_annual_income, 3)
    : null;

  return {
    years_to_retirement: round((i.retirement_age - i.current_age), 1),
    months_to_retirement: months,
    total_contributions: round(total_contributions),
    projected_balance: round(projected),
    projected_balance_todays_dollars: round(projectedReal),
    investment_growth: round(investment_growth),
    sustainable_annual_income_todays_dollars: round(sustainableIncomeReal),
    nest_egg_target_todays_dollars: nest_egg_target_todays_dollars === null ? null : round(nest_egg_target_todays_dollars),
    surplus_or_gap_todays_dollars: surplus_or_gap_todays_dollars === null ? null : round(surplus_or_gap_todays_dollars),
    income_replacement_ratio,
    on_track,
  };
}

function requiredMonthlyForTarget(i: RetirementInput): number | null {
  if (i.desired_annual_retirement_income === undefined) return null;
  const months = Math.round((i.retirement_age - i.current_age) * 12);
  const rReal = realMonthlyRate(i.annual_return_pct, i.inflation_pct);
  const targetReal = i.desired_annual_retirement_income / SWR; // today's dollars
  const pmt = requiredContribution(i.current_savings, targetReal, rReal, months);
  return round(Math.max(0, pmt));
}

function sensitivity(i: RetirementInput) {
  const deltas = [-2, -1, 0, 1, 2];
  return deltas.map((d) => {
    const ret = round(i.annual_return_pct + d, 2);
    const months = Math.round((i.retirement_age - i.current_age) * 12);
    const projected = futureValue(i.current_savings, i.monthly_contribution, monthlyRate(ret), months);
    const projectedReal = futureValue(i.current_savings, i.monthly_contribution, realMonthlyRate(ret, i.inflation_pct), months);
    return {
      annual_return_pct: ret,
      projected_balance: round(projected),
      projected_balance_todays_dollars: round(projectedReal),
    };
  });
}

function assumptions(i: RetirementInput): string[] {
  const a = [
    `A constant ${i.annual_return_pct}% nominal annual return, compounded monthly, until retirement.`,
    `Contributions of ${round(i.monthly_contribution)}/mo continue unchanged for ${round(i.retirement_age - i.current_age, 1)} year(s).`,
    `Today's-dollar figures discount by ${i.inflation_pct}% annual inflation.`,
    'Sustainable income uses the 4% safe-withdrawal rule; no taxes, fees, or employer match are modeled.',
  ];
  return a;
}

function actions(i: RetirementInput, r: RetirementResult): string[] {
  const out: string[] = [];
  if (r.on_track === true) {
    out.push(`On track: your projected ${r.projected_balance_todays_dollars} (today's dollars) exceeds the ${r.nest_egg_target_todays_dollars} nest egg needed — surplus ${r.surplus_or_gap_todays_dollars}.`);
  } else if (r.on_track === false) {
    const need = requiredMonthlyForTarget(i);
    out.push(`Gap of ${Math.abs(r.surplus_or_gap_todays_dollars as number)} (today's dollars) to your target. Increase monthly contributions to about ${need}, retire later, or adjust the target income.`);
  } else {
    out.push(`Projected nest egg ${r.projected_balance_todays_dollars} (today's dollars) supports ~${r.sustainable_annual_income_todays_dollars}/yr at a 4% withdrawal. Provide desired_annual_retirement_income to check against a target.`);
  }
  out.push('Maximize tax-advantaged accounts (401k/IRA) and any employer match before taxable investing.');
  if (r.income_replacement_ratio !== null) out.push(`This replaces about ${Math.round(r.income_replacement_ratio * 100)}% of your current income; 70–80% is a common target.`);
  return out;
}

const CHAIN_TO = [
  { api: 'savings-goal-optimizer', reason: 'Plan the monthly contribution needed to close any retirement gap.' },
  { api: 'net-worth-tracker', reason: 'Track current assets and liabilities feeding the retirement balance.' },
  { api: 'personal-finance-agent', reason: 'Combine retirement, savings, and budget into one prioritized plan.' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Retirement Planner API', version: '1.0.0',
    description: 'Deterministic retirement projection: compounds current savings + monthly contributions to your retirement date, reports the balance in nominal and inflation-adjusted (today\'s) dollars, and sizes the nest egg via the 4% rule when a target income is given. Real future-value math — never estimated.',
    openapi_url: 'https://orbis-apis.onrender.com/retirement-planner/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/project', summary: 'Project retirement balance, sustainable income, and target gap', price_usdc: 0.01 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL projection + reasoning + return sensitivity', price_usdc: 0.025 },
    ],
    pricing: [
      { path: '/project', price_usdc: 0.01, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.025, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/project', (req: Request, res: Response) => {
  const t0 = Date.now();
  const parsed = parseRetirement(req.body);
  if ('error' in parsed) return fail(res, t0, 400, 'invalid_request', parsed.error);
  const r = computeRetirement(parsed);
  respond(res, t0, {
    ...r,
    confidence_score: 1.0,
    recommended_actions_priority_order: actions(parsed, r),
    chain_to: CHAIN_TO,
    financial_disclaimer: FINANCIAL_DISCLAIMER,
    privacy: PRIVACY,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const parsed = parseRetirement(req.body);
  if ('error' in parsed) return fail(res, t0, 400, 'invalid_request', parsed.error);
  const r = computeRetirement(parsed);
  respond(res, t0, {
    ...r,
    required_monthly_contribution_for_target: requiredMonthlyForTarget(parsed),
    assumptions: assumptions(parsed),
    sensitivity_analysis: sensitivity(parsed),
    reasoning: {
      why_result_generated: `Compounded ${round(parsed.current_savings)} plus ${round(parsed.monthly_contribution)}/mo at ${parsed.annual_return_pct}% for ${r.months_to_retirement} month(s), then discounted by ${parsed.inflation_pct}% inflation and applied the 4% rule.`,
      key_factors: [
        `${r.years_to_retirement} year(s) of growth: ${r.total_contributions} contributed, ${r.investment_growth} from compounding.`,
        `Projected ${r.projected_balance} nominal / ${r.projected_balance_todays_dollars} in today's dollars → ~${r.sustainable_annual_income_todays_dollars}/yr sustainable income.`,
        r.on_track === null ? 'No target income supplied, so no gap was computed.' : (r.on_track ? `Exceeds target by ${r.surplus_or_gap_todays_dollars}.` : `Short of target by ${Math.abs(r.surplus_or_gap_todays_dollars as number)}.`),
      ],
      invalidators: [
        'Actual returns vary year to year; sequence-of-returns risk near retirement matters.',
        'Higher inflation than entered erodes purchasing power and the real balance.',
        'Changing contributions, retirement age, or withdrawal rate changes the outcome.',
      ],
    },
    confidence_score: 1.0,
    recommended_actions_priority_order: actions(parsed, r),
    chain_to: CHAIN_TO,
    financial_disclaimer: FINANCIAL_DISCLAIMER,
    privacy: PRIVACY,
  });
});

export default router;
