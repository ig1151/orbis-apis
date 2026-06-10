import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import {
  monthlyRate, futureValue, periodsToTarget, requiredContribution, round, num, FINANCIAL_DISCLAIMER, EXECUTION_METADATA,
} from '../../_aplus/finance';

const CONFIDENCE_PER_SECTION = { calculation: 1, sensitivity_analysis: 1 };

// Deterministic savings-goal optimizer. Three modes depending on what you supply:
//  - contribution only  -> months to reach the goal
//  - target_months only  -> required monthly contribution
//  - both                -> projected balance + surplus/shortfall at the target
// Real compound-interest math (monthly), no LLM.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };
const MAX_MONTHS = 1200;

export interface SavingsInput {
  goal_amount: number;
  current_savings: number;
  monthly_contribution?: number;
  target_months?: number;
  annual_return_pct: number;
}

export interface SavingsResult {
  mode: 'time_to_goal' | 'required_contribution' | 'projection';
  goal_amount: number;
  current_savings: number;
  amount_remaining: number;
  annual_return_pct: number;
  monthly_contribution: number | null;
  months_to_goal: number | null;
  target_months: number | null;
  required_monthly_contribution: number | null;
  projected_balance_at_target: number | null;
  surplus_or_shortfall_at_target: number | null;
  reaches_goal: boolean | null;
  invalid_reason: 'goal_unreachable' | null;
  total_contributions: number | null;
  total_growth: number | null;
}

type Parsed = SavingsInput | { error: string };

export function parseSavings(body: any): Parsed {
  const goal_amount = num(body?.goal_amount);
  const current_savings = num(body?.current_savings) ?? 0;
  const monthly_contribution = num(body?.monthly_contribution);
  const target_months = num(body?.target_months);
  const annual_return_pct = num(body?.annual_return_pct) ?? 0;

  if (goal_amount === undefined || goal_amount <= 0) return { error: '"goal_amount" must be a positive number' };
  if (current_savings < 0) return { error: '"current_savings" must be 0 or greater' };
  if (monthly_contribution !== undefined && monthly_contribution < 0) return { error: '"monthly_contribution" must be 0 or greater' };
  if (target_months !== undefined && (target_months < 1 || target_months > MAX_MONTHS)) return { error: `"target_months" must be between 1 and ${MAX_MONTHS}` };
  if (annual_return_pct < -20 || annual_return_pct > 30) return { error: '"annual_return_pct" must be between -20 and 30' };
  if (monthly_contribution === undefined && target_months === undefined) return { error: 'Provide "monthly_contribution" (to compute time to goal) or "target_months" (to compute required contribution), or both.' };

  return {
    goal_amount, current_savings,
    monthly_contribution, target_months: target_months === undefined ? undefined : Math.round(target_months),
    annual_return_pct,
  };
}

export function computeSavings(i: SavingsInput): SavingsResult {
  const r = monthlyRate(i.annual_return_pct);
  const amount_remaining = round(Math.max(0, i.goal_amount - i.current_savings));
  const base: SavingsResult = {
    mode: 'time_to_goal',
    goal_amount: round(i.goal_amount),
    current_savings: round(i.current_savings),
    amount_remaining,
    annual_return_pct: i.annual_return_pct,
    monthly_contribution: i.monthly_contribution === undefined ? null : round(i.monthly_contribution),
    months_to_goal: null,
    target_months: i.target_months ?? null,
    required_monthly_contribution: null,
    projected_balance_at_target: null,
    surplus_or_shortfall_at_target: null,
    reaches_goal: null,
    invalid_reason: null,
    total_contributions: null,
    total_growth: null,
  };

  const hasContribution = i.monthly_contribution !== undefined;
  const hasTarget = i.target_months !== undefined;

  if (hasContribution && hasTarget) {
    base.mode = 'projection';
    const months = i.target_months as number;
    const contribution = i.monthly_contribution as number;
    const projected = futureValue(i.current_savings, contribution, r, months);
    const m2g = periodsToTarget(i.current_savings, contribution, r, i.goal_amount);
    base.projected_balance_at_target = round(projected);
    base.surplus_or_shortfall_at_target = round(projected - i.goal_amount);
    base.reaches_goal = projected >= i.goal_amount;
    base.months_to_goal = m2g !== null && m2g <= MAX_MONTHS ? m2g : null;
    base.required_monthly_contribution = round(Math.max(0, requiredContribution(i.current_savings, i.goal_amount, r, months)));
    base.total_contributions = round(contribution * months);
    base.total_growth = round(projected - i.current_savings - contribution * months);
  } else if (hasContribution) {
    base.mode = 'time_to_goal';
    const contribution = i.monthly_contribution as number;
    const m2g = periodsToTarget(i.current_savings, contribution, r, i.goal_amount);
    if (m2g !== null && m2g <= MAX_MONTHS) {
      base.months_to_goal = m2g;
      const fv = futureValue(i.current_savings, contribution, r, m2g);
      base.total_contributions = round(contribution * m2g);
      base.total_growth = round(fv - i.current_savings - contribution * m2g);
      base.reaches_goal = true;
    } else {
      // contribution + growth never reaches the goal within the horizon (e.g. zero
      // contribution with no/negative return, or a balance that shrinks forever)
      base.reaches_goal = false;
      base.invalid_reason = 'goal_unreachable';
    }
  } else {
    base.mode = 'required_contribution';
    const months = i.target_months as number;
    const pmt = Math.max(0, requiredContribution(i.current_savings, i.goal_amount, r, months));
    base.required_monthly_contribution = round(pmt);
    base.monthly_contribution = round(pmt);
    base.months_to_goal = months;
    base.reaches_goal = true;
    base.total_contributions = round(pmt * months);
    base.total_growth = round(i.goal_amount - i.current_savings - pmt * months);
  }
  return base;
}

function sensitivity(i: SavingsInput, r: SavingsResult) {
  // vary the operative lever: contribution if we have one, else target_months
  if (r.mode === 'required_contribution') {
    const months = i.target_months as number;
    return [-12, -6, 0, 6, 12].map((d) => {
      const m = Math.max(1, months + d);
      const pmt = Math.max(0, requiredContribution(i.current_savings, i.goal_amount, monthlyRate(i.annual_return_pct), m));
      return { target_months: m, required_monthly_contribution: round(pmt) };
    });
  }
  const base = i.monthly_contribution as number;
  return [-100, -50, 0, 50, 100].map((d) => {
    const c = Math.max(0, base + d);
    const m2g = periodsToTarget(i.current_savings, c, monthlyRate(i.annual_return_pct), i.goal_amount);
    return { monthly_contribution: round(c), months_to_goal: m2g !== null && m2g <= MAX_MONTHS ? m2g : null };
  });
}

function assumptions(i: SavingsInput): string[] {
  return [
    `Contributions are made at the end of each month and earn a constant ${i.annual_return_pct}% annual return, compounded monthly.`,
    'Current savings start earning the same return immediately.',
    'No taxes, fees, or withdrawals are modeled; figures are in nominal dollars.',
  ];
}

function actions(r: SavingsResult): string[] {
  const out: string[] = [];
  if (r.mode === 'required_contribution') {
    out.push(`Save ${r.required_monthly_contribution}/mo to reach ${r.goal_amount} in ${r.target_months} month(s).`);
  } else if (r.mode === 'time_to_goal') {
    if (r.reaches_goal && r.months_to_goal !== null) out.push(`At ${r.monthly_contribution}/mo you reach ${r.goal_amount} in ${r.months_to_goal} month(s).`);
    else out.push('At this contribution (and return) the balance never reaches the goal — increase the monthly amount or the expected return.');
  } else {
    if (r.reaches_goal) out.push(`On track: ${r.monthly_contribution}/mo reaches ${r.projected_balance_at_target} by month ${r.target_months}, a surplus of ${r.surplus_or_shortfall_at_target}.`);
    else out.push(`Short by ${Math.abs(r.surplus_or_shortfall_at_target as number)} at month ${r.target_months}. Raise to ${r.required_monthly_contribution}/mo to hit the goal on time.`);
  }
  out.push('Automate the transfer on payday and hold the fund in a high-yield/insured account matched to your time horizon.');
  return out;
}

const CHAIN_TO = [
  { api: 'budget-planner', reason: 'Find the monthly room to fund this savings contribution.' },
  { api: 'retirement-planner', reason: 'Roll long-horizon goals into a full retirement projection.' },
  { api: 'personal-finance-agent', reason: 'Sequence savings against debt payoff and other goals.' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Savings Goal Optimizer API', version: '1.0.0',
    description: 'Deterministic savings-goal planner. Given a goal and your current savings, computes either the time to reach it (from a monthly contribution), the monthly contribution required (for a target date), or the projected balance and surplus/shortfall (when both are supplied). Real compound-interest math — never estimated.',
    openapi_url: 'https://orbis-apis.onrender.com/savings-goal-optimizer/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/calculate', summary: 'Time-to-goal, required contribution, or projection', price_usdc: 0.008 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL plan + reasoning + sensitivity', price_usdc: 0.015 },
    ],
    pricing: [
      { path: '/calculate', price_usdc: 0.008, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.015, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/calculate', (req: Request, res: Response) => {
  const t0 = Date.now();
  const parsed = parseSavings(req.body);
  if ('error' in parsed) return fail(res, t0, 400, 'invalid_request', parsed.error);
  const r = computeSavings(parsed);
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
  const parsed = parseSavings(req.body);
  if ('error' in parsed) return fail(res, t0, 400, 'invalid_request', parsed.error);
  const r = computeSavings(parsed);
  respond(res, t0, {
    ...r,
    assumptions: assumptions(parsed),
    sensitivity_analysis: sensitivity(parsed, r),
    reasoning: {
      why_result_generated: `Mode "${r.mode}": solved the compound-growth equation for ${r.goal_amount} starting from ${r.current_savings} at ${parsed.annual_return_pct}% monthly-compounded.`,
      key_factors: [
        `Amount still needed: ${r.amount_remaining}.`,
        r.mode === 'required_contribution' ? `Requires ${r.required_monthly_contribution}/mo over ${r.target_months} month(s).`
          : r.mode === 'time_to_goal' ? (r.reaches_goal ? `Reaches goal in ${r.months_to_goal} month(s) at ${r.monthly_contribution}/mo.` : 'Does not reach the goal at this contribution/return.')
          : (r.reaches_goal ? `Projected ${r.projected_balance_at_target} by month ${r.target_months} (surplus ${r.surplus_or_shortfall_at_target}).` : `Projected ${r.projected_balance_at_target}, short ${Math.abs(r.surplus_or_shortfall_at_target as number)}.`),
        r.total_growth !== null ? `Of the total, ${r.total_growth} comes from investment growth.` : 'Growth not applicable to this mode.',
      ],
      invalidators: [
        'A different realized return changes both the time and the required contribution.',
        'Missed or irregular contributions push the goal out.',
        'Withdrawals or fees reduce the ending balance below the projection.',
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
