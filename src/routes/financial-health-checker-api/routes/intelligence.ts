import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { round, num, clamp, FINANCIAL_DISCLAIMER } from '../../_aplus/finance';

// Deterministic personal financial-health score from core ratios (savings rate,
// debt-to-income, emergency-fund coverage, solvency). Real arithmetic — no LLM.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };

export interface HealthInput {
  monthly_income: number;
  monthly_expenses: number;
  monthly_debt_payments: number;
  monthly_savings: number;
  liquid_savings: number;
  total_assets: number;
  total_liabilities: number;
}

export interface HealthRatios {
  savings_rate: number;
  debt_to_income: number;
  expense_ratio: number;
  emergency_fund_months: number | null;
  net_worth: number;
}

export interface HealthComponentScores {
  savings: number;
  debt: number;
  emergency: number;
  solvency: number;
}

export interface HealthResult {
  ratios: HealthRatios;
  component_scores: HealthComponentScores;
  health_score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  risk_level: 'low' | 'moderate' | 'high';
}

type ParsedInput = HealthInput | { error: string };

export function parseHealth(body: any): ParsedInput {
  const monthly_income = num(body?.monthly_income);
  const monthly_expenses = num(body?.monthly_expenses) ?? 0;
  const monthly_debt_payments = num(body?.monthly_debt_payments) ?? 0;
  const monthly_savings = num(body?.monthly_savings) ?? 0;
  const liquid_savings = num(body?.liquid_savings) ?? 0;
  const total_assets = num(body?.total_assets) ?? 0;
  const total_liabilities = num(body?.total_liabilities) ?? 0;

  if (monthly_income === undefined || monthly_income <= 0) return { error: '"monthly_income" must be a positive number (monthly take-home)' };
  for (const [k, v] of Object.entries({ monthly_expenses, monthly_debt_payments, monthly_savings, liquid_savings, total_assets, total_liabilities })) {
    if (v < 0) return { error: `"${k}" must be 0 or greater` };
  }
  return { monthly_income, monthly_expenses, monthly_debt_payments, monthly_savings, liquid_savings, total_assets, total_liabilities };
}

// Linear map of x in [lo, hi] to a 0–100 score; inverted when lo > hi.
function score(x: number, lo: number, hi: number): number {
  if (lo === hi) return x >= lo ? 100 : 0;
  const t = (x - lo) / (hi - lo);
  return clamp(t, 0, 1) * 100;
}

const WEIGHTS = { savings: 0.3, debt: 0.3, emergency: 0.25, solvency: 0.15 };

export function computeHealth(i: HealthInput): HealthResult {
  const savings_rate = i.monthly_savings / i.monthly_income;
  const debt_to_income = i.monthly_debt_payments / i.monthly_income;
  const expense_ratio = i.monthly_expenses / i.monthly_income;
  const emergency_fund_months = i.monthly_expenses > 0 ? i.liquid_savings / i.monthly_expenses : null;
  const net_worth = i.total_assets - i.total_liabilities;

  const savingsScore = score(savings_rate, 0, 0.2); // 20%+ savings rate is full marks
  const debtScore = score(debt_to_income, 0.43, 0.15); // inverted: ≤15% full, ≥43% zero
  const emergencyScore = score(emergency_fund_months ?? 0, 0, 6); // 6+ months full
  let solvencyScore: number;
  if (i.total_assets > 0) solvencyScore = clamp(1 - i.total_liabilities / i.total_assets, 0, 1) * 100;
  else solvencyScore = net_worth >= 0 ? 100 : 0;

  const component_scores: HealthComponentScores = {
    savings: Math.round(savingsScore),
    debt: Math.round(debtScore),
    emergency: Math.round(emergencyScore),
    solvency: Math.round(solvencyScore),
  };

  const health_score = Math.round(
    savingsScore * WEIGHTS.savings + debtScore * WEIGHTS.debt +
    emergencyScore * WEIGHTS.emergency + solvencyScore * WEIGHTS.solvency,
  );

  const grade: HealthResult['grade'] = health_score >= 90 ? 'A' : health_score >= 75 ? 'B' : health_score >= 60 ? 'C' : health_score >= 45 ? 'D' : 'F';
  const risk_level: HealthResult['risk_level'] = health_score >= 75 ? 'low' : health_score >= 50 ? 'moderate' : 'high';

  return {
    ratios: {
      savings_rate: round(savings_rate, 4),
      debt_to_income: round(debt_to_income, 4),
      expense_ratio: round(expense_ratio, 4),
      emergency_fund_months: emergency_fund_months === null ? null : round(emergency_fund_months, 1),
      net_worth: round(net_worth),
    },
    component_scores,
    health_score,
    grade,
    risk_level,
  };
}

function actions(r: HealthResult): string[] {
  // Prioritize the weakest deterministic component first.
  const ranked = (Object.entries(r.component_scores) as [keyof HealthComponentScores, number][])
    .sort((a, b) => a[1] - b[1]);
  const advice: Record<keyof HealthComponentScores, string> = {
    debt: `Lower debt-to-income (now ${(r.ratios.debt_to_income * 100).toFixed(0)}%) — target ≤ 36%; pay down high-rate balances first.`,
    savings: `Raise your savings rate (now ${(r.ratios.savings_rate * 100).toFixed(0)}%) toward 20% by automating transfers on payday.`,
    emergency: `Build emergency coverage (now ${r.ratios.emergency_fund_months ?? 0} months) toward 3–6 months of expenses.`,
    solvency: `Improve net worth (now ${r.ratios.net_worth}) by paying down liabilities and growing assets.`,
  };
  const out = ranked.filter(([, v]) => v < 90).map(([k]) => advice[k]);
  if (out.length === 0) out.push('All core ratios are strong — maintain savings discipline and review allocations annually.');
  return out.slice(0, 4);
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Financial Health Checker API', version: '1.0.0',
    description: 'Deterministic personal financial-health score (0–100) and grade from savings rate, debt-to-income, emergency-fund coverage, and solvency. Real arithmetic — never estimated.',
    openapi_url: 'https://orbis-apis.onrender.com/financial-health-checker/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/score', summary: 'Core ratios + weighted health score + grade', price_usdc: 0.01 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL health check + reasoning + prioritized actions', price_usdc: 0.02 },
    ],
    pricing: [
      { path: '/score', price_usdc: 0.01, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.02, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

function chains() {
  return [
    { api: 'emergency-fund-calculator', reason: 'Drill into the emergency-fund target and time-to-goal.' },
    { api: 'refinance-calculator', reason: 'If debt-to-income is high, test whether refinancing lowers payments.' },
    { api: 'personal-finance-agent', reason: 'Get a full prioritized plan across savings, debt, and refinancing in one call.' },
  ];
}

router.post('/score', (req: Request, res: Response) => {
  const t0 = Date.now();
  const parsed = parseHealth(req.body);
  if ('error' in parsed) return fail(res, t0, 400, 'invalid_request', parsed.error);
  const r = computeHealth(parsed);
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
  const parsed = parseHealth(req.body);
  if ('error' in parsed) return fail(res, t0, 400, 'invalid_request', parsed.error);
  const r = computeHealth(parsed);
  respond(res, t0, {
    ...r,
    reasoning: {
      why_result_generated: `Scored four weighted components — savings rate (30%), debt-to-income (30%), emergency coverage (25%), solvency (15%) — for a ${r.health_score}/100 (grade ${r.grade}).`,
      key_factors: [
        `Savings rate ${(r.ratios.savings_rate * 100).toFixed(0)}% → ${r.component_scores.savings}/100.`,
        `Debt-to-income ${(r.ratios.debt_to_income * 100).toFixed(0)}% → ${r.component_scores.debt}/100.`,
        `Emergency coverage ${r.ratios.emergency_fund_months ?? 0} months → ${r.component_scores.emergency}/100.`,
        `Solvency (net worth ${r.ratios.net_worth}) → ${r.component_scores.solvency}/100.`,
      ],
      invalidators: [
        'Income is treated as monthly take-home; using gross income changes the ratios.',
        'Irregular or seasonal income can make a single month unrepresentative.',
        'Excluding a debt or asset shifts debt-to-income and solvency.',
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
