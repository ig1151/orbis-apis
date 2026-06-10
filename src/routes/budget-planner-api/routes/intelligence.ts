import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { round, num, clamp, FINANCIAL_DISCLAIMER } from '../../_aplus/finance';

// Deterministic 50/30/20 budget analyzer. Buckets monthly spending into
// needs / wants / savings, compares actual allocation to the 50/30/20 rule,
// and reports the savings rate and any overspending. Pure arithmetic, no LLM.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };
const RULE = { needs: 0.5, wants: 0.3, savings: 0.2 };
type Bucket = 'need' | 'want' | 'savings';

export interface ExpenseItem { category: string; amount: number; classification: Bucket; }
export interface BudgetInput {
  monthly_income: number;
  total_needs: number;
  total_wants: number;
  total_savings: number;
  expenses: ExpenseItem[]; // [] when totals were supplied directly
}

type Parsed = BudgetInput | { error: string };

export function parseBudget(body: any): Parsed {
  const monthly_income = num(body?.monthly_income);
  if (monthly_income === undefined || monthly_income <= 0) return { error: '"monthly_income" must be a positive number (after-tax monthly income)' };

  const rawExpenses = body?.expenses;
  if (Array.isArray(rawExpenses) && rawExpenses.length > 0) {
    if (rawExpenses.length > 200) return { error: '"expenses" may contain at most 200 entries' };
    const expenses: ExpenseItem[] = [];
    let total_needs = 0, total_wants = 0, total_savings = 0;
    for (let k = 0; k < rawExpenses.length; k++) {
      const e = rawExpenses[k];
      const amount = num(e?.amount);
      const classification = e?.classification;
      const category = typeof e?.category === 'string' && e.category.trim() ? e.category.trim() : `item_${k + 1}`;
      if (amount === undefined || amount < 0) return { error: `expenses[${k}].amount must be 0 or greater` };
      if (classification !== 'need' && classification !== 'want' && classification !== 'savings') return { error: `expenses[${k}].classification must be one of "need", "want", "savings"` };
      expenses.push({ category, amount, classification });
      if (classification === 'need') total_needs += amount;
      else if (classification === 'want') total_wants += amount;
      else total_savings += amount;
    }
    return { monthly_income, total_needs, total_wants, total_savings, expenses };
  }

  // direct totals mode
  const total_needs = num(body?.needs);
  const total_wants = num(body?.wants);
  const total_savings = num(body?.savings) ?? 0;
  if (total_needs === undefined || total_wants === undefined) {
    return { error: 'Provide "expenses" (array of { category, amount, classification }) or the totals "needs" and "wants" (and optional "savings").' };
  }
  if (total_needs < 0 || total_wants < 0 || total_savings < 0) return { error: '"needs", "wants", and "savings" must be 0 or greater' };
  return { monthly_income, total_needs, total_wants, total_savings, expenses: [] };
}

export interface BudgetResult {
  monthly_income: number;
  total_needs: number;
  total_wants: number;
  total_savings: number;
  total_allocated: number;
  unallocated: number;
  needs_pct: number;
  wants_pct: number;
  savings_pct: number;
  recommended_needs: number;
  recommended_wants: number;
  recommended_savings: number;
  variance: { needs: number; wants: number; savings: number };
  savings_rate: number;
  status: 'overspending' | 'balanced' | 'surplus';
  category_breakdown: { category: string; classification: Bucket; amount: number; pct_of_income: number }[];
}

export function computeBudget(i: BudgetInput): BudgetResult {
  const total_allocated = i.total_needs + i.total_wants + i.total_savings;
  const unallocated = i.monthly_income - total_allocated;
  const pct = (n: number) => round((n / i.monthly_income) * 100, 1);

  const recommended_needs = round(i.monthly_income * RULE.needs);
  const recommended_wants = round(i.monthly_income * RULE.wants);
  const recommended_savings = round(i.monthly_income * RULE.savings);

  let status: BudgetResult['status'] = 'balanced';
  if (unallocated < -0.005) status = 'overspending';
  else if (unallocated > i.monthly_income * 0.05) status = 'surplus';

  return {
    monthly_income: round(i.monthly_income),
    total_needs: round(i.total_needs),
    total_wants: round(i.total_wants),
    total_savings: round(i.total_savings),
    total_allocated: round(total_allocated),
    unallocated: round(unallocated),
    needs_pct: pct(i.total_needs),
    wants_pct: pct(i.total_wants),
    savings_pct: pct(i.total_savings),
    recommended_needs,
    recommended_wants,
    recommended_savings,
    variance: {
      needs: round(i.total_needs - recommended_needs),
      wants: round(i.total_wants - recommended_wants),
      savings: round(i.total_savings - recommended_savings),
    },
    savings_rate: round(clamp(i.total_savings / i.monthly_income, -10, 10), 4),
    status,
    category_breakdown: i.expenses.map(e => ({ category: e.category, classification: e.classification, amount: round(e.amount), pct_of_income: pct(e.amount) })),
  };
}

function actions(r: BudgetResult): string[] {
  const out: string[] = [];
  if (r.status === 'overspending') {
    out.push(`You are spending ${Math.abs(r.unallocated)} more than you earn each month — cut wants (currently ${r.wants_pct}% vs the 30% guide) or reduce needs to close the gap.`);
  } else if (r.status === 'surplus') {
    out.push(`You have ${r.unallocated} unallocated each month — direct it to savings or debt payoff to lift your ${Math.round(r.savings_rate * 100)}% savings rate toward 20%.`);
  } else {
    out.push('Your budget roughly balances; fine-tune toward the 50/30/20 targets below.');
  }
  if (r.variance.needs > 0) out.push(`Needs are ${r.variance.needs} over the 50% guide (${r.needs_pct}%) — the biggest lever is usually housing/transport.`);
  if (r.savings_pct < 20) out.push(`Savings is ${r.savings_pct}% of income; aim for 20% (${r.recommended_savings}/mo) including retirement and emergency fund.`);
  if (r.variance.wants > 0) out.push(`Wants are ${r.variance.wants} over the 30% guide — trim discretionary categories first.`);
  return out;
}

const CHAIN_TO = [
  { api: 'savings-goal-optimizer', reason: 'Turn freed-up budget room into a funded savings goal.' },
  { api: 'debt-payoff-planner', reason: 'Apply any surplus to an avalanche/snowball debt plan.' },
  { api: 'emergency-fund-calculator', reason: 'Size the emergency fund your savings bucket should build first.' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Budget Planner API', version: '1.0.0',
    description: 'Deterministic 50/30/20 budget analyzer. Buckets monthly spending into needs/wants/savings (from an expense list or direct totals), compares it to the 50/30/20 rule, and reports the savings rate, per-bucket variance, and any overspending. Pure arithmetic — never estimated.',
    openapi_url: 'https://orbis-apis.onrender.com/budget-planner/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/analyze', summary: 'Bucket spending and compare to 50/30/20', price_usdc: 0.008 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL budget analysis + reasoning + recommendations', price_usdc: 0.015 },
    ],
    pricing: [
      { path: '/analyze', price_usdc: 0.008, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.015, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/analyze', (req: Request, res: Response) => {
  const t0 = Date.now();
  const parsed = parseBudget(req.body);
  if ('error' in parsed) return fail(res, t0, 400, 'invalid_request', parsed.error);
  const r = computeBudget(parsed);
  respond(res, t0, {
    ...r,
    confidence_score: 1.0,
    recommended_actions_priority_order: actions(r),
    chain_to: CHAIN_TO,
    financial_disclaimer: FINANCIAL_DISCLAIMER,
    privacy: PRIVACY,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const parsed = parseBudget(req.body);
  if ('error' in parsed) return fail(res, t0, 400, 'invalid_request', parsed.error);
  const r = computeBudget(parsed);
  respond(res, t0, {
    ...r,
    assumptions: [
      'The 50/30/20 rule is a guideline applied to after-tax monthly income, not a hard rule.',
      'Savings includes intentional saving, investing, and extra debt principal — not minimum debt payments (those are needs).',
      'Figures are a monthly snapshot; irregular/annual expenses should be averaged to a monthly amount first.',
    ],
    reasoning: {
      why_result_generated: `Summed ${parsed.expenses.length ? `${parsed.expenses.length} expense line(s)` : 'the supplied totals'} into needs/wants/savings and divided by ${r.monthly_income} income to compare against 50/30/20.`,
      key_factors: [
        `Allocation: needs ${r.needs_pct}%, wants ${r.wants_pct}%, savings ${r.savings_pct}% (${r.unallocated} unallocated).`,
        `Status: ${r.status}.`,
        `Largest deviation from target: ${[['needs', r.variance.needs], ['wants', r.variance.wants], ['savings', r.variance.savings]].sort((a, b) => Math.abs(b[1] as number) - Math.abs(a[1] as number))[0][0]}.`,
      ],
      invalidators: [
        'Misclassifying a need as a want (or vice versa) shifts the buckets.',
        'Pre-tax vs after-tax income changes every percentage.',
        'One-off months (bonuses, large purchases) are not representative.',
      ],
    },
    confidence_score: 1.0,
    recommended_actions_priority_order: actions(r),
    chain_to: CHAIN_TO,
    financial_disclaimer: FINANCIAL_DISCLAIMER,
    privacy: PRIVACY,
  });
});

export default router;
