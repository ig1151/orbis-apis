import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { monthlyRate, round, num, FINANCIAL_DISCLAIMER } from '../../_aplus/finance';

// Deterministic debt-payoff planner. Simulates the avalanche (highest-APR first)
// and snowball (smallest-balance first) strategies month-by-month with real
// interest accrual and minimum-payment rollover — no LLM, no estimates.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };
const MAX_MONTHS = 1200; // 100-year cap; beyond this we report "never pays off"

export interface DebtInput { name: string; balance: number; apr: number; min_payment: number; }
export interface DebtPayoffInput { debts: DebtInput[]; extra_monthly_payment: number; }

interface StrategyResult {
  strategy: 'avalanche' | 'snowball';
  months_to_debt_free: number | null;
  total_interest_paid: number;
  total_paid: number;
  payoff_order: { name: string; payoff_month: number }[];
  never_payoff: boolean;
}

type Parsed = DebtPayoffInput | { error: string };

export function parseDebtPayoff(body: any): Parsed {
  const rawDebts = body?.debts;
  if (!Array.isArray(rawDebts) || rawDebts.length === 0) return { error: '"debts" must be a non-empty array of { name, balance, apr, min_payment }' };
  if (rawDebts.length > 50) return { error: '"debts" may contain at most 50 entries' };
  const debts: DebtInput[] = [];
  for (let k = 0; k < rawDebts.length; k++) {
    const d = rawDebts[k];
    const balance = num(d?.balance);
    const apr = num(d?.apr);
    const min_payment = num(d?.min_payment);
    const name = typeof d?.name === 'string' && d.name.trim() ? d.name.trim() : `debt_${k + 1}`;
    if (balance === undefined || balance <= 0) return { error: `debts[${k}].balance must be a positive number` };
    if (apr === undefined || apr < 0 || apr > 100) return { error: `debts[${k}].apr must be between 0 and 100` };
    if (min_payment === undefined || min_payment < 0) return { error: `debts[${k}].min_payment must be 0 or greater` };
    debts.push({ name, balance, apr, min_payment });
  }
  const extra_monthly_payment = num(body?.extra_monthly_payment) ?? 0;
  if (extra_monthly_payment < 0) return { error: '"extra_monthly_payment" must be 0 or greater' };
  return { debts, extra_monthly_payment };
}

function order(debts: DebtInput[], strategy: 'avalanche' | 'snowball'): number[] {
  const idx = debts.map((_, i) => i);
  // stable tie-break on original index so results are reproducible
  return idx.sort((a, b) => {
    const A = debts[a], B = debts[b];
    const primary = strategy === 'avalanche' ? B.apr - A.apr : A.balance - B.balance;
    return primary !== 0 ? primary : a - b;
  });
}

// Full simulation with minimum-payment rollover + extra applied to the focus debt.
function simulate(debts: DebtInput[], extra: number, strategy: 'avalanche' | 'snowball'): StrategyResult {
  const bal = debts.map(d => d.balance);
  const seq = order(debts, strategy);
  const budget0 = debts.reduce((s, d) => s + d.min_payment, 0) + extra;
  const paidMonth = new Array<number | null>(debts.length).fill(null);
  let month = 0, totalInterest = 0, totalPaid = 0;

  const active = () => bal.some(b => b > 0.005);
  while (active() && month < MAX_MONTHS) {
    month++;
    for (let i = 0; i < bal.length; i++) {
      if (bal[i] > 0.005) { const interest = bal[i] * monthlyRate(debts[i].apr); bal[i] += interest; totalInterest += interest; }
    }
    let budget = budget0;
    // 1) minimums on every active debt
    for (const i of seq) {
      if (bal[i] <= 0.005 || budget <= 0.005) continue;
      const pay = Math.min(debts[i].min_payment, bal[i], budget);
      bal[i] -= pay; budget -= pay; totalPaid += pay;
    }
    // 2) roll remaining budget into the focus debt(s) in priority order
    for (const i of seq) {
      if (budget <= 0.005) break;
      if (bal[i] <= 0.005) continue;
      const pay = Math.min(budget, bal[i]);
      bal[i] -= pay; budget -= pay; totalPaid += pay;
    }
    for (const i of seq) if (bal[i] <= 0.005 && paidMonth[i] === null) paidMonth[i] = month;
  }

  const never = active();
  const payoff_order = seq
    .filter(i => paidMonth[i] !== null)
    .map(i => ({ name: debts[i].name, payoff_month: paidMonth[i] as number }))
    .sort((a, b) => a.payoff_month - b.payoff_month);

  return {
    strategy,
    months_to_debt_free: never ? null : month,
    total_interest_paid: round(totalInterest),
    total_paid: round(totalPaid),
    payoff_order,
    never_payoff: never,
  };
}

// Baseline: pay only each debt's own minimum, no extra, no rollover.
function minimumsOnly(debts: DebtInput[]): { months_to_debt_free: number | null; total_interest_paid: number | null; never_payoff: boolean } {
  const bal = debts.map(d => d.balance);
  let month = 0, totalInterest = 0;
  const active = () => bal.some(b => b > 0.005);
  while (active() && month < MAX_MONTHS) {
    month++;
    for (let i = 0; i < bal.length; i++) {
      if (bal[i] <= 0.005) continue;
      const interest = bal[i] * monthlyRate(debts[i].apr); bal[i] += interest; totalInterest += interest;
      const pay = Math.min(debts[i].min_payment, bal[i]);
      bal[i] -= pay;
    }
  }
  const never = active();
  return { months_to_debt_free: never ? null : month, total_interest_paid: never ? null : round(totalInterest), never_payoff: never };
}

export interface DebtPlan {
  total_debt: number;
  total_minimum_payment: number;
  extra_monthly_payment: number;
  monthly_budget: number;
  avalanche: StrategyResult;
  snowball: StrategyResult;
  minimums_only: { months_to_debt_free: number | null; total_interest_paid: number | null; never_payoff: boolean };
  recommended_strategy: 'avalanche' | 'snowball';
  recommended_reason: string;
  interest_saved_vs_minimums: number | null;
  months_saved_vs_minimums: number | null;
  debt_free_in_months: number | null;
  never_payoff: boolean;
}

export function computePlan(i: DebtPayoffInput): DebtPlan {
  const total_debt = round(i.debts.reduce((s, d) => s + d.balance, 0));
  const total_minimum_payment = round(i.debts.reduce((s, d) => s + d.min_payment, 0));
  const avalanche = simulate(i.debts, i.extra_monthly_payment, 'avalanche');
  const snowball = simulate(i.debts, i.extra_monthly_payment, 'snowball');
  const mins = minimumsOnly(i.debts);

  // Avalanche always pays the least (or equal) interest. Prefer snowball only when
  // the interest cost is essentially the same but it clears a debt sooner.
  const interestGap = snowball.total_interest_paid - avalanche.total_interest_paid;
  const negligible = interestGap <= Math.max(25, total_debt * 0.01);
  const snowballFasterFirstWin = (snowball.payoff_order[0]?.payoff_month ?? Infinity) < (avalanche.payoff_order[0]?.payoff_month ?? Infinity);
  let recommended_strategy: 'avalanche' | 'snowball' = 'avalanche';
  let recommended_reason = `Avalanche pays off highest-APR debt first, minimizing total interest (${round(interestGap)} less than snowball).`;
  if (avalanche.never_payoff && !snowball.never_payoff) {
    recommended_strategy = 'snowball';
    recommended_reason = 'Snowball reaches debt-free within the modeled horizon while avalanche does not under these payments.';
  } else if (negligible && snowballFasterFirstWin) {
    recommended_strategy = 'snowball';
    recommended_reason = `Interest cost is within ${round(interestGap)} of avalanche, and snowball eliminates your first debt sooner (month ${snowball.payoff_order[0]?.payoff_month}) for faster momentum.`;
  }

  const chosen = recommended_strategy === 'avalanche' ? avalanche : snowball;
  const interest_saved_vs_minimums = mins.total_interest_paid === null ? null : round(mins.total_interest_paid - chosen.total_interest_paid);
  const months_saved_vs_minimums = mins.months_to_debt_free === null || chosen.months_to_debt_free === null ? null : mins.months_to_debt_free - chosen.months_to_debt_free;

  return {
    total_debt,
    total_minimum_payment,
    extra_monthly_payment: round(i.extra_monthly_payment),
    monthly_budget: round(total_minimum_payment + i.extra_monthly_payment),
    avalanche,
    snowball,
    minimums_only: mins,
    recommended_strategy,
    recommended_reason,
    interest_saved_vs_minimums,
    months_saved_vs_minimums,
    debt_free_in_months: chosen.months_to_debt_free,
    never_payoff: chosen.never_payoff,
  };
}

function sensitivity(i: DebtPayoffInput) {
  const deltas = [0, 50, 100, 200];
  return deltas.map((d) => {
    const r = simulate(i.debts, i.extra_monthly_payment + d, 'avalanche');
    return {
      extra_monthly_payment: round(i.extra_monthly_payment + d),
      months_to_debt_free: r.months_to_debt_free,
      total_interest_paid: r.total_interest_paid,
    };
  });
}

function assumptions(i: DebtPayoffInput): string[] {
  return [
    'Interest accrues monthly at APR/12 on the remaining balance of each debt.',
    'You make every minimum payment on time; freed minimums roll into the focus debt as each debt is cleared.',
    `Your full monthly budget (${round(i.debts.reduce((s, d) => s + d.min_payment, 0) + i.extra_monthly_payment)}) stays constant until you are debt-free.`,
    'No new charges, fees, promotional/teaser rates, or rate changes are modeled.',
  ];
}

function actions(p: DebtPlan): string[] {
  const out: string[] = [];
  if (p.never_payoff) {
    out.push('Your payments do not cover the interest on at least one debt — increase the monthly payment or reduce the rate, or these balances will never clear.');
    out.push('Prioritize the highest-APR balance and consider a balance transfer or consolidation to a lower rate.');
    return out;
  }
  out.push(`Use the ${p.recommended_strategy} strategy: ${p.recommended_reason}`);
  out.push(`Direct all ${p.extra_monthly_payment > 0 ? `${p.monthly_budget}/mo (incl. ${p.extra_monthly_payment} extra)` : `${p.monthly_budget}/mo`} per the payoff order; you are debt-free in ${p.debt_free_in_months} month(s).`);
  if (p.interest_saved_vs_minimums !== null && p.interest_saved_vs_minimums > 0) out.push(`This saves ${p.interest_saved_vs_minimums} in interest vs paying only minimums.`);
  if (p.extra_monthly_payment === 0) out.push('Adding any extra monthly payment shortens the timeline and cuts interest — see the sensitivity table.');
  return out;
}

const CHAIN_TO = [
  { api: 'budget-planner', reason: 'Find room in your budget to fund the extra debt payment.' },
  { api: 'financial-health-checker', reason: 'See how this payoff plan moves your debt-to-income and overall score.' },
  { api: 'personal-finance-agent', reason: 'Combine payoff, budget, and savings into one prioritized action plan.' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Debt Payoff Planner API', version: '1.0.0',
    description: 'Deterministic debt-payoff planner. Simulates avalanche (highest-APR first) and snowball (smallest-balance first) strategies with real monthly interest and minimum rollover, then recommends one and quantifies interest/time saved vs paying only minimums.',
    openapi_url: 'https://orbis-apis.onrender.com/debt-payoff-planner/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/plan', summary: 'Compare avalanche vs snowball + recommended strategy', price_usdc: 0.01 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL payoff plan + reasoning + extra-payment sensitivity', price_usdc: 0.02 },
    ],
    pricing: [
      { path: '/plan', price_usdc: 0.01, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.02, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/plan', (req: Request, res: Response) => {
  const t0 = Date.now();
  const parsed = parseDebtPayoff(req.body);
  if ('error' in parsed) return fail(res, t0, 400, 'invalid_request', parsed.error);
  const p = computePlan(parsed);
  respond(res, t0, {
    ...p,
    confidence_score: 1.0,
    recommended_actions_priority_order: actions(p),
    chain_to: CHAIN_TO,
    financial_disclaimer: FINANCIAL_DISCLAIMER,
    privacy: PRIVACY,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const parsed = parseDebtPayoff(req.body);
  if ('error' in parsed) return fail(res, t0, 400, 'invalid_request', parsed.error);
  const p = computePlan(parsed);
  respond(res, t0, {
    ...p,
    assumptions: assumptions(parsed),
    sensitivity_analysis: sensitivity(parsed),
    reasoning: {
      why_result_generated: `Simulated each debt month-by-month under both strategies on a ${p.monthly_budget}/mo budget, accruing APR/12 interest and rolling freed minimums into the focus debt.`,
      key_factors: [
        `Total debt ${p.total_debt} across ${parsed.debts.length} balance(s); minimum payments ${p.total_minimum_payment}/mo + ${p.extra_monthly_payment} extra.`,
        p.never_payoff ? 'At least one debt is not covered by current payments and never clears.' : `Recommended ${p.recommended_strategy}: debt-free in ${p.debt_free_in_months} month(s), ${p.avalanche.total_interest_paid} (avalanche) vs ${p.snowball.total_interest_paid} (snowball) total interest.`,
        p.interest_saved_vs_minimums !== null ? `Saves ${p.interest_saved_vs_minimums} in interest and ${p.months_saved_vs_minimums} month(s) vs minimums-only.` : 'Minimums-only never clears the debt for comparison.',
      ],
      invalidators: [
        'Adding new charges or missing a payment changes the timeline and interest.',
        'Promotional/teaser APRs or variable rates not entered will alter accrual.',
        'A balance transfer or consolidation to a lower rate would change the optimal order.',
      ],
    },
    confidence_score: 1.0,
    recommended_actions_priority_order: actions(p),
    chain_to: CHAIN_TO,
    financial_disclaimer: FINANCIAL_DISCLAIMER,
    privacy: PRIVACY,
  });
});

export default router;
