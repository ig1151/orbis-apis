import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { round, num, clamp, FINANCIAL_DISCLAIMER, EXECUTION_METADATA } from '../../_aplus/finance';

// Transparent credit-score ESTIMATOR. Scores each input against the publicly
// documented FICO category weights and maps the weighted result onto the
// 300–850 scale. It is a deterministic model — NOT your actual FICO/VantageScore
// (those are proprietary), so confidence is intentionally below 1.0 and the
// result is reported as a range. No fabrication: every sub-score is derived
// from the inputs you supply.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };
const CONFIDENCE = 0.6; // model estimate, not exact math
const CONFIDENCE_PER_SECTION = { model_estimate: 0.6, factor_breakdown: 1 };

// FICO category weights (public).
const WEIGHTS = { payment_history: 0.35, utilization: 0.30, credit_age: 0.15, credit_mix: 0.10, new_credit: 0.10 };

export interface CreditInput {
  on_time_payment_pct: number;
  credit_utilization_pct: number;
  avg_account_age_years: number;
  num_credit_types: number;
  hard_inquiries_last_12mo: number;
  derogatory_marks: number;
}

type Parsed = CreditInput | { error: string };

export function parseCredit(body: any): Parsed {
  const on_time_payment_pct = num(body?.on_time_payment_pct);
  const credit_utilization_pct = num(body?.credit_utilization_pct);
  const avg_account_age_years = num(body?.avg_account_age_years);
  const num_credit_types = num(body?.num_credit_types);
  const hard_inquiries_last_12mo = num(body?.hard_inquiries_last_12mo) ?? 0;
  const derogatory_marks = num(body?.derogatory_marks) ?? 0;

  if (on_time_payment_pct === undefined || on_time_payment_pct < 0 || on_time_payment_pct > 100) return { error: '"on_time_payment_pct" must be between 0 and 100' };
  if (credit_utilization_pct === undefined || credit_utilization_pct < 0 || credit_utilization_pct > 200) return { error: '"credit_utilization_pct" must be between 0 and 200' };
  if (avg_account_age_years === undefined || avg_account_age_years < 0 || avg_account_age_years > 80) return { error: '"avg_account_age_years" must be between 0 and 80' };
  if (num_credit_types === undefined || num_credit_types < 0 || num_credit_types > 10) return { error: '"num_credit_types" must be between 0 and 10 (distinct account types)' };
  if (hard_inquiries_last_12mo < 0 || hard_inquiries_last_12mo > 50) return { error: '"hard_inquiries_last_12mo" must be between 0 and 50' };
  if (derogatory_marks < 0 || derogatory_marks > 50) return { error: '"derogatory_marks" must be 0 or greater' };

  return { on_time_payment_pct, credit_utilization_pct, avg_account_age_years, num_credit_types: Math.round(num_credit_types), hard_inquiries_last_12mo: Math.round(hard_inquiries_last_12mo), derogatory_marks: Math.round(derogatory_marks) };
}

interface Factor { factor: string; weight_pct: number; sub_score: number; impact: 'positive' | 'neutral' | 'negative'; note: string; }

export interface CreditResult {
  estimated_score: number;
  score_range: { low: number; high: number };
  rating: 'poor' | 'fair' | 'good' | 'very_good' | 'exceptional';
  factor_breakdown: Factor[];
  weakest_factor: string;
  is_estimate: true;
}

function impactOf(sub: number): Factor['impact'] { return sub >= 75 ? 'positive' : sub >= 50 ? 'neutral' : 'negative'; }

function ratingOf(score: number): CreditResult['rating'] {
  return score >= 800 ? 'exceptional' : score >= 740 ? 'very_good' : score >= 670 ? 'good' : score >= 580 ? 'fair' : 'poor';
}

export function computeCredit(i: CreditInput): CreditResult {
  const paymentSub = clamp(i.on_time_payment_pct - i.derogatory_marks * 15, 0, 100);
  const utilSub = clamp(100 - Math.max(0, i.credit_utilization_pct - 10) * 1.1, 0, 100);
  const ageSub = clamp((i.avg_account_age_years / 7) * 100, 0, 100);
  const mixSub = clamp(i.num_credit_types * 25 + 15, 0, 100);
  const newSub = clamp(100 - i.hard_inquiries_last_12mo * 12, 0, 100);

  const factors: Factor[] = [
    { factor: 'payment_history', weight_pct: 35, sub_score: round(paymentSub), impact: impactOf(paymentSub), note: i.derogatory_marks > 0 ? `${i.derogatory_marks} derogatory mark(s) heavily weigh down the largest factor.` : `${i.on_time_payment_pct}% on-time payments.` },
    { factor: 'utilization', weight_pct: 30, sub_score: round(utilSub), impact: impactOf(utilSub), note: `${i.credit_utilization_pct}% utilization (best is under 10%; under 30% is healthy).` },
    { factor: 'credit_age', weight_pct: 15, sub_score: round(ageSub), impact: impactOf(ageSub), note: `Average account age ${i.avg_account_age_years} year(s); ~7+ years maxes this factor.` },
    { factor: 'credit_mix', weight_pct: 10, sub_score: round(mixSub), impact: impactOf(mixSub), note: `${i.num_credit_types} distinct account type(s).` },
    { factor: 'new_credit', weight_pct: 10, sub_score: round(newSub), impact: impactOf(newSub), note: `${i.hard_inquiries_last_12mo} hard inquiry(ies) in the last 12 months.` },
  ];

  const composite = paymentSub * WEIGHTS.payment_history + utilSub * WEIGHTS.utilization + ageSub * WEIGHTS.credit_age + mixSub * WEIGHTS.credit_mix + newSub * WEIGHTS.new_credit;
  const estimated_score = Math.round(300 + (composite / 100) * 550);
  const weakest = [...factors].sort((a, b) => (a.sub_score * (a.weight_pct)) - (b.sub_score * (b.weight_pct)))[0];

  return {
    estimated_score,
    score_range: { low: Math.max(300, estimated_score - 20), high: Math.min(850, estimated_score + 20) },
    rating: ratingOf(estimated_score),
    factor_breakdown: factors,
    weakest_factor: weakest.factor,
    is_estimate: true,
  };
}

function improvementActions(i: CreditInput, r: CreditResult): string[] {
  const out: string[] = [];
  const f = Object.fromEntries(r.factor_breakdown.map(x => [x.factor, x]));
  if (i.derogatory_marks > 0) out.push('Address derogatory marks first (bring delinquent accounts current, dispute errors) — payment history is 35% of the score.');
  if (i.credit_utilization_pct > 30) out.push(`Lower utilization from ${i.credit_utilization_pct}% to under 30% (ideally under 10%) — the fastest-moving lever after payments.`);
  if (f.new_credit.sub_score < 75) out.push('Avoid new hard inquiries for the next 6–12 months; each one dings the new-credit factor.');
  if (f.credit_age.sub_score < 50) out.push('Keep your oldest accounts open; closing them lowers your average account age.');
  if (f.credit_mix.sub_score < 50) out.push('A healthy mix (revolving + installment) helps the 10% mix factor, but never open accounts you do not need.');
  if (!out.length) out.push('Your profile is strong across all factors; maintain on-time payments and low utilization.');
  return out;
}

const CHAIN_TO = [
  { api: 'dti-calculator', reason: 'Check the debt-to-income ratio lenders pair with your score.' },
  { api: 'loan-affordability-calculator', reason: 'Translate this score band into the rate/amount you can likely qualify for.' },
  { api: 'debt-payoff-planner', reason: 'Lowering balances improves utilization — plan the payoff.' },
];

const DISCLAIMER = FINANCIAL_DISCLAIMER + ' This is a model-based ESTIMATE using public FICO category weights, not your actual FICO or VantageScore, which are proprietary and use data not captured here.';

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Credit Score Estimator API', version: '1.0.0',
    description: 'Transparent credit-score estimator. Scores your inputs against the public FICO category weights (payment history 35%, utilization 30%, age 15%, mix 10%, new credit 10%) and maps the weighted result to the 300–850 scale with a per-factor breakdown. A deterministic model and explicit estimate — not your actual FICO/VantageScore.',
    openapi_url: 'https://orbis-apis.onrender.com/credit-score-estimator/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/estimate', summary: 'Estimate score band + per-factor breakdown', price_usdc: 0.01 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL estimate + reasoning + improvement plan', price_usdc: 0.02 },
    ],
    pricing: [
      { path: '/estimate', price_usdc: 0.01, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.02, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/estimate', (req: Request, res: Response) => {
  const t0 = Date.now();
  const parsed = parseCredit(req.body);
  if ('error' in parsed) return fail(res, t0, 400, 'invalid_request', parsed.error);
  const r = computeCredit(parsed);
  respond(res, t0, {
    ...r,
    confidence_score: CONFIDENCE,
    confidence_per_section: CONFIDENCE_PER_SECTION,
    recommended_actions_priority_order: improvementActions(parsed, r),
    chain_to: CHAIN_TO,
    financial_disclaimer: DISCLAIMER,
    privacy: PRIVACY,
    execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const parsed = parseCredit(req.body);
  if ('error' in parsed) return fail(res, t0, 400, 'invalid_request', parsed.error);
  const r = computeCredit(parsed);
  respond(res, t0, {
    ...r,
    assumptions: [
      'Uses the publicly published FICO category weights; lenders may use different score models (VantageScore, industry-specific FICO).',
      'Sub-scores are heuristic mappings of your inputs, not a lookup of your real credit file.',
      'A 300–850 band ±20 points reflects model uncertainty; your actual score depends on full bureau data.',
    ],
    reasoning: {
      why_result_generated: `Weighted five factor sub-scores (payment ${r.factor_breakdown[0].sub_score}, utilization ${r.factor_breakdown[1].sub_score}, age ${r.factor_breakdown[2].sub_score}, mix ${r.factor_breakdown[3].sub_score}, new ${r.factor_breakdown[4].sub_score}) by the FICO weights and scaled to 300–850.`,
      key_factors: [
        `Estimated ${r.estimated_score} (${r.rating}); likely range ${r.score_range.low}–${r.score_range.high}.`,
        `Weakest factor: ${r.weakest_factor}.`,
        `Payment history (35%) and utilization (30%) dominate the result.`,
      ],
      invalidators: [
        'A derogatory mark, new inquiry, or balance change shifts the estimate.',
        'Your lender\'s actual scoring model may differ from public FICO weights.',
        'Thin files (few accounts / short history) score less predictably than this model assumes.',
      ],
    },
    confidence_score: CONFIDENCE,
    confidence_per_section: CONFIDENCE_PER_SECTION,
    recommended_actions_priority_order: improvementActions(parsed, r),
    chain_to: CHAIN_TO,
    financial_disclaimer: DISCLAIMER,
    privacy: PRIVACY,
    execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
