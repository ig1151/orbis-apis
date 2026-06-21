import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { num, str, round, clamp, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic DeFi yield-exposure analyzer. Takes a CALLER-SUPPLIED set of yield
// positions (protocol, USD amount, APY, type, optional IL risk / lockup / audit / reward
// token) and rolls them into a portfolio yield-risk view: value-weighted APY, value-
// weighted yield-risk score, protocol concentration (HHI), impermanent-loss exposure,
// locked (illiquid) share, high-APY (yield-chasing) share, reward-token dependency, a
// type breakdown, and an allow/review/block verdict. It does NOT fetch the chain — it
// rolls up the positions you pass in — so it is advisory, not a live yield monitor. Higher
// score = riskier. No LLM, nothing stored.

const router = Router();

const DISCLAIMER =
  'Roll-up over the yield positions you supplied — not a live protocol/APY feed, not financial advice. APYs and protocol facts are trusted as given; a position you omit is excluded. High APY reflects higher risk, not guaranteed return; APYs vary and can go to zero.';

const truthy = (v: unknown) => v === true || v === 'true' || v === 'yes' || v === 1;

export type Band = 'low' | 'medium' | 'high' | 'severe';
export type Verdict = 'allow' | 'review' | 'block';

const bandOf = (s: number): Band => (s >= 75 ? 'severe' : s >= 50 ? 'high' : s >= 25 ? 'medium' : 'low');

const TYPE_RISK: Record<string, number> = {
  farm: 18, yield_farm: 18, vault: 14, restaking: 16, lp: 14, liquidity: 14, lending: 6, staking: 6, savings: 4,
};
const IL_RISK_PTS: Record<string, number> = { high: 20, medium: 10, low: 3, none: 0 };
const POSITION_TYPES = new Set(Object.keys(TYPE_RISK));
const IL_LEVELS = new Set(['none', 'low', 'medium', 'high']);

export interface PositionRow {
  protocol: string;
  type: string;
  amount_usd: number;
  value_share_pct: number;
  apy_pct: number;
  reward_token: string | null;
  il_risk: 'none' | 'low' | 'medium' | 'high' | 'unknown';
  is_stable_pair: boolean;
  lockup_days: number;
  audited: boolean;
  risk_score: number;
  risk_band: Band;
  weighted_risk_contribution: number;
  reasons: string[];
}

export interface YieldResult {
  portfolio: string | null;
  position_count: number;
  total_yield_position_usd: number;
  weighted_apy_pct: number;
  yield_risk_score: number;
  risk_band: Band;
  il_exposure_pct: number;
  locked_pct: number;
  high_apy_exposure_pct: number;
  reward_token_dependency_pct: number;
  unaudited_pct: number;
  protocol_concentration: { hhi: number; band: 'low' | 'moderate' | 'high'; top_protocol: string | null; top_protocol_share_pct: number };
  type_breakdown: { type: string; amount_usd: number; share_pct: number; position_count: number }[];
  verdict: Verdict;
  hard_block: boolean;
  positions: PositionRow[];
  highest_risk_positions: PositionRow[];
}

function scorePosition(p: any): Omit<PositionRow, 'value_share_pct' | 'weighted_risk_contribution'> {
  const protocol = str(p.protocol) ?? str(p.name) ?? str(p.platform) ?? 'unknown-protocol';
  const typeRaw = (str(p.type) ?? '').toLowerCase();
  const type = POSITION_TYPES.has(typeRaw) ? typeRaw : 'unknown';
  const amount_usd = Math.max(0, round(num(p.amount_usd) ?? num(p.value_usd) ?? num(p.amount) ?? 0, 2));
  const apy_pct = Math.max(0, round(num(p.apy_pct) ?? num(p.apy) ?? num(p.apr) ?? 0, 2));
  const reward_token = str(p.reward_token) ?? str(p.reward) ?? null;
  const ilRaw = (str(p.il_risk) ?? str(p.impermanent_loss_risk) ?? '').toLowerCase();
  const il_risk: PositionRow['il_risk'] = IL_LEVELS.has(ilRaw) ? (ilRaw as any) : 'unknown';
  const is_stable_pair = truthy(p.is_stable_pair) || truthy(p.stable_pair);
  const lockup_days = Math.max(0, Math.trunc(num(p.lockup_days) ?? num(p.lock_days) ?? 0));
  const audited = truthy(p.audited) || (str(p.audit) ?? '').toLowerCase() === 'audited';

  const apyPts = apy_pct >= 100 ? 35 : apy_pct >= 50 ? 20 : apy_pct >= 20 ? 8 : 0;
  let typePts = TYPE_RISK[type] ?? 12;
  if ((type === 'lp' || type === 'liquidity') && is_stable_pair) typePts = 5; // stable LP has minimal IL
  // IL: explicit risk wins; otherwise infer for non-stable LP/farm.
  let ilPts: number;
  if (il_risk !== 'unknown') ilPts = IL_RISK_PTS[il_risk];
  else ilPts = (type === 'lp' || type === 'liquidity' || type === 'farm') && !is_stable_pair ? 10 : 0;
  const lockPts = lockup_days >= 90 ? 12 : lockup_days >= 30 ? 8 : lockup_days >= 7 ? 3 : 0;
  const auditPts = audited ? 0 : 10;
  const risk_score = clamp(round(apyPts + typePts + ilPts + lockPts + auditPts, 0), 0, 100);

  const reasons: string[] = [];
  if (apy_pct >= 50) reasons.push(`Very high APY (${apy_pct}%) — elevated/unsustainable-yield risk.`);
  if ((type === 'lp' || type === 'liquidity' || type === 'farm') && !is_stable_pair && il_risk !== 'none' && il_risk !== 'low') reasons.push('Non-stable LP/farm position — exposed to impermanent loss.');
  if (lockup_days > 0) reasons.push(`Funds locked for ${lockup_days} day(s) — illiquid; cannot exit on a depeg/exploit.`);
  if (!audited) reasons.push('Protocol not marked audited — smart-contract risk.');
  if (reasons.length === 0) reasons.push(`${type} on ${protocol} at ${apy_pct}% APY — lower-risk yield position.`);

  return { protocol, type, amount_usd, apy_pct, reward_token, il_risk, is_stable_pair, lockup_days, audited, risk_score, risk_band: bandOf(risk_score), reasons };
}

export function analyze(body: any): { error: string } | { result: YieldResult } {
  if (body === undefined || body === null || typeof body !== 'object' || Array.isArray(body))
    return { error: 'Provide a JSON object with a "positions" array.' };
  const list = body.positions;
  if (!Array.isArray(list) || list.length === 0)
    return { error: 'Provide a non-empty "positions" array; each item is a yield position (protocol, amount_usd, apy_pct, type, optional il_risk/lockup_days/audited/reward_token).' };
  if (list.length > 1000) return { error: 'Too many positions — limit 1000 per call.' };
  if (!list.every((p) => p && typeof p === 'object' && !Array.isArray(p)))
    return { error: 'Every positions[] item must be a JSON object.' };

  const scored = list.map(scorePosition);
  const total_yield_position_usd = round(scored.reduce((s, p) => s + p.amount_usd, 0), 2);
  const n = scored.length;
  const weightOf = (amt: number) => (total_yield_position_usd > 0 ? amt / total_yield_position_usd : 1 / n);

  const positions: PositionRow[] = scored.map((p) => {
    const frac = weightOf(p.amount_usd);
    return { ...p, value_share_pct: round(frac * 100, 2), weighted_risk_contribution: round(frac * p.risk_score, 2) };
  }).sort((a, b) => b.weighted_risk_contribution - a.weighted_risk_contribution || b.amount_usd - a.amount_usd);

  const weighted_apy_pct = round(positions.reduce((s, p) => s + weightOf(p.amount_usd) * p.apy_pct, 0), 2);
  const yield_risk_score = clamp(round(positions.reduce((s, p) => s + p.weighted_risk_contribution, 0), 0), 0, 100);

  const shareOf = (pred: (p: PositionRow) => boolean) => round(positions.filter(pred).reduce((s, p) => s + weightOf(p.amount_usd), 0) * 100, 2);
  const il_exposure_pct = shareOf((p) => p.il_risk === 'medium' || p.il_risk === 'high' || ((p.type === 'lp' || p.type === 'liquidity' || p.type === 'farm') && !p.is_stable_pair && p.il_risk === 'unknown'));
  const locked_pct = shareOf((p) => p.lockup_days > 0);
  const high_apy_exposure_pct = shareOf((p) => p.apy_pct >= 50);
  const reward_token_dependency_pct = shareOf((p) => p.reward_token !== null);
  const unaudited_pct = shareOf((p) => !p.audited);

  const protoMap = new Map<string, number>();
  for (const p of positions) protoMap.set(p.protocol, (protoMap.get(p.protocol) ?? 0) + p.amount_usd);
  const hhi = round([...protoMap.values()].reduce((s, amt) => { const f = weightOf(amt); return s + f * f; }, 0), 4);
  const conc_band: 'low' | 'moderate' | 'high' = hhi >= 0.5 ? 'high' : hhi >= 0.3 ? 'moderate' : 'low';
  let top_protocol: string | null = null; let topAmt = 0;
  for (const [k, amt] of protoMap) if (amt > topAmt) { topAmt = amt; top_protocol = k; }
  const top_protocol_share_pct = round(weightOf(topAmt) * 100, 2);

  const typeMap = new Map<string, { amt: number; count: number }>();
  for (const p of positions) { const e = typeMap.get(p.type) ?? { amt: 0, count: 0 }; e.amt += p.amount_usd; e.count += 1; typeMap.set(p.type, e); }
  const type_breakdown = [...typeMap.entries()]
    .map(([type, e]) => ({ type, amount_usd: round(e.amt, 2), share_pct: round(weightOf(e.amt) * 100, 2), position_count: e.count }))
    .sort((a, b) => b.amount_usd - a.amount_usd);

  const hard_block = false;
  let verdict: Verdict;
  if (yield_risk_score >= 70) verdict = 'block';
  else if (yield_risk_score >= 40 || high_apy_exposure_pct >= 25 || il_exposure_pct >= 25 || conc_band === 'high') verdict = 'review';
  else verdict = 'allow';

  return {
    result: {
      portfolio: str(body.portfolio) ?? str(body.wallet) ?? str(body.address) ?? null,
      position_count: n, total_yield_position_usd,
      weighted_apy_pct, yield_risk_score, risk_band: bandOf(yield_risk_score),
      il_exposure_pct, locked_pct, high_apy_exposure_pct, reward_token_dependency_pct, unaudited_pct,
      protocol_concentration: { hhi, band: conc_band, top_protocol, top_protocol_share_pct },
      type_breakdown,
      verdict, hard_block,
      positions,
      highest_risk_positions: positions.filter((p) => p.risk_score >= 50).slice(0, 5),
    },
  };
}

function actions(r: YieldResult): string[] {
  const out = [`Rolled up ${r.position_count} yield positions ($${r.total_yield_position_usd}, blended APY ${r.weighted_apy_pct}%): yield risk ${r.yield_risk_score}/100 (${r.risk_band}) → verdict ${r.verdict}.`];
  if (r.high_apy_exposure_pct > 0) out.push(`${r.high_apy_exposure_pct}% of value is in ≥50% APY positions — verify the yield is real and sustainable, not a temporary emission or a trap.`);
  if (r.il_exposure_pct > 0) out.push(`${r.il_exposure_pct}% is exposed to impermanent loss — model the IL vs fees before holding through volatility.`);
  if (r.locked_pct > 0) out.push(`${r.locked_pct}% of value is locked — you cannot exit these on a depeg or exploit; size accordingly.`);
  if (r.protocol_concentration.band !== 'low') out.push(`${r.protocol_concentration.band} protocol concentration; ${r.protocol_concentration.top_protocol} holds ${r.protocol_concentration.top_protocol_share_pct}% — single-protocol exploit risk. Diversify.`);
  if (r.unaudited_pct >= 25) out.push(`${r.unaudited_pct}% of value is in unaudited protocols — elevated smart-contract risk.`);
  if (out.length === 1) out.push('Yield exposure is conservative and diversified; continue periodic review.');
  return out;
}

const CHAIN_TO = [
  { api: 'multi-wallet-portfolio-risk-rollup', reason: 'Roll the yield sleeve up with the rest of the wallet fleet for one portfolio verdict.', url: 'https://orbis-apis.onrender.com/multi-wallet-portfolio-risk-rollup' },
  { api: 'portfolio-stablecoin-risk', reason: 'Assess depeg risk on any stablecoins backing these yield positions.', url: 'https://orbis-apis.onrender.com/portfolio-stablecoin-risk' },
  { api: 'smart-contract-risk', reason: 'Deep-dive the smart-contract risk of an unaudited or high-concentration protocol.', url: 'https://orbis-apis.onrender.com/smart-contract-risk' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Portfolio Yield Exposure API', version: '1.0.0',
    description: 'Deterministic DeFi yield-exposure analyzer. From a caller-supplied set of yield positions (protocol, USD amount, APY, type, optional IL risk / lockup / audit / reward token) it computes value-weighted APY, a value-weighted yield-risk score, protocol concentration (HHI), impermanent-loss exposure, locked share, high-APY share, reward-token dependency, a type breakdown, and an allow/review/block verdict. Rolls up the positions you supply — no chain fetch. No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/portfolio-yield-exposure/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/analyze', summary: 'Roll up yield positions into a yield-risk view', price_usdc: 0.025 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL analysis + reasoning + prioritized actions', price_usdc: 0.04 },
    ],
    pricing: [
      { path: '/analyze', price_usdc: 0.025, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.04, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/analyze', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = analyze(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, {
    ...r.result, risk_disclaimer: DISCLAIMER,
    confidence_score: 0.85, confidence_per_section: { rollup: 1, interpretation: 0.7 },
    recommended_actions_priority_order: actions(r.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = analyze(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v, risk_disclaimer: DISCLAIMER,
    reasoning: {
      why_result_generated: `Rolled up ${v.position_count} yield positions; value-weighted yield risk is ${v.yield_risk_score}/100 (${v.risk_band}) at a blended ${v.weighted_apy_pct}% APY → verdict ${v.verdict}.`,
      key_factors: [
        `Total $${v.total_yield_position_usd}; blended APY ${v.weighted_apy_pct}%.`,
        `High-APY (≥50%) exposure ${v.high_apy_exposure_pct}%; IL exposure ${v.il_exposure_pct}%; locked ${v.locked_pct}%.`,
        `Protocol concentration HHI ${v.protocol_concentration.hhi} (${v.protocol_concentration.band}); top protocol ${v.protocol_concentration.top_protocol} ${v.protocol_concentration.top_protocol_share_pct}%.`,
        `Unaudited exposure ${v.unaudited_pct}%; reward-token dependency ${v.reward_token_dependency_pct}%.`,
      ],
      invalidators: [
        'Rolls up only the positions you supplied — omitted positions are excluded.',
        'APY is taken as given and treated as a risk signal, not a guaranteed return; emissions-based APYs decay.',
        'IL risk is inferred for non-stable LP/farm positions when not supplied; an explicit il_risk overrides the inference.',
      ],
    },
    confidence_score: 0.85, confidence_per_section: { rollup: 1, interpretation: 0.7 },
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
