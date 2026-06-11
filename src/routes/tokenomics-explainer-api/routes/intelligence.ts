import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { num, round, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic tokenomics math. From supply figures, optional price, optional
// emission, and an optional vesting schedule, computes float %, locked supply,
// dilution to max, market cap, FDV, MC/FDV ratio, annual inflation, and a
// cumulative unlock curve. Pure arithmetic — NOT an LLM "explainer" and not
// financial advice. Every figure is derived from the inputs you provide.

const router = Router();
const DISCLAIMER = 'Informational, deterministic tokenomics math derived solely from the inputs you provide — not financial advice and not a valuation. Garbage in, garbage out: figures are only as accurate as the supply/price/emission inputs.';

export interface AnalyzeResult {
  total_supply: number; circulating_supply: number; max_supply: number | null; locked_supply: number;
  circulating_pct: number; max_dilution_pct: number | null;
  price_usd: number | null; market_cap_usd: number | null; fully_diluted_valuation_usd: number | null; mc_to_fdv_ratio: number | null;
  annual_emission: number | null; annual_inflation_pct: number | null;
}

export function analyze(body: any): { error: string } | { result: AnalyzeResult } {
  const total_supply = num(body?.total_supply);
  if (total_supply === undefined || total_supply <= 0) return { error: 'Provide "total_supply" as a positive number.' };

  const circIn = num(body?.circulating_supply);
  if (circIn !== undefined && (circIn < 0 || circIn > total_supply)) return { error: '"circulating_supply" must be between 0 and total_supply.' };
  const circulating_supply = circIn ?? total_supply;

  const max_supply = num(body?.max_supply);
  if (max_supply !== undefined && max_supply < total_supply) return { error: '"max_supply" must be greater than or equal to total_supply.' };

  const price_usd = num(body?.price_usd);
  if (price_usd !== undefined && price_usd < 0) return { error: '"price_usd" must be 0 or greater.' };

  const annual_emission = num(body?.annual_emission);
  if (annual_emission !== undefined && annual_emission < 0) return { error: '"annual_emission" must be 0 or greater.' };

  const locked_supply = round(total_supply - circulating_supply, 6);
  const circulating_pct = round((circulating_supply / total_supply) * 100, 2);
  const max_dilution_pct = max_supply !== undefined ? round(((max_supply - total_supply) / total_supply) * 100, 2) : null;
  const market_cap_usd = price_usd !== undefined ? round(price_usd * circulating_supply, 2) : null;
  const fdvBase = max_supply ?? total_supply;
  const fully_diluted_valuation_usd = price_usd !== undefined ? round(price_usd * fdvBase, 2) : null;
  const mc_to_fdv_ratio = market_cap_usd !== null && fully_diluted_valuation_usd !== null && fully_diluted_valuation_usd > 0 ? round(market_cap_usd / fully_diluted_valuation_usd, 4) : null;
  const annual_inflation_pct = annual_emission !== undefined && circulating_supply > 0 ? round((annual_emission / circulating_supply) * 100, 2) : null;

  return {
    result: {
      total_supply, circulating_supply, max_supply: max_supply ?? null, locked_supply,
      circulating_pct, max_dilution_pct, price_usd: price_usd ?? null,
      market_cap_usd, fully_diluted_valuation_usd, mc_to_fdv_ratio, annual_emission: annual_emission ?? null, annual_inflation_pct,
    },
  };
}

export interface UnlockRow { label: string; unlock_month: number; tokens: number; cumulative_tokens: number; cumulative_pct_of_total: number; }
export interface VestingResult { tracked_tokens: number; tracked_pct_of_total: number; schedule: UnlockRow[]; next_unlock: UnlockRow | null; }

function vesting(body: any, total_supply: number): { error: string } | { result: VestingResult } | null {
  const raw = body?.vesting;
  if (raw === undefined) return null;
  if (!Array.isArray(raw) || raw.length === 0) return { error: '"vesting" must be a non-empty array of {label, tokens, unlock_month}.' };
  const elapsed = num(body?.elapsed_months) ?? 0;
  const rows: { label: string; unlock_month: number; tokens: number }[] = [];
  for (let i = 0; i < raw.length; i++) {
    const tokens = num(raw[i]?.tokens);
    const unlock_month = num(raw[i]?.unlock_month);
    if (tokens === undefined || tokens < 0) return { error: `vesting[${i}] needs non-negative "tokens".` };
    if (unlock_month === undefined || unlock_month < 0) return { error: `vesting[${i}] needs an "unlock_month" of 0 or greater.` };
    rows.push({ label: typeof raw[i]?.label === 'string' ? raw[i].label : `tranche_${i + 1}`, unlock_month, tokens });
  }
  rows.sort((a, b) => a.unlock_month - b.unlock_month);
  let cum = 0;
  const schedule: UnlockRow[] = rows.map((r) => { cum += r.tokens; return { ...r, cumulative_tokens: round(cum, 6), cumulative_pct_of_total: round((cum / total_supply) * 100, 2) }; });
  const tracked_tokens = round(cum, 6);
  const next_unlock = schedule.find((r) => r.unlock_month > elapsed) ?? null;
  return { result: { tracked_tokens, tracked_pct_of_total: round((tracked_tokens / total_supply) * 100, 2), schedule, next_unlock } };
}

function actions(r: AnalyzeResult): string[] {
  const out = [`Circulating float ${r.circulating_pct}% of total supply${r.locked_supply > 0 ? `; ${r.locked_supply} tokens locked` : ''}.`];
  if (r.mc_to_fdv_ratio !== null) out.push(`MC/FDV ${r.mc_to_fdv_ratio} — ${r.mc_to_fdv_ratio < 0.3 ? 'low float: heavy future dilution vs market cap' : r.mc_to_fdv_ratio < 0.7 ? 'moderate locked supply still to unlock' : 'most supply already circulating'}.`);
  if (r.annual_inflation_pct !== null) out.push(`Annual emission inflates circulating supply by ~${r.annual_inflation_pct}%.`);
  if (r.max_dilution_pct !== null && r.max_dilution_pct > 0) out.push(`Up to ${r.max_dilution_pct}% further dilution from total to max supply.`);
  return out;
}

const CHAIN_TO = [
  { api: 'country-currency-data', reason: 'Format the resulting USD valuations for display.' },
  { api: 'finance-payments', reason: 'Model vesting cliffs/linear unlocks as an installment-style schedule.' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Tokenomics Explainer API', version: '1.0.0',
    description: 'Deterministic tokenomics math. From supply figures, optional price, optional emission, and an optional vesting schedule, returns float %, locked supply, dilution to max, market cap, FDV, MC/FDV ratio, annual inflation, and a cumulative unlock curve. Pure arithmetic from your inputs — no LLM, no market data, not financial advice.',
    openapi_url: 'https://orbis-apis.onrender.com/tokenomics-explainer/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/analyze', summary: 'Supply/valuation/inflation math', price_usdc: 0.006 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL analysis + vesting unlock curve + reasoning', price_usdc: 0.01 },
    ],
    pricing: [
      { path: '/analyze', price_usdc: 0.006, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.01, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/analyze', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = analyze(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, {
    ...r.result, financial_disclaimer: DISCLAIMER,
    confidence_score: 1.0, confidence_per_section: { supply: 1, valuation: 1 },
    recommended_actions_priority_order: actions(r.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = analyze(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  const ves = vesting(req.body, v.total_supply);
  if (ves && 'error' in ves) return fail(res, t0, 400, 'invalid_request', ves.error);
  const vest = ves ? ves.result : null;
  respond(res, t0, {
    ...v, vesting: vest, financial_disclaimer: DISCLAIMER,
    reasoning: {
      why_result_generated: `${v.circulating_pct}% of ${v.total_supply} circulating${v.fully_diluted_valuation_usd !== null ? `; FDV $${v.fully_diluted_valuation_usd} at $${v.price_usd}` : ''}${vest ? `; ${vest.schedule.length} vesting tranche(s) tracked` : ''}.`,
      key_factors: [`Float: ${v.circulating_pct}%.`, v.mc_to_fdv_ratio !== null ? `MC/FDV: ${v.mc_to_fdv_ratio}.` : 'No price → no valuation.', v.annual_inflation_pct !== null ? `Annual inflation: ${v.annual_inflation_pct}%.` : 'No emission supplied.'],
      invalidators: ['Figures are only as accurate as the supply/price/emission inputs you provided.', 'Real circulating supply, burns, and emission curves change over time and are not fetched here.', 'FDV uses max supply when given, otherwise total supply — a different denominator changes it.'],
    },
    confidence_score: 1.0, confidence_per_section: { supply: 1, valuation: 1 },
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
