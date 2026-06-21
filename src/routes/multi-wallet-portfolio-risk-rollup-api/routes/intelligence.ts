import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { num, str, round, clamp, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic multi-wallet portfolio risk rollup. Takes a CALLER-SUPPLIED set of
// wallets — each with a USD value and risk signals — and aggregates them into a
// portfolio-level view: value-weighted composite risk, value concentration (HHI),
// value-at-risk in high-risk wallets, per-band counts, the worst wallet, and an
// allow/review/block verdict. It does NOT fetch the chain — it rolls up the wallets
// you pass in — so it is advisory, not a verdict on a live portfolio. Higher score =
// higher risk. No LLM, nothing stored.

const router = Router();

const DISCLAIMER =
  'Value-weighted rollup over the wallets and risk signals you supplied — not on-chain analysis, not financial/compliance advice. Inputs are trusted as given; a wallet you omit is excluded, not assumed safe. Wallets without any risk signal are counted but left out of the weighted risk.';

const truthy = (v: unknown) => v === true || v === 'true' || v === 'yes' || v === 1;

export type Band = 'low' | 'medium' | 'high' | 'severe';
export type Verdict = 'allow' | 'review' | 'block';
type RiskSource = 'sanctioned' | 'flagged' | 'supplied' | 'derived' | 'unscored';

const bandOf = (s: number): Band => (s >= 75 ? 'severe' : s >= 50 ? 'high' : s >= 25 ? 'medium' : 'low');

export interface WalletRow {
  label: string;
  address: string | null;
  value_usd: number;
  value_share_pct: number;
  risk_score: number | null; // null = no risk signal supplied
  risk_band: Band | 'unscored';
  risk_source: RiskSource;
  flagged: boolean;
  sanctioned: boolean;
  risk_adjusted_value_usd: number; // value_usd * risk/100 (0 when unscored)
  reasons: string[];
}

export interface RollupResult {
  total_value_usd: number;
  wallet_count: number;
  scored_wallet_count: number;
  unscored_wallet_count: number;
  value_weighted_risk_score: number; // 0-100 over scored value
  equal_weighted_risk_score: number; // 0-100 mean over scored wallets
  portfolio_risk_band: Band;
  verdict: Verdict;
  hard_block: boolean;
  value_at_risk_usd: number; // value in high/severe wallets
  risk_adjusted_value_usd: number; // sum of value*risk/100
  concentration: { hhi: number; band: 'low' | 'moderate' | 'high'; top_wallet_share_pct: number; top3_share_pct: number };
  count_by_band: { low: number; medium: number; high: number; severe: number; unscored: number };
  worst_wallet: WalletRow | null;
  wallets: WalletRow[];
  highest_risk_wallets: WalletRow[];
}

function scoreWallet(w: any): Omit<WalletRow, 'value_share_pct'> {
  const label = str(w.label) ?? str(w.name) ?? str(w.address) ?? 'unknown-wallet';
  const address = str(w.address) ?? null;
  const value_usd = Math.max(0, round(num(w.value_usd) ?? num(w.net_worth_usd) ?? 0, 2));
  const flagged = truthy(w.flagged) || truthy(w.blocklisted);
  const sanctioned = truthy(w.sanctioned);

  // Risk: explicit risk_score wins; else derive from approval_exposure_score and/or
  // reputation_score (higher reputation = lower risk); else unscored.
  const supplied = num(w.risk_score);
  const approval = num(w.approval_exposure_score);
  const reputation = num(w.reputation_score);
  let risk: number | null = null;
  let risk_source: RiskSource = 'unscored';
  if (supplied !== undefined) { risk = clamp(round(supplied, 0), 0, 100); risk_source = 'supplied'; }
  else if (approval !== undefined || reputation !== undefined) {
    const parts: number[] = [];
    if (approval !== undefined) parts.push(clamp(approval, 0, 100));
    if (reputation !== undefined) parts.push(clamp(100 - reputation, 0, 100));
    risk = clamp(round(Math.max(...parts), 0), 0, 100); // worst sub-signal drives derived risk
    risk_source = 'derived';
  }
  if (risk !== null) {
    if (flagged && risk < 90) risk = 90;
    if (sanctioned) risk = 100;
  } else if (flagged || sanctioned) {
    risk = sanctioned ? 100 : 90; // a flag alone is enough to score the wallet
  }
  if (sanctioned) risk_source = 'sanctioned';
  else if (flagged && risk_source !== 'supplied' && risk_source !== 'derived') risk_source = 'flagged';

  const risk_band: Band | 'unscored' = risk === null ? 'unscored' : bandOf(risk);
  const risk_adjusted_value_usd = risk === null ? 0 : round(value_usd * (risk / 100), 2);

  const reasons: string[] = [];
  if (sanctioned) reasons.push('Sanctioned wallet — hard compliance block on the whole portfolio.');
  if (flagged && !sanctioned) reasons.push('Flagged/blocklisted wallet — treated as high risk.');
  if (risk_source === 'derived') reasons.push('No risk_score supplied — risk derived from approval/reputation signals.');
  if (risk_source === 'unscored') reasons.push('No risk signal supplied — counted in value but excluded from weighted risk.');
  if (reasons.length === 0) reasons.push(`Risk ${risk}/100 (${risk_band}) from the supplied score.`);

  return { label, address, value_usd, risk_score: risk, risk_band, risk_source, flagged, sanctioned, risk_adjusted_value_usd, reasons };
}

export function rollup(body: any): { error: string } | { result: RollupResult } {
  if (body === undefined || body === null || typeof body !== 'object' || Array.isArray(body))
    return { error: 'Provide a JSON object with a "wallets" array.' };
  const list = body.wallets;
  if (!Array.isArray(list) || list.length === 0)
    return { error: 'Provide a non-empty "wallets" array; each item is a wallet (label/address, value_usd, optional risk_score/approval_exposure_score/reputation_score/flagged/sanctioned).' };
  if (list.length > 1000) return { error: 'Too many wallets — limit 1000 per call.' };
  if (!list.every((w) => w && typeof w === 'object' && !Array.isArray(w)))
    return { error: 'Every wallets[] item must be a JSON object.' };

  const scored = list.map(scoreWallet);
  const total_value_usd = round(scored.reduce((s, w) => s + w.value_usd, 0), 2);
  const n = scored.length;

  const wallets: WalletRow[] = scored.map((w) => ({
    ...w,
    value_share_pct: round((total_value_usd > 0 ? w.value_usd / total_value_usd : 1 / n) * 100, 2),
  })).sort((a, b) => b.risk_adjusted_value_usd - a.risk_adjusted_value_usd || b.value_usd - a.value_usd);

  const scoredWallets = wallets.filter((w) => w.risk_score !== null);
  const scored_wallet_count = scoredWallets.length;
  const unscored_wallet_count = n - scored_wallet_count;

  // Value-weighted risk renormalizes value over scored wallets; equal-weighted is a
  // plain mean. Both 0 when nothing is scored.
  const scoredValue = round(scoredWallets.reduce((s, w) => s + w.value_usd, 0), 2);
  const value_weighted_risk_score = scored_wallet_count === 0 ? 0 : clamp(round(
    scoredValue > 0
      ? scoredWallets.reduce((s, w) => s + (w.value_usd / scoredValue) * (w.risk_score as number), 0)
      : scoredWallets.reduce((s, w) => s + (w.risk_score as number), 0) / scored_wallet_count,
    0), 0, 100);
  const equal_weighted_risk_score = scored_wallet_count === 0 ? 0 : clamp(round(scoredWallets.reduce((s, w) => s + (w.risk_score as number), 0) / scored_wallet_count, 0), 0, 100);

  const value_at_risk_usd = round(wallets.filter((w) => w.risk_band === 'high' || w.risk_band === 'severe').reduce((s, w) => s + w.value_usd, 0), 2);
  const risk_adjusted_value_usd = round(wallets.reduce((s, w) => s + w.risk_adjusted_value_usd, 0), 2);

  // Value-share HHI.
  const hhi = round(wallets.reduce((s, w) => { const f = total_value_usd > 0 ? w.value_usd / total_value_usd : 1 / n; return s + f * f; }, 0), 4);
  const conc_band: 'low' | 'moderate' | 'high' = hhi >= 0.25 ? 'high' : hhi >= 0.15 ? 'moderate' : 'low';
  const byValue = [...wallets].sort((a, b) => b.value_usd - a.value_usd);
  const top_wallet_share_pct = byValue.length > 0 ? byValue[0].value_share_pct : 0;
  const top3_share_pct = round(byValue.slice(0, 3).reduce((s, w) => s + w.value_share_pct, 0), 2);

  const count_by_band = {
    low: wallets.filter((w) => w.risk_band === 'low').length,
    medium: wallets.filter((w) => w.risk_band === 'medium').length,
    high: wallets.filter((w) => w.risk_band === 'high').length,
    severe: wallets.filter((w) => w.risk_band === 'severe').length,
    unscored: unscored_wallet_count,
  };

  const portfolio_risk_band = bandOf(value_weighted_risk_score);
  const hard_block = wallets.some((w) => w.sanctioned);
  let verdict: Verdict;
  if (hard_block || value_weighted_risk_score >= 70) verdict = 'block';
  else if (value_weighted_risk_score >= 40 || wallets.some((w) => w.flagged) || count_by_band.severe > 0) verdict = 'review';
  else verdict = 'allow';

  const worst_wallet = scoredWallets.length > 0
    ? [...scoredWallets].sort((a, b) => (b.risk_score as number) - (a.risk_score as number) || b.value_usd - a.value_usd)[0]
    : null;

  return {
    result: {
      total_value_usd, wallet_count: n, scored_wallet_count, unscored_wallet_count,
      value_weighted_risk_score, equal_weighted_risk_score, portfolio_risk_band, verdict, hard_block,
      value_at_risk_usd, risk_adjusted_value_usd,
      concentration: { hhi, band: conc_band, top_wallet_share_pct, top3_share_pct },
      count_by_band, worst_wallet, wallets,
      highest_risk_wallets: wallets.filter((w) => w.risk_score !== null).slice(0, 5),
    },
  };
}

function actions(r: RollupResult): string[] {
  const out = [`Rolled up ${r.wallet_count} wallet(s) worth $${r.total_value_usd}: value-weighted risk ${r.value_weighted_risk_score}/100 (${r.portfolio_risk_band}) → verdict ${r.verdict}.`];
  if (r.hard_block) out.push('Sanctioned wallet in the portfolio — halt and escalate for compliance review.');
  if (r.value_at_risk_usd > 0) out.push(`$${r.value_at_risk_usd} sits in high/severe-risk wallet(s) (${r.count_by_band.high + r.count_by_band.severe}) — prioritize migrating or de-risking those balances.`);
  if (r.concentration.band !== 'low') out.push(`${r.concentration.band} value concentration (HHI ${r.concentration.hhi}); top wallet holds ${r.concentration.top_wallet_share_pct}% — single-wallet failure risk.`);
  if (r.unscored_wallet_count > 0) out.push(`${r.unscored_wallet_count} wallet(s) have no risk signal — fetch scores to tighten the rollup.`);
  if (out.length === 1) out.push('No high-risk or sanctioned wallets in the supplied set; continue periodic review.');
  return out;
}

const CHAIN_TO = [
  { api: 'wallet-risk-bundle', reason: 'Produce a per-wallet composite risk score to feed into this rollup.', url: 'https://orbis-apis.onrender.com/wallet-risk-bundle' },
  { api: 'wallet-address-risk', reason: 'Fetch an AML/sanctions risk score for any unscored wallet.', url: 'https://orbis-apis.onrender.com/wallet-address-risk' },
  { api: 'wallet-balance', reason: 'Pull current USD value per wallet to populate value_usd.', url: 'https://orbis-apis.onrender.com/wallet-balance' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Multi-Wallet Portfolio Risk Rollup API', version: '1.0.0',
    description: 'Deterministic multi-wallet portfolio risk rollup. From a caller-supplied set of wallets (USD value + risk signals) it computes value-weighted composite risk, value concentration (HHI), value-at-risk in high-risk wallets, per-band counts, the worst wallet, and an allow/review/block verdict. Rolls up the wallets you supply — no chain fetch. No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/multi-wallet-portfolio-risk-rollup/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/rollup', summary: 'Aggregate wallets into a portfolio risk view', price_usdc: 0.025 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL rollup + reasoning + prioritized actions', price_usdc: 0.04 },
    ],
    pricing: [
      { path: '/rollup', price_usdc: 0.025, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.04, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/rollup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = rollup(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, {
    ...r.result, risk_disclaimer: DISCLAIMER,
    confidence_score: 0.85, confidence_per_section: { aggregation: 1, interpretation: 0.7 },
    recommended_actions_priority_order: actions(r.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = rollup(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v, risk_disclaimer: DISCLAIMER,
    reasoning: {
      why_result_generated: `Rolled up ${v.wallet_count} wallet(s) ($${v.total_value_usd}); value-weighted risk over ${v.scored_wallet_count} scored wallet(s) is ${v.value_weighted_risk_score}/100 (${v.portfolio_risk_band}) → verdict ${v.verdict}${v.hard_block ? ' via hard-block override' : ''}.`,
      key_factors: [
        `Total value $${v.total_value_usd}; $${v.value_at_risk_usd} in high/severe wallets.`,
        `Value-weighted risk ${v.value_weighted_risk_score}/100, equal-weighted ${v.equal_weighted_risk_score}/100.`,
        `Band counts — low ${v.count_by_band.low}, medium ${v.count_by_band.medium}, high ${v.count_by_band.high}, severe ${v.count_by_band.severe}, unscored ${v.count_by_band.unscored}.`,
        `Concentration HHI ${v.concentration.hhi} (${v.concentration.band}); top wallet ${v.concentration.top_wallet_share_pct}% of value.`,
      ],
      invalidators: [
        'Rolls up only the wallets you supplied — omitted wallets are excluded, not assumed safe.',
        'Value-weighting means a large balance dominates the score; an equal-weighted view (also returned) can differ sharply.',
        'Wallets without a risk signal are excluded from the weighted risk; supplying their scores can move the verdict.',
      ],
    },
    confidence_score: 0.85, confidence_per_section: { aggregation: 1, interpretation: 0.7 },
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
