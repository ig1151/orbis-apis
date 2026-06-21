import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { num, str, round, clamp, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic stablecoin portfolio risk assessor. Takes a CALLER-SUPPLIED set of
// stablecoin holdings (USD amount, optional current/peg price, collateral type, issuer,
// attestation) and scores depeg, collateral, and issuer-concentration risk: per-holding
// risk, value-weighted portfolio risk, max depeg, algorithmic share, audited share, issuer
// HHI concentration, and an allow/review/block verdict. It does NOT fetch prices — it
// scores the holdings you pass in — so it is advisory, not a live depeg monitor. Higher
// score = riskier. No LLM, nothing stored.

const router = Router();

const DISCLAIMER =
  'Risk assessment over the stablecoin holdings you supplied — not a live price/oracle feed, not financial advice. Prices and collateral facts are trusted as given; if you omit current_price a holding is assumed at peg. A depeg that happens after your snapshot is not reflected.';

export type Band = 'low' | 'medium' | 'high' | 'severe';
export type Verdict = 'allow' | 'review' | 'block';

const bandOf = (s: number): Band => (s >= 75 ? 'severe' : s >= 50 ? 'high' : s >= 25 ? 'medium' : 'low');

const COLLATERAL_RISK: Record<string, number> = {
  algorithmic: 40, undercollateralized: 45, unknown: 25, crypto: 20, 'crypto-backed': 20, commodity: 12, fiat: 5, 'fiat-backed': 5,
};
const ATTESTATION_RISK: Record<string, number> = { none: 15, unknown: 10, attested: 5, audited: 0 };
const COLLATERAL_TYPES = new Set(Object.keys(COLLATERAL_RISK));
const ATTESTATIONS = new Set(['none', 'attested', 'audited']);

export interface HoldingRow {
  symbol: string;
  issuer: string | null;
  chain: string | null;
  amount_usd: number;
  value_share_pct: number;
  peg_price: number;
  current_price: number;
  depeg_pct: number; // absolute deviation from peg, percent
  collateral_type: string;
  attestation: 'none' | 'attested' | 'audited' | 'unknown';
  risk_score: number;
  risk_band: Band;
  weighted_risk_contribution: number;
  reasons: string[];
}

export interface StablecoinResult {
  portfolio: string | null;
  holding_count: number;
  total_stablecoin_usd: number;
  stablecoin_risk_score: number; // value-weighted 0-100
  risk_band: Band;
  max_depeg_pct: number;
  currently_depegged_count: number; // holdings with depeg >= 2%
  algorithmic_pct: number;
  audited_pct: number;
  unknown_collateral_pct: number;
  issuer_concentration: { hhi: number; band: 'low' | 'moderate' | 'high'; top_issuer: string | null; top_issuer_share_pct: number };
  collateral_breakdown: { collateral_type: string; amount_usd: number; share_pct: number; holding_count: number }[];
  verdict: Verdict;
  hard_block: boolean;
  holdings: HoldingRow[];
  highest_risk_holdings: HoldingRow[];
}

function scoreHolding(h: any): Omit<HoldingRow, 'value_share_pct' | 'weighted_risk_contribution'> {
  const symbol = (str(h.symbol) ?? str(h.token) ?? str(h.name) ?? 'UNKNOWN').toUpperCase();
  const issuer = str(h.issuer) ?? null;
  const chain = str(h.chain) ?? str(h.network) ?? null;
  const amount_usd = Math.max(0, round(num(h.amount_usd) ?? num(h.value_usd) ?? num(h.amount) ?? 0, 2));
  const peg_price = num(h.peg_price) ?? 1;
  const current_price = num(h.current_price) ?? num(h.price) ?? peg_price;
  const depeg_pct = peg_price > 0 ? round(Math.abs(current_price - peg_price) / peg_price * 100, 2) : 0;

  const colRaw = (str(h.collateral_type) ?? str(h.collateral) ?? 'unknown').toLowerCase();
  const collateral_type = COLLATERAL_TYPES.has(colRaw) ? colRaw : 'unknown';
  const attRaw = (str(h.attestation) ?? str(h.audit) ?? '').toLowerCase();
  const attestation: HoldingRow['attestation'] = ATTESTATIONS.has(attRaw) ? (attRaw as any) : 'unknown';

  const depegPts = depeg_pct >= 10 ? 60 : depeg_pct >= 5 ? 40 : depeg_pct >= 2 ? 20 : depeg_pct >= 1 ? 8 : 0;
  const colPts = COLLATERAL_RISK[collateral_type] ?? 25;
  const attPts = ATTESTATION_RISK[attestation] ?? 10;
  const risk_score = clamp(round(depegPts + colPts + attPts, 0), 0, 100);

  const reasons: string[] = [];
  if (depeg_pct >= 10) reasons.push(`Severe depeg: trading ${depeg_pct}% off the $${peg_price} peg.`);
  else if (depeg_pct >= 2) reasons.push(`Off peg by ${depeg_pct}%.`);
  if (collateral_type === 'algorithmic' || collateral_type === 'undercollateralized') reasons.push(`${collateral_type} collateral — structurally higher depeg risk.`);
  if (collateral_type === 'unknown') reasons.push('Collateral type unknown — scored conservatively.');
  if (attestation === 'none') reasons.push('No reserve attestation/audit disclosed.');
  if (reasons.length === 0) reasons.push(`At peg with ${collateral_type} collateral${attestation === 'audited' ? ' and audited reserves' : ''} — lower risk.`);

  return { symbol, issuer, chain, amount_usd, peg_price, current_price, depeg_pct, collateral_type, attestation, risk_score, risk_band: bandOf(risk_score), reasons };
}

export function assess(body: any): { error: string } | { result: StablecoinResult } {
  if (body === undefined || body === null || typeof body !== 'object' || Array.isArray(body))
    return { error: 'Provide a JSON object with a "holdings" array.' };
  const list = body.holdings;
  if (!Array.isArray(list) || list.length === 0)
    return { error: 'Provide a non-empty "holdings" array; each item is a stablecoin holding (symbol, amount_usd, optional current_price/peg_price/collateral_type/issuer/attestation).' };
  if (list.length > 1000) return { error: 'Too many holdings — limit 1000 per call.' };
  if (!list.every((h) => h && typeof h === 'object' && !Array.isArray(h)))
    return { error: 'Every holdings[] item must be a JSON object.' };

  const scored = list.map(scoreHolding);
  const total_stablecoin_usd = round(scored.reduce((s, h) => s + h.amount_usd, 0), 2);
  const n = scored.length;
  const weightOf = (amt: number) => (total_stablecoin_usd > 0 ? amt / total_stablecoin_usd : 1 / n);

  const holdings: HoldingRow[] = scored.map((h) => {
    const frac = weightOf(h.amount_usd);
    return { ...h, value_share_pct: round(frac * 100, 2), weighted_risk_contribution: round(frac * h.risk_score, 2) };
  }).sort((a, b) => b.weighted_risk_contribution - a.weighted_risk_contribution || b.amount_usd - a.amount_usd);

  const stablecoin_risk_score = clamp(round(holdings.reduce((s, h) => s + h.weighted_risk_contribution, 0), 0), 0, 100);
  const max_depeg_pct = holdings.length ? Math.max(...holdings.map((h) => h.depeg_pct)) : 0;
  const currently_depegged_count = holdings.filter((h) => h.depeg_pct >= 2).length;

  const shareOf = (pred: (h: HoldingRow) => boolean) => round(holdings.filter(pred).reduce((s, h) => s + weightOf(h.amount_usd), 0) * 100, 2);
  const algorithmic_pct = shareOf((h) => h.collateral_type === 'algorithmic' || h.collateral_type === 'undercollateralized');
  const audited_pct = shareOf((h) => h.attestation === 'audited');
  const unknown_collateral_pct = shareOf((h) => h.collateral_type === 'unknown');

  // Issuer concentration (fall back to symbol when issuer is absent).
  const keyOf = (h: HoldingRow) => h.issuer ?? h.symbol;
  const issuerMap = new Map<string, number>();
  for (const h of holdings) issuerMap.set(keyOf(h), (issuerMap.get(keyOf(h)) ?? 0) + h.amount_usd);
  const hhi = round([...issuerMap.values()].reduce((s, amt) => { const f = weightOf(amt); return s + f * f; }, 0), 4);
  const conc_band: 'low' | 'moderate' | 'high' = hhi >= 0.5 ? 'high' : hhi >= 0.3 ? 'moderate' : 'low';
  let top_issuer: string | null = null; let topAmt = 0;
  for (const [k, amt] of issuerMap) if (amt > topAmt) { topAmt = amt; top_issuer = k; }
  const top_issuer_share_pct = round(weightOf(topAmt) * 100, 2);

  const colMap = new Map<string, { amt: number; count: number }>();
  for (const h of holdings) { const e = colMap.get(h.collateral_type) ?? { amt: 0, count: 0 }; e.amt += h.amount_usd; e.count += 1; colMap.set(h.collateral_type, e); }
  const collateral_breakdown = [...colMap.entries()]
    .map(([collateral_type, e]) => ({ collateral_type, amount_usd: round(e.amt, 2), share_pct: round(weightOf(e.amt) * 100, 2), holding_count: e.count }))
    .sort((a, b) => b.amount_usd - a.amount_usd);

  const hard_block = holdings.some((h) => h.depeg_pct >= 10);
  let verdict: Verdict;
  if (hard_block || stablecoin_risk_score >= 70) verdict = 'block';
  else if (stablecoin_risk_score >= 40 || currently_depegged_count > 0 || algorithmic_pct >= 25 || issuerHigh(conc_band)) verdict = 'review';
  else verdict = 'allow';

  return {
    result: {
      portfolio: str(body.portfolio) ?? str(body.wallet) ?? str(body.address) ?? null,
      holding_count: n, total_stablecoin_usd,
      stablecoin_risk_score, risk_band: bandOf(stablecoin_risk_score),
      max_depeg_pct, currently_depegged_count,
      algorithmic_pct, audited_pct, unknown_collateral_pct,
      issuer_concentration: { hhi, band: conc_band, top_issuer, top_issuer_share_pct },
      collateral_breakdown,
      verdict, hard_block,
      holdings,
      highest_risk_holdings: holdings.filter((h) => h.risk_score >= 50).slice(0, 5),
    },
  };
}

const issuerHigh = (b: 'low' | 'moderate' | 'high') => b === 'high';

function actions(r: StablecoinResult): string[] {
  const out = [`Assessed ${r.holding_count} stablecoin holdings ($${r.total_stablecoin_usd}): risk ${r.stablecoin_risk_score}/100 (${r.risk_band}) → verdict ${r.verdict}.`];
  if (r.max_depeg_pct >= 10) out.push(`A holding is ${r.max_depeg_pct}% off peg — treat as a live depeg event; reduce exposure immediately.`);
  else if (r.currently_depegged_count > 0) out.push(`${r.currently_depegged_count} holding(s) are off peg (≥2%) — monitor closely.`);
  if (r.algorithmic_pct > 0) out.push(`${r.algorithmic_pct}% of stablecoin value is algorithmic/undercollateralized — the highest structural depeg risk.`);
  if (r.issuer_concentration.band !== 'low') out.push(`${r.issuer_concentration.band} issuer concentration; ${r.issuer_concentration.top_issuer} is ${r.issuer_concentration.top_issuer_share_pct}% — single-issuer dependency. Diversify issuers.`);
  if (r.audited_pct < 50) out.push(`Only ${r.audited_pct}% of value is in audited-reserve stablecoins — prefer attested reserves.`);
  if (out.length === 1) out.push('Holdings are at peg with sound collateral; continue periodic review.');
  return out;
}

const CHAIN_TO = [
  { api: 'multi-wallet-portfolio-risk-rollup', reason: 'Roll this stablecoin sleeve up with the rest of the wallet fleet for a portfolio-level verdict.', url: 'https://orbis-apis.onrender.com/multi-wallet-portfolio-risk-rollup' },
  { api: 'portfolio-yield-exposure', reason: 'If these stablecoins are deployed into yield, assess the protocol/APY risk on top.', url: 'https://orbis-apis.onrender.com/portfolio-yield-exposure' },
  { api: 'token-price-feed', reason: 'Pull live prices to populate current_price for an up-to-date depeg read.', url: 'https://orbis-apis.onrender.com/token-price-feed' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Portfolio Stablecoin Risk API', version: '1.0.0',
    description: 'Deterministic stablecoin portfolio risk assessor. From a caller-supplied set of stablecoin holdings (USD amount, optional current/peg price, collateral type, issuer, attestation) it scores depeg, collateral, and issuer-concentration risk: per-holding and value-weighted portfolio risk, max depeg, algorithmic/audited shares, issuer HHI, a collateral breakdown, and an allow/review/block verdict. Scores the holdings you supply — no price fetch. No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/portfolio-stablecoin-risk/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/assess', summary: 'Score stablecoin depeg/collateral/concentration risk', price_usdc: 0.025 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL assessment + reasoning + prioritized actions', price_usdc: 0.04 },
    ],
    pricing: [
      { path: '/assess', price_usdc: 0.025, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.04, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/assess', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = assess(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, {
    ...r.result, risk_disclaimer: DISCLAIMER,
    confidence_score: 0.85, confidence_per_section: { assessment: 1, interpretation: 0.7 },
    recommended_actions_priority_order: actions(r.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = assess(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v, risk_disclaimer: DISCLAIMER,
    reasoning: {
      why_result_generated: `Assessed ${v.holding_count} stablecoin holdings; value-weighted risk is ${v.stablecoin_risk_score}/100 (${v.risk_band}) → verdict ${v.verdict}${v.hard_block ? ' via depeg hard-block override' : ''}.`,
      key_factors: [
        `Total stablecoin value $${v.total_stablecoin_usd}; max depeg ${v.max_depeg_pct}%; ${v.currently_depegged_count} holding(s) off peg.`,
        `Algorithmic/undercollateralized ${v.algorithmic_pct}%; audited reserves ${v.audited_pct}%; unknown collateral ${v.unknown_collateral_pct}%.`,
        `Issuer concentration HHI ${v.issuer_concentration.hhi} (${v.issuer_concentration.band}); top issuer ${v.issuer_concentration.top_issuer} ${v.issuer_concentration.top_issuer_share_pct}%.`,
      ],
      invalidators: [
        'Scores only the holdings you supplied with the prices you supplied — omit current_price and a holding is assumed at peg.',
        'Collateral/attestation defaults are conservative; supplying accurate facts changes the score.',
        'A depeg after your snapshot is not reflected; re-assess with fresh prices for a live read.',
      ],
    },
    confidence_score: 0.85, confidence_per_section: { assessment: 1, interpretation: 0.7 },
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
