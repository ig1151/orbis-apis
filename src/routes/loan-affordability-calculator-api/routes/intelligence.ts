import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { maxLoanForPayment, round, num, FINANCIAL_DISCLAIMER, EXECUTION_METADATA } from '../../_aplus/finance';

// Deterministic loan/home affordability calculator. Applies the standard
// front-end (28%) and back-end (36%) DTI caps to your income, subtracts existing
// debt and taxes/insurance, and inverts the amortization formula to the maximum
// loan and purchase price. Real math — no LLM.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };
const CONFIDENCE_PER_SECTION = { affordability: 1, dti_caps: 1 };

export interface AffordInput {
  annual_income: number;
  monthly_debt_payments: number;
  down_payment: number;
  annual_rate: number;
  term_months: number;
  front_end_dti_pct: number;
  back_end_dti_pct: number;
  property_tax_insurance_monthly: number;
}

type Parsed = AffordInput | { error: string };

export function parseAfford(body: any): Parsed {
  const annual_income = num(body?.annual_income);
  const monthly_debt_payments = num(body?.monthly_debt_payments) ?? 0;
  const down_payment = num(body?.down_payment) ?? 0;
  const annual_rate = num(body?.annual_rate);
  const term_months = num(body?.term_months) ?? 360;
  const front_end_dti_pct = num(body?.front_end_dti_pct) ?? 28;
  const back_end_dti_pct = num(body?.back_end_dti_pct) ?? 36;
  const property_tax_insurance_monthly = num(body?.property_tax_insurance_monthly) ?? 0;

  if (annual_income === undefined || annual_income <= 0) return { error: '"annual_income" must be a positive number' };
  if (annual_rate === undefined || annual_rate < 0 || annual_rate > 30) return { error: '"annual_rate" must be between 0 and 30' };
  if (term_months < 1 || term_months > 600) return { error: '"term_months" must be between 1 and 600' };
  if (front_end_dti_pct <= 0 || front_end_dti_pct > 100) return { error: '"front_end_dti_pct" must be between 0 and 100' };
  if (back_end_dti_pct <= 0 || back_end_dti_pct > 100) return { error: '"back_end_dti_pct" must be between 0 and 100' };
  for (const [k, v] of Object.entries({ monthly_debt_payments, down_payment, property_tax_insurance_monthly })) {
    if ((v as number) < 0) return { error: `"${k}" must be 0 or greater` };
  }
  return { annual_income, monthly_debt_payments, down_payment, annual_rate, term_months: Math.round(term_months), front_end_dti_pct, back_end_dti_pct, property_tax_insurance_monthly };
}

export interface AffordResult {
  gross_monthly_income: number;
  front_end_cap: number;
  back_end_cap: number;
  max_housing_payment: number;
  max_principal_interest_payment: number;
  max_loan_amount: number;
  max_purchase_price: number;
  down_payment: number;
  binding_constraint: 'front_end_dti' | 'back_end_dti' | 'none';
  current_back_end_dti_pct: number;
}

export function computeAfford(i: AffordInput): AffordResult {
  const gross = i.annual_income / 12;
  const front_end_cap = gross * (i.front_end_dti_pct / 100);
  const back_end_cap = gross * (i.back_end_dti_pct / 100) - i.monthly_debt_payments;
  const max_housing_payment = Math.max(0, Math.min(front_end_cap, back_end_cap));
  const binding: AffordResult['binding_constraint'] = max_housing_payment <= 0 ? 'back_end_dti' : front_end_cap <= back_end_cap ? 'front_end_dti' : 'back_end_dti';
  const max_pi = Math.max(0, max_housing_payment - i.property_tax_insurance_monthly);
  const max_loan = maxLoanForPayment(max_pi, i.annual_rate, i.term_months);
  return {
    gross_monthly_income: round(gross),
    front_end_cap: round(front_end_cap),
    back_end_cap: round(Math.max(0, back_end_cap)),
    max_housing_payment: round(max_housing_payment),
    max_principal_interest_payment: round(max_pi),
    max_loan_amount: round(max_loan),
    max_purchase_price: round(max_loan + i.down_payment),
    down_payment: round(i.down_payment),
    binding_constraint: binding,
    current_back_end_dti_pct: round((i.monthly_debt_payments / gross) * 100, 1),
  };
}

function sensitivity(i: AffordInput) {
  return [-1, -0.5, 0, 0.5, 1].map((d) => {
    const rate = round(i.annual_rate + d, 3);
    const r = computeAfford({ ...i, annual_rate: rate });
    return { annual_rate: rate, max_loan_amount: r.max_loan_amount, max_purchase_price: r.max_purchase_price };
  });
}

function actions(i: AffordInput, r: AffordResult): string[] {
  const out: string[] = [];
  if (r.max_loan_amount <= 0) {
    out.push('Existing debt already consumes your DTI budget — no room for a new housing payment. Pay down debt or raise income first.');
    return out;
  }
  out.push(`You can likely afford up to ~${r.max_purchase_price} (loan ${r.max_loan_amount} + ${r.down_payment} down) at ${i.annual_rate}% over ${Math.round(i.term_months / 12)} years.`);
  out.push(`The ${r.binding_constraint === 'front_end_dti' ? `${i.front_end_dti_pct}% front-end (housing) ` : `${i.back_end_dti_pct}% back-end (total debt) `}cap is the binding constraint at ${r.max_housing_payment}/mo.`);
  if (i.monthly_debt_payments > 0) out.push(`Reducing your ${i.monthly_debt_payments}/mo in other debt would raise the back-end headroom directly.`);
  out.push('Get a pre-approval for the real rate and PITI; lenders also weigh credit score, reserves, and property taxes.');
  return out;
}

const CHAIN_TO = [
  { api: 'dti-calculator', reason: 'See your exact front/back-end DTI and qualification band.' },
  { api: 'credit-score-estimator', reason: 'Estimate the score that drives your actual rate.' },
  { api: 'mortgage-refinance', reason: 'Once you have a loan, evaluate refinancing it.' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Loan Affordability Calculator API', version: '1.0.0',
    description: 'Deterministic loan/home affordability calculator. Applies the standard 28% front-end and 36% back-end DTI caps to your income, nets out existing debt and taxes/insurance, and inverts the amortization formula to the maximum loan amount and purchase price. Identifies the binding constraint. Real math — never estimated.',
    openapi_url: 'https://orbis-apis.onrender.com/loan-affordability-calculator/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/calculate', summary: 'Max loan, purchase price, and binding DTI constraint', price_usdc: 0.01 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL affordability + reasoning + rate sensitivity', price_usdc: 0.02 },
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
  const parsed = parseAfford(req.body);
  if ('error' in parsed) return fail(res, t0, 400, 'invalid_request', parsed.error);
  const r = computeAfford(parsed);
  respond(res, t0, {
    ...r,
    confidence_score: 1.0,
    confidence_per_section: CONFIDENCE_PER_SECTION,
    recommended_actions_priority_order: actions(parsed, r),
    chain_to: CHAIN_TO,
    financial_disclaimer: FINANCIAL_DISCLAIMER,
    privacy: PRIVACY,
    execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const parsed = parseAfford(req.body);
  if ('error' in parsed) return fail(res, t0, 400, 'invalid_request', parsed.error);
  const r = computeAfford(parsed);
  respond(res, t0, {
    ...r,
    assumptions: [
      `Front-end cap ${parsed.front_end_dti_pct}% of gross income for housing; back-end cap ${parsed.back_end_dti_pct}% for all debt (conventional defaults).`,
      'Max payment is split into principal+interest after subtracting the supplied taxes/insurance; the loan inverts a fully-amortizing payment.',
      'Uses gross (pre-tax) monthly income, as lenders do; does not model PMI, HOA, or reserve requirements.',
    ],
    sensitivity_analysis: sensitivity(parsed),
    reasoning: {
      why_result_generated: `Gross monthly income ${r.gross_monthly_income} → housing budget ${r.max_housing_payment} (lower of ${parsed.front_end_dti_pct}% front-end and ${parsed.back_end_dti_pct}% back-end less ${parsed.monthly_debt_payments} debt), then inverted ${r.max_principal_interest_payment}/mo at ${parsed.annual_rate}% to a ${r.max_loan_amount} loan.`,
      key_factors: [
        `Max purchase price ${r.max_purchase_price} (incl. ${r.down_payment} down).`,
        `Binding constraint: ${r.binding_constraint}.`,
        `Current other-debt back-end DTI: ${r.current_back_end_dti_pct}%.`,
      ],
      invalidators: [
        'A higher rate lowers the affordable loan (see sensitivity).',
        'Adding or clearing other monthly debt moves the back-end cap directly.',
        'Property taxes, insurance, HOA, or PMI reduce the principal+interest budget.',
      ],
    },
    confidence_score: 1.0,
    confidence_per_section: CONFIDENCE_PER_SECTION,
    recommended_actions_priority_order: actions(parsed, r),
    chain_to: CHAIN_TO,
    financial_disclaimer: FINANCIAL_DISCLAIMER,
    privacy: PRIVACY,
    execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
