import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { round, num, FINANCIAL_DISCLAIMER } from '../../_aplus/finance';

// Deterministic net-worth calculator. Sums assets and liabilities, computes net
// worth and the debt-to-asset ratio, breaks down each side, and (when age +
// income are supplied) benchmarks against the age×income/10 wealth target.
// Pure arithmetic, no LLM.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };
const LIQUID_TYPES = new Set(['liquid', 'investment']);

export interface AssetItem { name: string; value: number; type: string; }
export interface LiabilityItem { name: string; balance: number; type: string; }
export interface NetWorthInput {
  assets: AssetItem[];
  liabilities: LiabilityItem[];
  total_assets: number;
  total_liabilities: number;
  age?: number;
  annual_income?: number;
}

type Parsed = NetWorthInput | { error: string };

function parseItems(raw: any, valueKey: 'value' | 'balance'): { items: any[]; total: number } | { error: string } {
  const items: any[] = [];
  let total = 0;
  for (let k = 0; k < raw.length; k++) {
    const it = raw[k];
    const v = num(it?.[valueKey]);
    const name = typeof it?.name === 'string' && it.name.trim() ? it.name.trim() : `item_${k + 1}`;
    const type = typeof it?.type === 'string' && it.type.trim() ? it.type.trim().toLowerCase() : 'other';
    if (v === undefined || v < 0) return { error: `entry[${k}].${valueKey} must be 0 or greater` };
    items.push({ name, [valueKey]: v, type });
    total += v;
  }
  return { items, total };
}

export function parseNetWorth(body: any): Parsed {
  const rawAssets = body?.assets;
  const rawLiabilities = body?.liabilities;
  let assets: AssetItem[] = [];
  let liabilities: LiabilityItem[] = [];
  let total_assets: number | undefined;
  let total_liabilities: number | undefined;

  if (Array.isArray(rawAssets) && rawAssets.length > 0) {
    if (rawAssets.length > 200) return { error: '"assets" may contain at most 200 entries' };
    const r = parseItems(rawAssets, 'value');
    if ('error' in r) return { error: `assets: ${r.error}` };
    assets = r.items as AssetItem[];
    total_assets = r.total;
  } else {
    total_assets = num(body?.total_assets);
  }

  if (Array.isArray(rawLiabilities) && rawLiabilities.length > 0) {
    if (rawLiabilities.length > 200) return { error: '"liabilities" may contain at most 200 entries' };
    const r = parseItems(rawLiabilities, 'balance');
    if ('error' in r) return { error: `liabilities: ${r.error}` };
    liabilities = r.items as LiabilityItem[];
    total_liabilities = r.total;
  } else {
    total_liabilities = num(body?.total_liabilities) ?? 0;
  }

  if (total_assets === undefined || total_assets < 0) return { error: 'Provide "assets" (array of { name, value, type }) or a non-negative "total_assets".' };
  if (total_liabilities < 0) return { error: '"total_liabilities" must be 0 or greater' };

  const age = num(body?.age);
  const annual_income = num(body?.annual_income);
  if (age !== undefined && (age < 18 || age > 110)) return { error: '"age" must be between 18 and 110' };
  if (annual_income !== undefined && annual_income <= 0) return { error: '"annual_income" must be a positive number' };

  return { assets, liabilities, total_assets, total_liabilities, age, annual_income };
}

export interface NetWorthResult {
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  liquid_assets: number | null;
  debt_to_asset_ratio: number | null;
  solvent: boolean;
  asset_breakdown: { name: string; type: string; value: number; pct_of_assets: number }[];
  liability_breakdown: { name: string; type: string; balance: number; pct_of_liabilities: number }[];
  expected_net_worth_target: number | null;
  net_worth_vs_target_ratio: number | null;
  prosperity_tier: 'under_accumulator' | 'average_accumulator' | 'prodigious_accumulator' | null;
}

export function computeNetWorth(i: NetWorthInput): NetWorthResult {
  const net_worth = i.total_assets - i.total_liabilities;
  const debt_to_asset_ratio = i.total_assets > 0 ? round(i.total_liabilities / i.total_assets, 4) : null;

  const liquid_assets = i.assets.length
    ? round(i.assets.filter(a => LIQUID_TYPES.has(a.type)).reduce((s, a) => s + a.value, 0))
    : null;

  const asset_breakdown = i.assets.map(a => ({
    name: a.name, type: a.type, value: round(a.value),
    pct_of_assets: i.total_assets > 0 ? round((a.value / i.total_assets) * 100, 1) : 0,
  }));
  const liability_breakdown = i.liabilities.map(l => ({
    name: l.name, type: l.type, balance: round(l.balance),
    pct_of_liabilities: i.total_liabilities > 0 ? round((l.balance / i.total_liabilities) * 100, 1) : 0,
  }));

  let expected_net_worth_target: number | null = null;
  let net_worth_vs_target_ratio: number | null = null;
  let prosperity_tier: NetWorthResult['prosperity_tier'] = null;
  if (i.age !== undefined && i.annual_income !== undefined) {
    // "Millionaire Next Door" expected net worth = age × pretax income / 10
    expected_net_worth_target = round((i.age * i.annual_income) / 10);
    if (expected_net_worth_target > 0) {
      net_worth_vs_target_ratio = round(net_worth / expected_net_worth_target, 3);
      prosperity_tier = net_worth_vs_target_ratio >= 2 ? 'prodigious_accumulator'
        : net_worth_vs_target_ratio >= 0.5 ? 'average_accumulator'
        : 'under_accumulator';
    }
  }

  return {
    total_assets: round(i.total_assets),
    total_liabilities: round(i.total_liabilities),
    net_worth: round(net_worth),
    liquid_assets,
    debt_to_asset_ratio,
    solvent: net_worth >= 0,
    asset_breakdown,
    liability_breakdown,
    expected_net_worth_target,
    net_worth_vs_target_ratio,
    prosperity_tier,
  };
}

function actions(r: NetWorthResult): string[] {
  const out: string[] = [];
  if (!r.solvent) {
    out.push(`Negative net worth (${r.net_worth}): liabilities exceed assets. Prioritize paying down high-rate debt and avoid new borrowing.`);
  } else {
    out.push(`Net worth is ${r.net_worth} with a debt-to-asset ratio of ${r.debt_to_asset_ratio ?? 'n/a'}.`);
  }
  if (r.liquid_assets !== null && r.total_liabilities > 0 && r.liquid_assets < r.total_liabilities * 0.1) {
    out.push('Liquid assets are thin relative to debt — build cash reserves before illiquid investments.');
  }
  if (r.prosperity_tier === 'under_accumulator') out.push(`Net worth is ${r.net_worth_vs_target_ratio}× the age×income/10 benchmark (${r.expected_net_worth_target}); increasing your savings rate is the fastest lever.`);
  else if (r.prosperity_tier === 'prodigious_accumulator') out.push(`Strong: net worth is ${r.net_worth_vs_target_ratio}× the age×income/10 benchmark.`);
  out.push('Re-run monthly to track the trend; net worth direction matters more than any single snapshot.');
  return out;
}

const CHAIN_TO = [
  { api: 'debt-payoff-planner', reason: 'Build a payoff plan for the liabilities reducing your net worth.' },
  { api: 'retirement-planner', reason: 'Project how current assets grow toward retirement.' },
  { api: 'financial-health-checker', reason: 'Combine net worth with income and DTI for an overall score.' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Net Worth Tracker API', version: '1.0.0',
    description: 'Deterministic net-worth calculator. Sums assets and liabilities, computes net worth and the debt-to-asset ratio, breaks down each side by type, and benchmarks against the age×income/10 wealth target when age and income are supplied. Pure arithmetic — never estimated.',
    openapi_url: 'https://orbis-apis.onrender.com/net-worth-tracker/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/calculate', summary: 'Compute net worth, ratios, and breakdowns', price_usdc: 0.008 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL net worth + reasoning + benchmark', price_usdc: 0.015 },
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
  const parsed = parseNetWorth(req.body);
  if ('error' in parsed) return fail(res, t0, 400, 'invalid_request', parsed.error);
  const r = computeNetWorth(parsed);
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
  const parsed = parseNetWorth(req.body);
  if ('error' in parsed) return fail(res, t0, 400, 'invalid_request', parsed.error);
  const r = computeNetWorth(parsed);
  respond(res, t0, {
    ...r,
    assumptions: [
      'Values are current market/face values you supplied at a single point in time.',
      'Liquid assets count only entries typed "liquid" or "investment"; retirement and real estate are treated as illiquid.',
      'The age×income/10 benchmark is a rough heuristic (Stanley & Danko), not a personalized target.',
    ],
    reasoning: {
      why_result_generated: `Subtracted ${r.total_liabilities} in liabilities from ${r.total_assets} in assets for a net worth of ${r.net_worth}.`,
      key_factors: [
        `Debt-to-asset ratio: ${r.debt_to_asset_ratio ?? 'n/a'} (lower is stronger).`,
        r.liquid_assets !== null ? `Liquid assets: ${r.liquid_assets}.` : 'Asset liquidity not classified (no per-asset types supplied).',
        r.prosperity_tier ? `Benchmark: ${r.net_worth_vs_target_ratio}× the ${r.expected_net_worth_target} target → ${r.prosperity_tier}.` : 'No age/income supplied, so no benchmark was computed.',
      ],
      invalidators: [
        'Stale or estimated asset values change net worth materially.',
        'Excluding a liability (or asset) skews both the total and the ratio.',
        'Illiquid assets (home, retirement) cannot cover near-term obligations despite raising net worth.',
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
