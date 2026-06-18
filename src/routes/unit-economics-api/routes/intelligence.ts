import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, FINANCIAL_DISCLAIMER, chainTo, round } from '../../_aplus/finance';

// Deterministic SaaS / subscription unit economics. /ltv-cac computes gross-margin LTV,
// the LTV:CAC ratio and CAC payback from ARPU, gross margin, churn (or lifetime) and CAC;
// /margins computes gross and contribution margins. Pure arithmetic — no LLM, nothing stored.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };
function numField(v: unknown): number | undefined { return typeof v === 'number' && Number.isFinite(v) ? v : undefined; }

export interface LtvCacCore {
  arpu: number; gross_margin_percent: number; cac: number;
  monthly_churn_rate: number | null; lifetime_periods: number;
  gross_margin_per_period: number; ltv: number; ltv_cac_ratio: number;
  cac_payback_periods: number | null; verdict: string;
}
export interface MarginsCore {
  revenue: number; cogs: number; variable_costs: number;
  gross_profit: number; gross_margin_percent: number;
  contribution_margin: number; contribution_margin_percent: number;
}

function verdictFor(ratio: number): string {
  if (!Number.isFinite(ratio)) return 'no acquisition cost — ratio undefined';
  if (ratio >= 3) return 'healthy (LTV:CAC ≥ 3:1)';
  if (ratio >= 1) return 'marginal (LTV:CAC between 1:1 and 3:1)';
  return 'unprofitable acquisition (LTV:CAC < 1:1)';
}

function ltvCac(arpu: number, gmPct: number, cac: number, churn: number | undefined, lifetimeIn: number | undefined): LtvCacCore {
  const gm = gmPct / 100;
  const lifetime = lifetimeIn !== undefined ? lifetimeIn : (churn as number) > 0 ? 1 / (churn as number) : Infinity;
  const gmPerPeriod = arpu * gm;
  const ltv = Number.isFinite(lifetime) ? gmPerPeriod * lifetime : Infinity;
  const ratio = cac > 0 ? ltv / cac : Infinity;
  const payback = gmPerPeriod > 0 ? cac / gmPerPeriod : null;
  return {
    arpu, gross_margin_percent: gmPct, cac,
    monthly_churn_rate: churn ?? null,
    lifetime_periods: Number.isFinite(lifetime) ? round(lifetime, 6) : lifetime,
    gross_margin_per_period: round(gmPerPeriod, 6),
    ltv: Number.isFinite(ltv) ? round(ltv, 4) : ltv,
    ltv_cac_ratio: Number.isFinite(ratio) ? round(ratio, 4) : ratio,
    cac_payback_periods: payback === null ? null : round(payback, 4),
    verdict: verdictFor(ratio),
  };
}

function margins(revenue: number, cogs: number, variable: number): MarginsCore {
  const gp = revenue - cogs;
  const cm = revenue - cogs - variable;
  return {
    revenue, cogs, variable_costs: variable,
    gross_profit: round(gp, 6), gross_margin_percent: revenue === 0 ? 0 : round((gp / revenue) * 100, 6),
    contribution_margin: round(cm, 6), contribution_margin_percent: revenue === 0 ? 0 : round((cm / revenue) * 100, 6),
  };
}

function readLtvCac(b: any): { error: string } | { arpu: number; gm: number; cac: number; churn?: number; lifetime?: number } {
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return { error: 'Provide arpu, gross_margin_percent, cac and either monthly_churn_rate or lifetime_periods.' };
  const arpu = numField(b.arpu), gm = numField(b.gross_margin_percent), cac = numField(b.cac);
  if (arpu === undefined || arpu < 0) return { error: '"arpu" must be a non-negative number (average revenue per customer per period).' };
  if (gm === undefined || gm < 0 || gm > 100) return { error: '"gross_margin_percent" must be between 0 and 100.' };
  if (cac === undefined || cac < 0) return { error: '"cac" must be a non-negative number (customer acquisition cost).' };
  const hasChurn = b.monthly_churn_rate !== undefined, hasLife = b.lifetime_periods !== undefined;
  if (!hasChurn && !hasLife) return { error: 'Provide either "monthly_churn_rate" (0,1) or "lifetime_periods".' };
  let churn: number | undefined, lifetime: number | undefined;
  if (hasChurn) { const c = numField(b.monthly_churn_rate); if (c === undefined || c <= 0 || c > 1) return { error: '"monthly_churn_rate" must be in (0, 1].' }; churn = c; }
  if (hasLife) { const l = numField(b.lifetime_periods); if (l === undefined || l <= 0) return { error: '"lifetime_periods" must be a positive number.' }; lifetime = l; }
  return { arpu, gm, cac, churn, lifetime };
}

function readMargins(b: any): { error: string } | { revenue: number; cogs: number; variable: number } {
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return { error: 'Provide revenue and cogs.' };
  const revenue = numField(b.revenue), cogs = numField(b.cogs);
  if (revenue === undefined || revenue < 0) return { error: '"revenue" must be a non-negative number.' };
  if (cogs === undefined || cogs < 0) return { error: '"cogs" must be a non-negative number.' };
  let variable = 0; if (b.variable_costs !== undefined) { const v = numField(b.variable_costs); if (v === undefined || v < 0) return { error: '"variable_costs" must be a non-negative number.' }; variable = v; }
  return { revenue, cogs, variable };
}

const CHAIN_TO = [
  { api: 'break-even', reason: 'Translate contribution margin into the break-even volume for the product.' },
  { api: 'compound-interest', reason: 'Project the customer base or revenue forward at a growth rate.' },
];
const INVALIDATORS = [
  'LTV here is GROSS-MARGIN LTV = ARPU × gross_margin × lifetime; lifetime = 1/monthly_churn (or supplied directly). A churn-derived lifetime assumes a constant churn rate and ignores discounting and expansion revenue.',
  'LTV:CAC ≥ 3:1 is a common health benchmark and CAC payback under ~12 months is typical for SaaS — both are heuristics, not guarantees, and depend on your period unit (monthly vs annual).',
  'Revenue-based margins assume cogs and variable_costs are expressed in the same currency and period as revenue; mixing periods invalidates the percentages.',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, calculation_certainty: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: chainTo(CHAIN_TO), privacy: PRIVACY, execution_metadata: EXECUTION_METADATA, financial_disclaimer: FINANCIAL_DISCLAIMER,
});

export const DISCOVERY = {
  name: 'Unit Economics API', version: '1.0.0',
  description: 'Deterministic SaaS / subscription unit economics. /ltv-cac computes gross-margin LTV, LTV:CAC ratio and CAC payback from ARPU, gross margin, churn (or lifetime) and CAC; /margins computes gross and contribution margins. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/unit-economics/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['ltv', 'cac', 'ltv_cac_ratio', 'cac_payback', 'gross_margin', 'contribution_margin'],
  typical_use_cases: [
    'Compute customer LTV and the LTV:CAC ratio for a subscription business',
    'Find how many periods of gross margin it takes to pay back CAC',
    'Compute gross and contribution margins from revenue and costs',
  ],
  input_examples: [
    { endpoint: '/ltv-cac', body: { arpu: 100, gross_margin_percent: 80, cac: 400, monthly_churn_rate: 0.05 } },
    { endpoint: '/margins', body: { revenue: 100000, cogs: 30000, variable_costs: 15000 } },
  ],
  output_examples: [
    { endpoint: '/ltv-cac', response: { lifetime_periods: 20, ltv: 1600, ltv_cac_ratio: 4, cac_payback_periods: 5, verdict: 'healthy (LTV:CAC ≥ 3:1)' } },
    { endpoint: '/margins', response: { gross_margin_percent: 70, contribution_margin_percent: 55 } },
  ],
  endpoints: [
    { method: 'POST', path: '/ltv-cac', summary: 'LTV, LTV:CAC ratio and CAC payback', price_usdc: 0.007 },
    { method: 'POST', path: '/margins', summary: 'Gross and contribution margins', price_usdc: 0.005 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL unit economics + reasoning', price_usdc: 0.012 },
  ],
  pricing: [
    { path: '/ltv-cac', price_usdc: 0.007, currency: 'USDC' },
    { path: '/margins', price_usdc: 0.005, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
  ],
  x402_compatible: true,
};

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

router.post('/ltv-cac', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = readLtvCac(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = ltvCac(r.arpu, r.gm, r.cac, r.churn, r.lifetime);
  respond(res, t0, { ...v, ...TAIL({ ltv_cac: 1 }, [`LTV $${v.ltv}, LTV:CAC ${v.ltv_cac_ratio}:1 — ${v.verdict}. CAC payback ${v.cac_payback_periods} periods.`]) });
});

router.post('/margins', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = readMargins(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = margins(r.revenue, r.cogs, r.variable);
  respond(res, t0, { ...v, ...TAIL({ margins: 1 }, [`Gross margin ${v.gross_margin_percent}%, contribution margin ${v.contribution_margin_percent}%.`]) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = readLtvCac(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = ltvCac(r.arpu, r.gm, r.cac, r.churn, r.lifetime);
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Gross margin/period $${v.gross_margin_per_period} (ARPU $${v.arpu} × ${v.gross_margin_percent}%); over a ${v.lifetime_periods}-period lifetime that is LTV $${v.ltv}, a ${v.ltv_cac_ratio}:1 ratio against $${v.cac} CAC, recovered in ${v.cac_payback_periods} periods.`,
      key_factors: [
        `LTV:CAC ${v.ltv_cac_ratio}:1 — ${v.verdict}.`,
        `CAC payback ${v.cac_payback_periods} periods.`,
        `Customer lifetime ${v.lifetime_periods} periods.`,
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL({ ltv_cac: 1 }, [
      Number.isFinite(v.ltv_cac_ratio) && (v.ltv_cac_ratio as number) >= 3 ? `Healthy unit economics — scale acquisition; chain to break-even for volume planning.` : `Improve margin, retention or CAC before scaling spend; LTV:CAC is ${v.ltv_cac_ratio}:1.`,
    ]),
  });
});

export default router;
