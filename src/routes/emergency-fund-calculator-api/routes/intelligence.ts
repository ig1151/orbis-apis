import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { round, num, clamp, FINANCIAL_DISCLAIMER } from '../../_aplus/finance';

// Deterministic emergency-fund target, coverage, and time-to-goal calculator.
// Real arithmetic — no LLM, no estimates.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };

const STABILITY_BASE: Record<string, number> = { stable: 3, variable: 6, unstable: 9 };

export interface EmergencyFundInput {
  monthly_expenses: number;
  current_savings: number;
  monthly_contribution: number;
  dependents: number;
  job_stability: 'stable' | 'variable' | 'unstable';
  target_months?: number;
}

export interface EmergencyFundResult {
  recommended_target_months: number;
  recommended_target_amount: number;
  current_coverage_months: number | null;
  funded_percent: number;
  gap: number;
  monthly_contribution: number;
  months_to_goal: number | null;
  status: 'fully_funded' | 'adequate' | 'underfunded' | 'critical';
}

type ParsedInput = EmergencyFundInput | { error: string };

export function parseEmergencyFund(body: any): ParsedInput {
  const monthly_expenses = num(body?.monthly_expenses);
  const current_savings = num(body?.current_savings) ?? 0;
  const monthly_contribution = num(body?.monthly_contribution) ?? 0;
  const dependents = num(body?.dependents) ?? 0;
  const job_stability = body?.job_stability ?? 'stable';
  const target_months = num(body?.target_months);

  if (monthly_expenses === undefined || monthly_expenses <= 0) return { error: '"monthly_expenses" must be a positive number' };
  if (current_savings < 0) return { error: '"current_savings" must be 0 or greater' };
  if (monthly_contribution < 0) return { error: '"monthly_contribution" must be 0 or greater' };
  if (dependents < 0 || dependents > 20 || !Number.isInteger(dependents)) return { error: '"dependents" must be an integer between 0 and 20' };
  if (!(job_stability in STABILITY_BASE)) return { error: '"job_stability" must be one of: stable, variable, unstable' };
  if (target_months !== undefined && (target_months < 1 || target_months > 24)) return { error: '"target_months" must be between 1 and 24' };

  return {
    monthly_expenses, current_savings, monthly_contribution,
    dependents, job_stability: job_stability as EmergencyFundInput['job_stability'],
    ...(target_months !== undefined ? { target_months: Math.round(target_months) } : {}),
  };
}

export function computeEmergencyFund(i: EmergencyFundInput): EmergencyFundResult {
  const base = STABILITY_BASE[i.job_stability];
  const dependentBonus = Math.min(i.dependents, 3); // up to +3 months for dependents
  const recommended_target_months = i.target_months ?? clamp(base + dependentBonus, 3, 12);
  const recommended_target_amount = recommended_target_months * i.monthly_expenses;

  const current_coverage_months = i.monthly_expenses > 0 ? i.current_savings / i.monthly_expenses : null;
  const funded_percent = clamp(i.current_savings / recommended_target_amount, 0, 1) * 100;
  const gap = Math.max(0, recommended_target_amount - i.current_savings);
  const months_to_goal = gap === 0 ? 0 : i.monthly_contribution > 0 ? Math.ceil(gap / i.monthly_contribution) : null;

  let status: EmergencyFundResult['status'];
  const cov = current_coverage_months ?? 0;
  if (cov >= recommended_target_months) status = 'fully_funded';
  else if (cov >= 3) status = 'adequate';
  else if (cov >= 1) status = 'underfunded';
  else status = 'critical';

  return {
    recommended_target_months,
    recommended_target_amount: round(recommended_target_amount),
    current_coverage_months: current_coverage_months === null ? null : round(current_coverage_months, 1),
    funded_percent: round(funded_percent, 1),
    gap: round(gap),
    monthly_contribution: round(i.monthly_contribution),
    months_to_goal,
    status,
  };
}

// Time-to-goal across a few contribution levels (relative to the supplied
// contribution, or expense-based when none is given). Deterministic.
function fundSensitivity(i: EmergencyFundInput, gap: number): { monthly_contribution: number; months_to_goal: number }[] {
  const c = i.monthly_contribution;
  const levels = c > 0
    ? [Math.round(c * 0.5), Math.round(c), Math.round(c * 2)]
    : [Math.round(i.monthly_expenses * 0.05), Math.round(i.monthly_expenses * 0.1), Math.round(i.monthly_expenses * 0.2)];
  const unique = [...new Set(levels)].filter((x) => x > 0).sort((a, b) => a - b);
  return unique.map((mc) => ({ monthly_contribution: mc, months_to_goal: gap === 0 ? 0 : Math.ceil(gap / mc) }));
}

function actions(r: EmergencyFundResult): string[] {
  const out: string[] = [];
  if (r.status === 'fully_funded') {
    out.push(`Your emergency fund covers ${r.recommended_target_months}+ months — fully funded. Redirect new savings toward debt payoff or investing.`);
  } else if (r.gap > 0 && r.months_to_goal !== null) {
    out.push(`Save ${r.gap} more to hit your ${r.recommended_target_months}-month target; at ${r.monthly_contribution}/mo that takes ${r.months_to_goal} month(s).`);
  } else if (r.gap > 0) {
    out.push(`You have a ${r.gap} gap to your ${r.recommended_target_months}-month target — set up an automatic monthly contribution to close it.`);
  }
  if (r.status === 'critical') out.push('Coverage is under one month — prioritize building a starter fund before any discretionary spending or extra debt payoff.');
  out.push('Keep emergency savings in a liquid, separate high-yield account, not invested in volatile assets.');
  return out;
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Emergency Fund Calculator API', version: '1.0.0',
    description: 'Deterministic emergency-fund target, current coverage, funding gap, and time-to-goal. Recommended months scale with job stability and dependents. Real arithmetic — never estimated.',
    openapi_url: 'https://orbis-apis.onrender.com/emergency-fund-calculator/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/calculate', summary: 'Target, coverage, gap, and time-to-goal', price_usdc: 0.005 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL emergency-fund analysis + reasoning + actions', price_usdc: 0.01 },
    ],
    pricing: [
      { path: '/calculate', price_usdc: 0.005, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.01, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

function chains() {
  return [
    { api: 'financial-health-checker', reason: 'See how emergency-fund coverage rolls into your overall financial health score.' },
    { api: 'personal-finance-agent', reason: 'Get a full prioritized plan across savings, debt, and refinancing in one call.' },
  ];
}

router.post('/calculate', (req: Request, res: Response) => {
  const t0 = Date.now();
  const parsed = parseEmergencyFund(req.body);
  if ('error' in parsed) return fail(res, t0, 400, 'invalid_request', parsed.error);
  const r = computeEmergencyFund(parsed);
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
  const parsed = parseEmergencyFund(req.body);
  if ('error' in parsed) return fail(res, t0, 400, 'invalid_request', parsed.error);
  const r = computeEmergencyFund(parsed);
  respond(res, t0, {
    ...r,
    sensitivity_analysis: fundSensitivity(parsed, r.gap),
    reasoning: {
      why_result_generated: `Recommended ${r.recommended_target_months} months based on ${parsed.job_stability} income and ${parsed.dependents} dependent(s), then measured current savings against ${r.recommended_target_amount}.`,
      key_factors: [
        `Status: ${r.status} (${r.current_coverage_months ?? 0} month(s) of coverage now).`,
        `Target: ${r.recommended_target_months} months = ${r.recommended_target_amount}.`,
        r.gap > 0 ? `Gap of ${r.gap}${r.months_to_goal !== null ? `, ~${r.months_to_goal} month(s) to close at ${r.monthly_contribution}/mo` : ' (no monthly contribution set)'}.` : 'No gap — target met.',
      ],
      invalidators: [
        'A change in monthly_expenses shifts both the target and current coverage.',
        'Job loss or a new dependent raises the recommended number of months.',
        'Tapping the fund for non-emergencies resets coverage.',
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
