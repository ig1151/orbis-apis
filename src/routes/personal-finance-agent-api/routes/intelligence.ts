import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { num, FINANCIAL_DISCLAIMER } from '../../_aplus/finance';
import { computeHealth, HealthInput } from '../../financial-health-checker-api/routes/intelligence';
import { computeEmergencyFund, EmergencyFundInput } from '../../emergency-fund-calculator-api/routes/intelligence';
import { computeRefinance, parseRefinance, RefinanceResult } from '../../refinance-calculator-api/routes/intelligence';

// ONE-CALL personal-finance aggregator. Composes the deterministic health,
// emergency-fund, and refinance calculators into a single prioritized plan.
// No LLM — every sub-result is real arithmetic.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };
const STABILITIES = ['stable', 'variable', 'unstable'];

interface PlanItem { priority: number; area: string; recommendation: string; }

function buildPlan(
  health: ReturnType<typeof computeHealth>,
  fund: ReturnType<typeof computeEmergencyFund>,
  refi: RefinanceResult | null,
): PlanItem[] {
  const items: string[] = [];
  if (fund.status === 'critical') items.push('emergency_fund:Build a starter emergency fund first — coverage is under one month, which is the biggest risk to the rest of your plan.');
  if (health.component_scores.debt < 60) items.push(`debt:Reduce debt-to-income (now ${(health.ratios.debt_to_income * 100).toFixed(0)}%) toward ≤ 36% by paying down high-rate balances.`);
  if (refi && refi.worth_it) items.push(`refinance:Refinance to save ${refi.monthly_savings}/mo (break-even ${refi.break_even_months} month(s)) and redirect the savings to your top priority.`);
  if (fund.status === 'underfunded' || fund.status === 'adequate') items.push(`emergency_fund:Continue funding toward ${fund.recommended_target_months} months (gap ${fund.gap}${fund.months_to_goal !== null ? `, ~${fund.months_to_goal} month(s)` : ''}).`);
  if (health.component_scores.savings < 75) items.push(`savings:Raise your savings rate (now ${(health.ratios.savings_rate * 100).toFixed(0)}%) toward 20% via automatic transfers.`);
  if (health.ratios.net_worth < 0) items.push('net_worth:Grow net worth by paying down liabilities faster than new ones accrue.');
  if (refi && !refi.worth_it && refi.monthly_savings <= 0) items.push('refinance:Skip refinancing under the given terms — it does not lower your payment.');
  if (items.length === 0) items.push('maintain:Core ratios are strong — keep automating savings and review allocations annually.');

  return items.slice(0, 5).map((s, idx) => {
    const i = s.indexOf(':');
    return { priority: idx + 1, area: s.slice(0, i), recommendation: s.slice(i + 1) };
  });
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Personal Finance Agent API', version: '1.0.0',
    description: 'ONE-CALL personal-finance planner: composes deterministic financial-health, emergency-fund, and refinance analysis into a single prioritized action plan. Real arithmetic — never estimated.',
    openapi_url: 'https://orbis-apis.onrender.com/personal-finance-agent/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL full financial profile → health + emergency fund + refinance + prioritized plan', price_usdc: 0.06 },
    ],
    pricing: [
      { path: '/lookup', price_usdc: 0.06, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body ?? {};

  const monthly_income = num(b.monthly_income);
  const monthly_expenses = num(b.monthly_expenses);
  if (monthly_income === undefined || monthly_income <= 0) return fail(res, t0, 400, 'invalid_request', '"monthly_income" must be a positive number (monthly take-home)');
  if (monthly_expenses === undefined || monthly_expenses <= 0) return fail(res, t0, 400, 'invalid_request', '"monthly_expenses" must be a positive number');

  const monthly_debt_payments = num(b.monthly_debt_payments) ?? 0;
  const monthly_savings = num(b.monthly_savings) ?? 0;
  const liquid_savings = num(b.liquid_savings) ?? 0;
  const total_assets = num(b.total_assets) ?? 0;
  const total_liabilities = num(b.total_liabilities) ?? 0;
  const dependents = num(b.dependents) ?? 0;
  const job_stability = b.job_stability ?? 'stable';

  for (const [k, v] of Object.entries({ monthly_debt_payments, monthly_savings, liquid_savings, total_assets, total_liabilities })) {
    if (v < 0) return fail(res, t0, 400, 'invalid_request', `"${k}" must be 0 or greater`);
  }
  if (dependents < 0 || dependents > 20 || !Number.isInteger(dependents)) return fail(res, t0, 400, 'invalid_request', '"dependents" must be an integer between 0 and 20');
  if (!STABILITIES.includes(job_stability)) return fail(res, t0, 400, 'invalid_request', '"job_stability" must be one of: stable, variable, unstable');

  // Optional refinance sub-analysis — validated with the refinance calculator's own parser.
  let refi: RefinanceResult | null = null;
  if (b.loan !== undefined && b.loan !== null) {
    const parsedLoan = parseRefinance(b.loan);
    if ('error' in parsedLoan) return fail(res, t0, 400, 'invalid_loan', `loan: ${parsedLoan.error}`);
    refi = computeRefinance(parsedLoan);
  }

  const healthInput: HealthInput = { monthly_income, monthly_expenses, monthly_debt_payments, monthly_savings, liquid_savings, total_assets, total_liabilities };
  const health = computeHealth(healthInput);

  const fundInput: EmergencyFundInput = {
    monthly_expenses, current_savings: liquid_savings, monthly_contribution: monthly_savings,
    dependents, job_stability: job_stability as EmergencyFundInput['job_stability'],
  };
  const fund = computeEmergencyFund(fundInput);

  const plan = buildPlan(health, fund, refi);

  respond(res, t0, {
    overall_health_score: health.health_score,
    grade: health.grade,
    risk_level: health.risk_level,
    top_priority: plan[0].area,
    health_summary: {
      health_score: health.health_score,
      grade: health.grade,
      component_scores: health.component_scores,
      ratios: health.ratios,
    },
    emergency_fund_summary: {
      status: fund.status,
      recommended_target_months: fund.recommended_target_months,
      current_coverage_months: fund.current_coverage_months,
      gap: fund.gap,
      months_to_goal: fund.months_to_goal,
    },
    refinance_summary: refi === null ? null : {
      worth_it: refi.worth_it,
      monthly_savings: refi.monthly_savings,
      break_even_months: refi.break_even_months,
      lifetime_savings: refi.lifetime_savings,
    },
    action_plan: plan,
    reasoning: {
      why_result_generated: `Composed a financial-health score (${health.health_score}/100), an emergency-fund check (${fund.status}), and ${refi ? 'a refinance analysis' : 'no refinance (no loan supplied)'} into a ${plan.length}-step plan ordered by impact.`,
      key_factors: [
        `Top priority: ${plan[0].area}.`,
        `Health grade ${health.grade} (risk ${health.risk_level}); weakest component ${Object.entries(health.component_scores).sort((a, b) => a[1] - b[1])[0][0]}.`,
        `Emergency fund: ${fund.status}, ${fund.current_coverage_months ?? 0}/${fund.recommended_target_months} months.`,
        refi ? `Refinance ${refi.worth_it ? 'worthwhile' : 'not worthwhile'} (${refi.monthly_savings}/mo).` : 'No loan provided — refinance not evaluated.',
      ],
      invalidators: [
        'Income is treated as monthly take-home; gross income changes the ratios.',
        'Omitting a debt, asset, or the loan block changes the plan ordering.',
        'Irregular income makes a single-month snapshot less representative.',
      ],
    },
    confidence_score: 1.0,
    recommended_actions_priority_order: plan.map((p) => p.recommendation),
    chain_to: [
      { api: 'financial-health-checker', reason: 'Full health-score breakdown and component sub-scores.' },
      { api: 'emergency-fund-calculator', reason: 'Detailed emergency-fund target and time-to-goal.' },
      { api: 'refinance-calculator', reason: 'Full refinance numbers and rate sensitivity.' },
      { api: 'mortgage-refinance', reason: 'Mortgage-specific refinance (LTV, PMI, points) if the loan is a mortgage.' },
    ],
    financial_disclaimer: FINANCIAL_DISCLAIMER,
    privacy: PRIVACY,
  });
});

export default router;
