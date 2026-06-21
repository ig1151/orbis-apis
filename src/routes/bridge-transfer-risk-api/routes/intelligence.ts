import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { num, str, round, clamp, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic cross-chain bridge transfer risk assessor. Takes CALLER-SUPPLIED params
// for a single bridge transfer (amount, bridge, bridge type, chains, optional TVL / dest
// liquidity / audit / exploit history) and scores the transfer: a liquidity/slippage
// estimate, a bridge-design trust score, a composite bridge_risk_score, a recommended max
// transfer size, and an allow/review/block verdict. It does NOT fetch the chain or live
// liquidity — it scores the params you pass in — so it is advisory. Higher score =
// riskier. No LLM, nothing stored.

const router = Router();

const DISCLAIMER =
  'Risk assessment over the bridge-transfer params you supplied — not a live liquidity/oracle feed, not financial advice. TVL, liquidity, audit, and exploit facts are trusted as given; omitted facts are scored conservatively. Slippage is an estimate from supplied liquidity, not a quote.';

const truthy = (v: unknown) => v === true || v === 'true' || v === 'yes' || v === 1;

export type Band = 'low' | 'medium' | 'high' | 'severe';
export type Verdict = 'allow' | 'review' | 'block';

const bandOf = (s: number): Band => (s >= 75 ? 'severe' : s >= 50 ? 'high' : s >= 25 ? 'medium' : 'low');

// Bridge security model risk (0 = trust-minimized, higher = more trust assumptions).
const BRIDGE_TYPE_RISK: Record<string, number> = {
  native: 5, canonical: 5, rollup: 6, light_client: 8, liquidity: 15, lock_mint: 18, mint_burn: 18,
  optimistic: 22, external_validator: 25, multisig: 28, federated: 28, unknown: 20,
};
const BRIDGE_TYPES = new Set(Object.keys(BRIDGE_TYPE_RISK));

export interface RiskComponent { factor: string; points: number; detail: string; }

export interface BridgeResult {
  bridge: string;
  bridge_type: string;
  source_chain: string | null;
  dest_chain: string | null;
  amount_usd: number;
  cross_chain: boolean;
  liquidity_ratio: number | null; // amount / dest_liquidity
  estimated_slippage_pct: number | null;
  liquidity_risk_band: Band | 'unknown';
  recommended_max_transfer_usd: number | null;
  bridge_risk_score: number; // 0-100 composite
  risk_band: Band;
  trust_score: number; // 100 - design/security risk portion
  components: RiskComponent[];
  verdict: Verdict;
  hard_block: boolean;
  exploited_before: boolean;
  audited: boolean;
  reasons: string[];
}

export function assess(body: any): { error: string } | { result: BridgeResult } {
  if (body === undefined || body === null || typeof body !== 'object' || Array.isArray(body))
    return { error: 'Provide a JSON object with bridge-transfer params (amount_usd, bridge, ...), or a "transfer" object.' };
  const t = body.transfer && typeof body.transfer === 'object' && !Array.isArray(body.transfer) ? body.transfer : body;

  const amount_usd = num(t.amount_usd) ?? num(t.value_usd) ?? num(t.amount);
  if (amount_usd === undefined || amount_usd <= 0)
    return { error: 'Provide a positive "amount_usd" for the transfer.' };
  const amt = round(amount_usd, 2);

  const bridge = str(t.bridge) ?? str(t.bridge_name) ?? str(t.name) ?? 'unknown-bridge';
  const typeRaw = (str(t.bridge_type) ?? str(t.type) ?? 'unknown').toLowerCase();
  const bridge_type = BRIDGE_TYPES.has(typeRaw) ? typeRaw : 'unknown';
  const source_chain = str(t.source_chain) ?? str(t.from_chain) ?? null;
  const dest_chain = str(t.dest_chain) ?? str(t.to_chain) ?? null;
  const cross_chain = !!(source_chain && dest_chain && source_chain.toLowerCase() !== dest_chain.toLowerCase()) || (!source_chain && !dest_chain);

  const dest_liquidity_usd = num(t.dest_liquidity_usd) ?? num(t.liquidity_usd) ?? undefined;
  const bridge_tvl_usd = num(t.bridge_tvl_usd) ?? num(t.tvl_usd) ?? undefined;
  const audited = truthy(t.audited) || (str(t.audit) ?? '').toLowerCase() === 'audited';
  const exploited_before = truthy(t.exploited_before) || truthy(t.previously_exploited) || truthy(t.hacked_before);
  const validator_set_size = num(t.validator_set_size);

  const components: RiskComponent[] = [];

  // 1) Liquidity / slippage.
  let liquidity_ratio: number | null = null;
  let estimated_slippage_pct: number | null = null;
  let liquidity_risk_band: Band | 'unknown' = 'unknown';
  let recommended_max_transfer_usd: number | null = null;
  let liqPts = 0;
  if (dest_liquidity_usd !== undefined && dest_liquidity_usd > 0) {
    liquidity_ratio = round(amt / dest_liquidity_usd, 4);
    // Constant-product-style slippage approximation from depth consumed.
    estimated_slippage_pct = round((liquidity_ratio / (1 + liquidity_ratio)) * 100, 2);
    liqPts = liquidity_ratio >= 0.25 ? 35 : liquidity_ratio >= 0.1 ? 22 : liquidity_ratio >= 0.05 ? 12 : liquidity_ratio >= 0.02 ? 5 : 0;
    liquidity_risk_band = bandOf(liqPts >= 35 ? 80 : liqPts >= 22 ? 55 : liqPts >= 12 ? 35 : liqPts >= 5 ? 20 : 5);
    recommended_max_transfer_usd = round(dest_liquidity_usd * 0.05, 2); // ~5% depth → low slippage
    components.push({ factor: 'liquidity_slippage', points: liqPts, detail: `Transfer is ${round(liquidity_ratio * 100, 2)}% of destination liquidity (~${estimated_slippage_pct}% estimated slippage).` });
  } else {
    components.push({ factor: 'liquidity_slippage', points: 8, detail: 'No destination liquidity supplied — slippage risk scored conservatively.' });
    liqPts = 8;
  }

  // 2) Bridge design/security model.
  const typePts = BRIDGE_TYPE_RISK[bridge_type] ?? 20;
  components.push({ factor: 'bridge_security_model', points: typePts, detail: `"${bridge_type}" bridge security model.` });

  // 3) TVL maturity.
  let tvlPts = 0;
  if (bridge_tvl_usd !== undefined) {
    tvlPts = bridge_tvl_usd < 10_000_000 ? 25 : bridge_tvl_usd < 50_000_000 ? 15 : bridge_tvl_usd < 250_000_000 ? 8 : 0;
    components.push({ factor: 'tvl_maturity', points: tvlPts, detail: `Bridge TVL $${round(bridge_tvl_usd, 0)} — ${tvlPts === 0 ? 'large/battle-tested' : tvlPts <= 8 ? 'mid-size' : 'small/less proven'}.` });
  } else {
    tvlPts = 8;
    components.push({ factor: 'tvl_maturity', points: tvlPts, detail: 'No TVL supplied — maturity scored conservatively.' });
  }

  // 4) Audit.
  const auditPts = audited ? 0 : 15;
  components.push({ factor: 'audit', points: auditPts, detail: audited ? 'Bridge marked audited.' : 'Bridge not marked audited — smart-contract risk.' });

  // 5) Exploit history.
  const exploitPts = exploited_before ? 40 : 0;
  if (exploited_before) components.push({ factor: 'exploit_history', points: exploitPts, detail: 'Bridge has been exploited before — major red flag.' });

  // 6) Validator set (if external-validator/multisig style).
  let valPts = 0;
  if (validator_set_size !== undefined && validator_set_size > 0 && validator_set_size <= 5) {
    valPts = 10;
    components.push({ factor: 'validator_set', points: valPts, detail: `Small validator/multisig set (${validator_set_size}) — concentrated trust.` });
  }

  const bridge_risk_score = clamp(round(liqPts + typePts + tvlPts + auditPts + exploitPts + valPts, 0), 0, 100);
  const risk_band = bandOf(bridge_risk_score);
  // Trust score reflects the bridge's design/operational security (excludes transfer-size slippage).
  const trust_score = clamp(round(100 - (typePts + tvlPts + auditPts + exploitPts + valPts), 0), 0, 100);

  const hard_block = exploited_before;
  let verdict: Verdict;
  if (hard_block || bridge_risk_score >= 70) verdict = 'block';
  else if (bridge_risk_score >= 40 || (liquidity_ratio !== null && liquidity_ratio >= 0.1)) verdict = 'review';
  else verdict = 'allow';

  const reasons: string[] = [];
  if (exploited_before) reasons.push('Bridge has a prior exploit — hard block; do not route funds through it.');
  if (estimated_slippage_pct !== null && estimated_slippage_pct >= 1) reasons.push(`Transfer is large vs destination liquidity — ~${estimated_slippage_pct}% estimated slippage. Split into smaller transfers.`);
  if (typePts >= 20) reasons.push(`"${bridge_type}" bridges carry more trust assumptions than native/canonical bridges.`);
  if (tvlPts >= 15) reasons.push('Low bridge TVL — less battle-tested; higher tail risk.');
  if (!audited) reasons.push('No audit disclosed for the bridge.');
  if (reasons.length === 0) reasons.push('Transfer looks low-risk for the supplied params.');

  return {
    result: {
      bridge, bridge_type, source_chain, dest_chain, amount_usd: amt, cross_chain,
      liquidity_ratio, estimated_slippage_pct, liquidity_risk_band, recommended_max_transfer_usd,
      bridge_risk_score, risk_band, trust_score, components,
      verdict, hard_block, exploited_before, audited,
      reasons,
    },
  };
}

function actions(r: BridgeResult): string[] {
  const out = [`Assessed a $${r.amount_usd} transfer via ${r.bridge} (${r.bridge_type}): bridge risk ${r.bridge_risk_score}/100 (${r.risk_band}), trust ${r.trust_score}/100 → verdict ${r.verdict}.`];
  if (r.exploited_before) out.push('This bridge was exploited before — route through a trust-minimized/native bridge instead.');
  if (r.estimated_slippage_pct !== null && r.estimated_slippage_pct >= 1 && r.recommended_max_transfer_usd !== null) out.push(`Estimated ~${r.estimated_slippage_pct}% slippage; keep transfers at or under ~$${r.recommended_max_transfer_usd} (≈5% of liquidity) to minimize it.`);
  if (!r.audited) out.push('Confirm the bridge contracts are audited before transferring.');
  if (out.length === 1) out.push('Bridge and transfer size look reasonable; proceed with normal caution.');
  return out;
}

const CHAIN_TO = [
  { api: 'cross-chain-bridge', reason: 'Look up live bridge routes/quotes to populate dest_liquidity and time-to-finality.', url: 'https://orbis-apis.onrender.com/cross-chain-bridge' },
  { api: 'smart-contract-risk', reason: 'Deep-dive the bridge contract for permission/upgradeability risk.', url: 'https://orbis-apis.onrender.com/smart-contract-risk' },
  { api: 'multi-wallet-portfolio-risk-rollup', reason: 'Fold cross-chain exposure into the broader portfolio risk view.', url: 'https://orbis-apis.onrender.com/multi-wallet-portfolio-risk-rollup' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Bridge Transfer Risk API', version: '1.0.0',
    description: 'Deterministic cross-chain bridge transfer risk assessor. From caller-supplied params for a single transfer (amount, bridge, bridge type, chains, optional TVL / dest liquidity / audit / exploit history) it returns a liquidity/slippage estimate, a bridge-design trust score, a composite bridge_risk_score, a recommended max transfer size, and an allow/review/block verdict. Scores the params you supply — no chain or liquidity fetch. No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/bridge-transfer-risk/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/assess', summary: 'Score a single bridge transfer', price_usdc: 0.025 },
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
    confidence_score: 0.8, confidence_per_section: { assessment: 1, interpretation: 0.7 },
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
      why_result_generated: `Scored a $${v.amount_usd} transfer via ${v.bridge}; composite bridge risk is ${v.bridge_risk_score}/100 (${v.risk_band}) → verdict ${v.verdict}${v.hard_block ? ' via exploit-history hard-block' : ''}.`,
      key_factors: v.components.map((c) => `${c.factor}: +${c.points} — ${c.detail}`),
      invalidators: [
        'Scores only the params you supplied — without dest_liquidity, slippage is scored conservatively rather than computed.',
        'Slippage is a depth-consumed estimate, not a live quote; the actual route may differ.',
        'Bridge-type and TVL defaults are conservative; supplying accurate facts changes the score.',
      ],
    },
    confidence_score: 0.8, confidence_per_section: { assessment: 1, interpretation: 0.7 },
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
