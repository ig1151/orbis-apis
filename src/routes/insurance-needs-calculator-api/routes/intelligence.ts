import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { round, num, FINANCIAL_DISCLAIMER, EXECUTION_METADATA } from '../../_aplus/finance';

// Deterministic life-insurance needs calculator using the DIME method
// (Debt + Income replacement + Mortgage + Education) plus final expenses, netted
// against existing coverage and liquid assets. Real arithmetic — no LLM.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };
const CONFIDENCE_PER_SECTION = { dime: 1, coverage_gap: 1 };

export interface InsuranceInput {
  annual_income: number;
  years_income_replacement: number;
  non_mortgage_debt: number;
  mortgage_balance: number;
  education_fund_needed: number;
  final_expenses: number;
  existing_coverage: number;
  liquid_assets: number;
}

type Parsed = InsuranceInput | { error: string };

export function parseInsurance(body: any): Parsed {
  const annual_income = num(body?.annual_income);
  const years_income_replacement = num(body?.years_income_replacement) ?? 10;
  const non_mortgage_debt = num(body?.non_mortgage_debt) ?? 0;
  const mortgage_balance = num(body?.mortgage_balance) ?? 0;
  const education_fund_needed = num(body?.education_fund_needed) ?? 0;
  const final_expenses = num(body?.final_expenses) ?? 15000;
  const existing_coverage = num(body?.existing_coverage) ?? 0;
  const liquid_assets = num(body?.liquid_assets) ?? 0;

  if (annual_income === undefined || annual_income < 0) return { error: '"annual_income" must be 0 or greater (use 0 for a non-earning caregiver — a need can still arise from debt, mortgage, and education)' };
  if (years_income_replacement < 0 || years_income_replacement > 50) return { error: '"years_income_replacement" must be between 0 and 50' };
  for (const [k, v] of Object.entries({ non_mortgage_debt, mortgage_balance, education_fund_needed, final_expenses, existing_coverage, liquid_assets })) {
    if ((v as number) < 0) return { error: `"${k}" must be 0 or greater` };
  }
  return { annual_income, years_income_replacement, non_mortgage_debt, mortgage_balance, education_fund_needed, final_expenses, existing_coverage, liquid_assets };
}

export interface InsuranceResult {
  dime_breakdown: { debt: number; income_replacement: number; mortgage: number; education: number; final_expenses: number };
  total_need: number;
  existing_coverage: number;
  liquid_assets: number;
  coverage_gap: number;
  recommended_coverage: number;
  income_multiplier_estimate: number;
  adequately_insured: boolean;
}

function roundUpTo(n: number, step: number): number { return Math.ceil(n / step) * step; }

export function computeInsurance(i: InsuranceInput): InsuranceResult {
  const income_replacement = i.annual_income * i.years_income_replacement;
  const total_need = i.non_mortgage_debt + income_replacement + i.mortgage_balance + i.education_fund_needed + i.final_expenses;
  const offsets = i.existing_coverage + i.liquid_assets;
  const coverage_gap = Math.max(0, total_need - offsets);
  return {
    dime_breakdown: {
      debt: round(i.non_mortgage_debt),
      income_replacement: round(income_replacement),
      mortgage: round(i.mortgage_balance),
      education: round(i.education_fund_needed),
      final_expenses: round(i.final_expenses),
    },
    total_need: round(total_need),
    existing_coverage: round(i.existing_coverage),
    liquid_assets: round(i.liquid_assets),
    coverage_gap: round(coverage_gap),
    recommended_coverage: coverage_gap > 0 ? roundUpTo(coverage_gap, 25000) : 0,
    income_multiplier_estimate: round(i.annual_income * 10),
    adequately_insured: offsets >= total_need,
  };
}

function sensitivity(i: InsuranceInput) {
  return [5, 10, 15, 20].map((yrs) => {
    const r = computeInsurance({ ...i, years_income_replacement: yrs });
    return { years_income_replacement: yrs, total_need: r.total_need, coverage_gap: r.coverage_gap };
  });
}

function actions(r: InsuranceResult): string[] {
  const out: string[] = [];
  if (r.adequately_insured) {
    out.push(`You appear adequately covered: existing coverage + liquid assets (${round(r.existing_coverage + r.liquid_assets)}) meet the ${r.total_need} estimated need.`);
  } else {
    out.push(`Consider about ${r.recommended_coverage} in additional term life coverage to close the ${r.coverage_gap} gap.`);
    out.push('Term life is usually the most cost-effective way to cover a temporary need (working years, mortgage, kids at home).');
  }
  out.push(`Cross-check: the 10× income rule of thumb suggests ~${r.income_multiplier_estimate}; DIME is more precise because it uses your actual obligations.`);
  return out;
}

const CHAIN_TO = [
  { api: 'net-worth-tracker', reason: 'Quantify the liquid assets that offset the insurance need.' },
  { api: 'debt-payoff-planner', reason: 'Reducing debt lowers the coverage you need.' },
  { api: 'financial-health-checker', reason: 'See how insurance fits your overall financial picture.' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Insurance Needs Calculator API', version: '1.0.0',
    description: 'Deterministic life-insurance needs calculator using the DIME method (Debt + Income replacement + Mortgage + Education) plus final expenses, netted against existing coverage and liquid assets. Returns the total need, coverage gap, and a recommended coverage amount with a 10×-income cross-check. Real arithmetic — never estimated.',
    openapi_url: 'https://orbis-apis.onrender.com/insurance-needs-calculator/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/calculate', summary: 'DIME need, coverage gap, recommended coverage', price_usdc: 0.01 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL needs analysis + reasoning + sensitivity', price_usdc: 0.02 },
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
  const parsed = parseInsurance(req.body);
  if ('error' in parsed) return fail(res, t0, 400, 'invalid_request', parsed.error);
  const r = computeInsurance(parsed);
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
  const parsed = parseInsurance(req.body);
  if ('error' in parsed) return fail(res, t0, 400, 'invalid_request', parsed.error);
  const r = computeInsurance(parsed);
  respond(res, t0, {
    ...r,
    assumptions: [
      `Income replacement = annual income × ${parsed.years_income_replacement} year(s); adjust years to match how long dependents need support.`,
      'DIME sums obligations to cover at death; it does not model survivor income, Social Security, or future raises.',
      'Final expenses default to 15,000 if not supplied; education and debt are taken as entered.',
    ],
    sensitivity_analysis: sensitivity(parsed),
    reasoning: {
      why_result_generated: `Summed debt ${r.dime_breakdown.debt}, income replacement ${r.dime_breakdown.income_replacement}, mortgage ${r.dime_breakdown.mortgage}, education ${r.dime_breakdown.education}, and final expenses ${r.dime_breakdown.final_expenses}, then subtracted ${round(r.existing_coverage + r.liquid_assets)} in existing coverage + liquid assets.`,
      key_factors: [
        `Total need ${r.total_need}; gap ${r.coverage_gap}.`,
        r.adequately_insured ? 'Existing coverage + assets already meet the need.' : `Recommended additional coverage ${r.recommended_coverage}.`,
        `Income replacement is the largest component at ${r.dime_breakdown.income_replacement}.`,
      ],
      invalidators: [
        'Changing the income-replacement horizon materially changes the need.',
        'New debt, a new mortgage, or another child raises the requirement.',
        'Growing liquid assets or existing coverage shrinks the gap.',
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
