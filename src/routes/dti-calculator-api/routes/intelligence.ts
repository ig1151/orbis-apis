import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { round, num, FINANCIAL_DISCLAIMER, EXECUTION_METADATA } from '../../_aplus/finance';

// Deterministic debt-to-income calculator. Computes front-end (housing) and
// back-end (total debt) DTI ratios against gross income and maps the back-end
// ratio to a lender qualification band, with the headroom to common limits.
// Real arithmetic — no LLM.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };
const CONFIDENCE_PER_SECTION = { ratios: 1, qualification: 1 };

export interface DtiInput {
  gross_monthly_income: number;
  housing_payment: number;
  other_monthly_debt: number;
}

type Parsed = DtiInput | { error: string };

export function parseDti(body: any): Parsed {
  let gross_monthly_income = num(body?.gross_monthly_income);
  const annual = num(body?.annual_income);
  if (gross_monthly_income === undefined && annual !== undefined) gross_monthly_income = annual / 12;
  const housing_payment = num(body?.housing_payment) ?? 0;
  const other_monthly_debt = num(body?.other_monthly_debt) ?? 0;

  if (gross_monthly_income === undefined || gross_monthly_income <= 0) return { error: 'Provide "gross_monthly_income" (or "annual_income") as a positive number' };
  if (housing_payment < 0) return { error: '"housing_payment" must be 0 or greater' };
  if (other_monthly_debt < 0) return { error: '"other_monthly_debt" must be 0 or greater' };
  return { gross_monthly_income, housing_payment, other_monthly_debt };
}

export interface DtiResult {
  gross_monthly_income: number;
  housing_payment: number;
  other_monthly_debt: number;
  total_monthly_debt: number;
  front_end_dti_pct: number;
  back_end_dti_pct: number;
  front_end_status: 'ideal' | 'acceptable' | 'high';
  back_end_status: 'ideal' | 'acceptable' | 'limited' | 'high';
  qualification: 'strong' | 'acceptable' | 'limited' | 'high_risk';
  max_additional_monthly_debt_at_36: number;
  max_additional_monthly_debt_at_43: number;
}

export function computeDti(i: DtiInput): DtiResult {
  const total = i.housing_payment + i.other_monthly_debt;
  const front = (i.housing_payment / i.gross_monthly_income) * 100;
  const back = (total / i.gross_monthly_income) * 100;
  const frontStatus: DtiResult['front_end_status'] = front <= 28 ? 'ideal' : front <= 31 ? 'acceptable' : 'high';
  const backStatus: DtiResult['back_end_status'] = back <= 36 ? 'ideal' : back <= 43 ? 'acceptable' : back <= 50 ? 'limited' : 'high';
  const qualification: DtiResult['qualification'] = back <= 36 ? 'strong' : back <= 43 ? 'acceptable' : back <= 50 ? 'limited' : 'high_risk';
  return {
    gross_monthly_income: round(i.gross_monthly_income),
    housing_payment: round(i.housing_payment),
    other_monthly_debt: round(i.other_monthly_debt),
    total_monthly_debt: round(total),
    front_end_dti_pct: round(front, 1),
    back_end_dti_pct: round(back, 1),
    front_end_status: frontStatus,
    back_end_status: backStatus,
    qualification,
    max_additional_monthly_debt_at_36: round(Math.max(0, i.gross_monthly_income * 0.36 - total)),
    max_additional_monthly_debt_at_43: round(Math.max(0, i.gross_monthly_income * 0.43 - total)),
  };
}

function actions(r: DtiResult): string[] {
  const out: string[] = [];
  out.push(`Back-end DTI is ${r.back_end_dti_pct}% (${r.qualification}); front-end (housing) is ${r.front_end_dti_pct}% (${r.front_end_status}).`);
  if (r.qualification === 'strong') out.push(`You have room for up to ${r.max_additional_monthly_debt_at_36}/mo more debt before reaching the conservative 36% line.`);
  else if (r.qualification === 'acceptable') out.push(`You are within the 43% QM limit but above 36%; ${r.max_additional_monthly_debt_at_43}/mo of headroom remains to 43%.`);
  else if (r.qualification === 'limited') out.push('Above 43% — conventional/QM loans are unlikely; only some FHA programs with compensating factors. Pay down debt before applying.');
  else out.push('Above 50% — reduce monthly debt or increase income before seeking new credit; this DTI is a decline risk.');
  if (r.front_end_status === 'high') out.push(`Housing alone exceeds 31% of income; a cheaper home or larger down payment lowers the front-end ratio.`);
  return out;
}

const CHAIN_TO = [
  { api: 'loan-affordability-calculator', reason: 'Translate this DTI headroom into a maximum loan and purchase price.' },
  { api: 'debt-payoff-planner', reason: 'Lower the back-end ratio by paying down the highest-rate debt.' },
  { api: 'credit-score-estimator', reason: 'Pair DTI with an estimated score — lenders weigh both.' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'DTI Calculator API', version: '1.0.0',
    description: 'Deterministic debt-to-income calculator. Computes front-end (housing) and back-end (total debt) DTI against gross income, maps the back-end ratio to a lender qualification band (strong/acceptable/limited/high-risk), and reports the headroom to the 36% and 43% limits. Real arithmetic — never estimated.',
    openapi_url: 'https://orbis-apis.onrender.com/dti-calculator/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/calculate', summary: 'Front/back-end DTI + qualification band + headroom', price_usdc: 0.008 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL DTI + reasoning + threshold guidance', price_usdc: 0.015 },
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
  const parsed = parseDti(req.body);
  if ('error' in parsed) return fail(res, t0, 400, 'invalid_request', parsed.error);
  const r = computeDti(parsed);
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
  const parsed = parseDti(req.body);
  if ('error' in parsed) return fail(res, t0, 400, 'invalid_request', parsed.error);
  const r = computeDti(parsed);
  respond(res, t0, {
    ...r,
    thresholds: { front_end_ideal_pct: 28, back_end_conservative_pct: 36, back_end_qm_limit_pct: 43, back_end_fha_max_pct: 50 },
    assumptions: [
      'Uses gross (pre-tax) monthly income, as lenders do.',
      'Back-end DTI includes housing + all recurring debt minimums (auto, student, credit cards, personal loans); it excludes utilities, insurance, and typical living expenses.',
      'Qualification bands reflect common conventional/QM (≤43%) and FHA-with-compensating-factors (≤50%) guidelines, not any specific lender\'s overlay.',
    ],
    reasoning: {
      why_result_generated: `Divided housing ${r.housing_payment} by income ${r.gross_monthly_income} for front-end ${r.front_end_dti_pct}%, and total debt ${r.total_monthly_debt} for back-end ${r.back_end_dti_pct}%.`,
      key_factors: [
        `Qualification: ${r.qualification} (back-end ${r.back_end_dti_pct}%).`,
        `Headroom to 36%: ${r.max_additional_monthly_debt_at_36}/mo; to 43%: ${r.max_additional_monthly_debt_at_43}/mo.`,
        `Front-end status: ${r.front_end_status}.`,
      ],
      invalidators: [
        'Adding or clearing recurring debt moves the back-end ratio directly.',
        'A raise or second income lowers both ratios.',
        'Individual lenders apply overlays and may count or exclude certain debts differently.',
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
