import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { num, str, round, clamp, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic wallet trust/risk fusion layer. Combines the signals an agent has
// already gathered — address risk, exposure, approvals, reputation, balance — into a
// single composite risk score, trust tier, and allow/review/block verdict. It scores
// the signals you pass in (no chain fetch); for any signal you omit it returns a
// chain_to pointer to the live Orbis API that produces it. No LLM, nothing stored.

const router = Router();

const DISCLAIMER =
  'Composite is computed only from the signals you supply, re-weighted over the sources present — it is not on-chain analysis and not financial/compliance advice. Omitted sources are not assumed safe; they are listed under missing_sources. A wrong input changes the verdict.';

const truthy = (v: unknown) => v === true || v === 'true' || v === 'yes' || v === 1;

// Base weights across the four risk-bearing sources (balance is context, not scored).
// Re-normalized over whichever sources are actually supplied.
const BASE_WEIGHTS: Record<string, number> = { address_risk: 0.4, exposure: 0.3, approvals: 0.2, reputation: 0.1 };

export type Tier = 'trusted' | 'neutral' | 'caution' | 'high_risk';
export type Verdict = 'allow' | 'review' | 'block';

export interface SourceContribution { source: string; risk: number; weight: number; weighted: number; note: string; }
export interface MissingSource { source: string; chain_to: string; reason: string; }

export interface BundleResult {
  address: string | null;
  composite_risk_score: number;
  trust_tier: Tier;
  verdict: Verdict;
  hard_block: boolean;
  sources_used: string[];
  source_contributions: SourceContribution[];
  missing_sources: MissingSource[];
  balance_context: { net_worth_usd: number | null; token_count: number | null } | null;
}

const MISSING_MAP: Record<string, { chain_to: string; reason: string }> = {
  address_risk: { chain_to: 'wallet-address-risk', reason: 'Fetch an AML/sanctions risk score for the address.' },
  exposure: { chain_to: 'wallet-address-risk', reason: 'Fetch mixer and flagged-counterparty exposure percentages.' },
  approvals: { chain_to: 'token-approval-risk-scanner', reason: 'Scan active token approvals for unlimited/flagged/stale drain exposure.' },
  reputation: { chain_to: 'wallet-reputation', reason: 'Score the wallet 0-100 from age, history, balance and activity.' },
};

export function assess(body: any): { error: string } | { result: BundleResult } {
  if (body === undefined || body === null || typeof body !== 'object' || Array.isArray(body))
    return { error: 'Provide a JSON object with one or more signal blocks (address_risk, exposure, approvals, reputation, balance).' };

  const contributions: SourceContribution[] = [];
  const present: Record<string, number> = {}; // source -> 0-100 risk
  let hard_block = false;

  // address_risk: { score 0-100 (higher = riskier), sanctioned? }
  if (body.address_risk && typeof body.address_risk === 'object') {
    const s = num(body.address_risk.score);
    if (s !== undefined) {
      present.address_risk = clamp(round(s, 0), 0, 100);
      if (truthy(body.address_risk.sanctioned)) hard_block = true;
    }
  }
  // exposure: { mixer_exposure_pct, flagged_counterparty_pct } both 0-100
  if (body.exposure && typeof body.exposure === 'object') {
    const mix = num(body.exposure.mixer_exposure_pct);
    const flg = num(body.exposure.flagged_counterparty_pct);
    if (mix !== undefined || flg !== undefined) {
      const risk = clamp(round(Math.max(mix ?? 0, flg ?? 0), 0), 0, 100);
      present.exposure = risk;
      if ((mix ?? 0) >= 25 || (flg ?? 0) >= 25) hard_block = true;
    }
  }
  // approvals: { exposure_score 0-100 } OR { unlimited_count, flagged_spender_count, total_count }
  if (body.approvals && typeof body.approvals === 'object') {
    const direct = num(body.approvals.exposure_score);
    if (direct !== undefined) {
      present.approvals = clamp(round(direct, 0), 0, 100);
    } else {
      const unl = num(body.approvals.unlimited_count) ?? 0;
      const flg = num(body.approvals.flagged_spender_count) ?? 0;
      const tot = num(body.approvals.total_count) ?? 0;
      if (body.approvals.unlimited_count !== undefined || body.approvals.flagged_spender_count !== undefined || body.approvals.total_count !== undefined) {
        present.approvals = clamp(round(Math.min(100, unl * 15 + flg * 30 + tot * 1), 0), 0, 100);
      }
    }
    if (truthy(body.approvals.flagged_spender_count) && num(body.approvals.flagged_spender_count)! > 0) hard_block = true;
  }
  // reputation: { score 0-100, higher = BETTER } -> risk = 100 - score
  if (body.reputation && typeof body.reputation === 'object') {
    const s = num(body.reputation.score);
    if (s !== undefined) present.reputation = clamp(round(100 - s, 0), 0, 100);
  }

  const usedKeys = Object.keys(present);
  if (usedKeys.length === 0)
    return { error: 'Supply at least one scored signal: address_risk.score, exposure.{mixer,flagged}_pct, approvals.{exposure_score|counts}, or reputation.score.' };

  const wSum = usedKeys.reduce((s, k) => s + BASE_WEIGHTS[k], 0);
  for (const k of usedKeys) {
    const weight = round(BASE_WEIGHTS[k] / wSum, 4);
    const risk = present[k];
    contributions.push({
      source: k, risk, weight, weighted: round(risk * weight, 2),
      note: `${k} contributed ${risk}/100 at re-normalized weight ${weight}.`,
    });
  }
  let composite = clamp(round(contributions.reduce((s, c) => s + c.weighted, 0), 0), 0, 100);
  if (hard_block) composite = Math.max(composite, 75);

  const trust_tier: Tier = composite >= 75 ? 'high_risk' : composite >= 50 ? 'caution' : composite >= 25 ? 'neutral' : 'trusted';
  const verdict: Verdict = hard_block || composite >= 70 ? 'block' : composite >= 40 ? 'review' : 'allow';

  const missing_sources: MissingSource[] = Object.keys(MISSING_MAP)
    .filter((k) => !(k in present))
    .map((k) => ({ source: k, chain_to: MISSING_MAP[k].chain_to, reason: MISSING_MAP[k].reason }));

  let balance_context: BundleResult['balance_context'] = null;
  if (body.balance && typeof body.balance === 'object') {
    balance_context = { net_worth_usd: num(body.balance.net_worth_usd) ?? null, token_count: num(body.balance.token_count) ?? null };
  }

  return {
    result: {
      address: str(body.address) ?? null,
      composite_risk_score: composite, trust_tier, verdict, hard_block,
      sources_used: usedKeys, source_contributions: contributions, missing_sources, balance_context,
    },
  };
}

function actions(r: BundleResult): string[] {
  const out = [`Composite wallet risk ${r.composite_risk_score}/100 (${r.trust_tier}) from ${r.sources_used.length} signal(s) → verdict: ${r.verdict}.`];
  if (r.hard_block) out.push('Hard-block signal present (sanctioned / heavy mixer or flagged exposure) — do not transact without enhanced due diligence.');
  if (r.verdict === 'block') out.push('Block: halt the autonomous action and escalate for manual review.');
  else if (r.verdict === 'review') out.push('Review: gate the action behind human approval or a stricter threshold.');
  else out.push('Allow: no strong risk signals in the supplied evidence; proceed with normal monitoring.');
  if (r.missing_sources.length > 0) out.push(`Strengthen the verdict by fetching ${r.missing_sources.length} missing signal(s): ${r.missing_sources.map((m) => m.source).join(', ')}.`);
  return out;
}

function chainTo(r: BundleResult) {
  // Surface the live APIs for any signals the caller did not supply, plus stable anchors.
  const dynamic = r.missing_sources.map((m) => ({ api: m.chain_to, reason: m.reason }));
  const seen = new Set(dynamic.map((d) => d.api));
  const anchors = [
    { api: 'wallet-balance', reason: 'Pull current token balances and net worth for the address.' },
    { api: 'wallet-portfolio', reason: 'Get full portfolio composition and PnL for deeper context.' },
  ].filter((a) => !seen.has(a.api));
  return [...dynamic, ...anchors];
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Wallet Risk Bundle API', version: '1.0.0',
    description: 'Deterministic wallet trust/risk fusion. Combines address risk, exposure, token approvals, reputation, and balance context into one composite risk score, trust tier, and allow/review/block verdict — re-weighted over whichever signals you supply, with chain_to pointers to fetch any missing one. No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/wallet-risk-bundle/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/assess', summary: 'Fuse supplied wallet signals into a composite verdict', price_usdc: 0.025 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL verdict + reasoning + prioritized actions', price_usdc: 0.05 },
    ],
    pricing: [
      { path: '/assess', price_usdc: 0.025, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.05, currency: 'USDC' },
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
    confidence_score: 0.8, confidence_per_section: { fusion: 1, interpretation: 0.6 },
    recommended_actions_priority_order: actions(r.result), chain_to: chainTo(r.result), privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
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
      why_result_generated: `Re-weighted ${v.sources_used.length} supplied signal(s) into composite ${v.composite_risk_score}/100 (${v.trust_tier}); verdict ${v.verdict}${v.hard_block ? ' via hard-block override' : ''}.`,
      key_factors: v.source_contributions.map((c) => `${c.source}: ${c.risk}/100 @ w=${c.weight} → ${c.weighted}.`),
      invalidators: [
        'The composite reflects only the signals you supplied; missing_sources are excluded, not assumed safe.',
        'Source weights are opinionated; a different weighting would shift the verdict near thresholds.',
        'Supplied signals are trusted as-is — a stale or wrong input propagates straight into the verdict.',
      ],
    },
    confidence_score: 0.8, confidence_per_section: { fusion: 1, interpretation: 0.6 },
    recommended_actions_priority_order: actions(v), chain_to: chainTo(v), privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
