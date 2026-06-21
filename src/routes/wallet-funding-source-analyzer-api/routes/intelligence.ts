import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { num, str, round, clamp, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic wallet funding-source analyzer. Takes a CALLER-SUPPLIED set of inflow
// sources (where a wallet's funds came from) with USD amounts, optional category, KYC
// level, and flags, and scores the provenance: value-weighted funding risk, KYC coverage,
// unknown/mixer/flagged/sanctioned funding shares, source concentration, and an
// allow/review/block verdict. It does NOT fetch the chain — it analyzes the sources you
// pass in — so it is advisory, not a verdict on a live wallet. Higher score = riskier
// provenance. No LLM, nothing stored.

const router = Router();

const DISCLAIMER =
  'Provenance analysis over the funding sources you supplied — not on-chain tracing, not financial/compliance advice. Inputs are trusted as given; a source you omit is excluded, not assumed clean. Funds from a source you did not supply are unaccounted for, not assumed legitimate.';

const truthy = (v: unknown) => v === true || v === 'true' || v === 'yes' || v === 1;

// Default funding-source risk (0-100) by category when no explicit risk_score is given.
const CATEGORY_RISK: Record<string, number> = {
  mixer: 90, tumbler: 90, scam: 95, darknet: 95,
  p2p: 50, otc: 40, ico: 40, bridge: 40, presale: 45,
  unknown: 45, nft_sale: 30, defi: 30, dex: 30, eoa: 30, airdrop: 30,
  contract: 25, lending: 25, gambling: 60,
  staking: 18, cex: 15, exchange: 15, faucet: 20, fiat_onramp: 10, onramp: 10, salary: 10,
};
const MIXER_CATEGORIES = new Set(['mixer', 'tumbler']);
const KYC_LEVELS = new Set(['none', 'basic', 'full']);

export type Band = 'low' | 'medium' | 'high' | 'severe';
export type Verdict = 'allow' | 'review' | 'block';
type RiskSource = 'sanctioned' | 'flagged' | 'supplied' | 'category' | 'default';

export interface SourceRow {
  label: string;
  address: string | null;
  category: string;
  amount_usd: number;
  funding_share_pct: number;
  kyc_level: 'none' | 'basic' | 'full' | 'unknown';
  risk_score: number; // 0-100
  risk_source: RiskSource;
  kyc_adjusted: boolean;
  flagged: boolean;
  sanctioned: boolean;
  weighted_risk_contribution: number;
  reasons: string[];
}

export interface FundingResult {
  wallet: string | null;
  source_count: number;
  funded_total_usd: number;
  funding_risk_score: number; // 0-100 value-weighted
  funding_risk_band: Band;
  kyc_coverage_pct: number; // share of funds from basic+full KYC sources
  full_kyc_pct: number;
  unknown_source_pct: number;
  mixer_funding_pct: number;
  flagged_funding_pct: number;
  sanctioned_funding_pct: number;
  concentration: { hhi: number; band: 'low' | 'moderate' | 'high'; top_source_share_pct: number; top3_share_pct: number };
  category_breakdown: { category: string; amount_usd: number; share_pct: number; source_count: number }[];
  verdict: Verdict;
  hard_block: boolean;
  sources: SourceRow[];
  top_sources: SourceRow[];
  high_risk_sources: SourceRow[];
}

const bandOf = (s: number): Band => (s >= 75 ? 'severe' : s >= 50 ? 'high' : s >= 25 ? 'medium' : 'low');

function scoreSource(s: any): Omit<SourceRow, 'funding_share_pct' | 'weighted_risk_contribution'> {
  const label = str(s.label) ?? str(s.name) ?? str(s.address) ?? str(s.source) ?? 'unknown-source';
  const address = str(s.address) ?? null;
  const category = (str(s.category) ?? 'unknown').toLowerCase();
  const amount_usd = Math.max(0, round(num(s.amount_usd) ?? num(s.value_usd) ?? num(s.amount) ?? 0, 2));
  const flagged = truthy(s.flagged) || truthy(s.blocklisted);
  const sanctioned = truthy(s.sanctioned);
  const kycRaw = (str(s.kyc_level) ?? str(s.kyc) ?? '').toLowerCase();
  const kyc_level: SourceRow['kyc_level'] = KYC_LEVELS.has(kycRaw) ? (kycRaw as any) : 'unknown';

  const supplied = num(s.risk_score);
  const categoryKnown = category in CATEGORY_RISK && category !== 'unknown';
  let risk: number;
  let risk_source: RiskSource;
  if (supplied !== undefined) { risk = clamp(round(supplied, 0), 0, 100); risk_source = 'supplied'; }
  else if (categoryKnown) { risk = CATEGORY_RISK[category]; risk_source = 'category'; }
  else { risk = CATEGORY_RISK.unknown; risk_source = 'default'; }

  // KYC adjustment (does not apply to flagged/sanctioned, which dominate).
  let kyc_adjusted = false;
  if (!flagged && !sanctioned) {
    if (kyc_level === 'full') { risk = clamp(round(risk * 0.6, 0), 0, 100); kyc_adjusted = true; }
    else if (kyc_level === 'none') { risk = clamp(risk + 8, 0, 100); kyc_adjusted = true; }
  }
  if (flagged && risk < 90) risk = 90;
  if (flagged) risk_source = 'flagged';
  if (sanctioned) { risk = 100; risk_source = 'sanctioned'; }

  const reasons: string[] = [];
  if (sanctioned) reasons.push('Sanctioned funding source — funds are tainted; hard compliance block.');
  if (flagged && !sanctioned) reasons.push('Flagged/blocklisted funding source — treat provenance as high risk.');
  if (MIXER_CATEGORIES.has(category)) reasons.push('Funds originate from a mixer/tumbler — provenance is obscured.');
  if (risk_source === 'default') reasons.push('Unknown source with no risk score — scored at the neutral-unknown default.');
  if (kyc_adjusted && kyc_level === 'full') reasons.push('Full-KYC source — provenance risk discounted.');
  if (kyc_adjusted && kyc_level === 'none') reasons.push('No-KYC source — provenance risk nudged up.');
  if (reasons.length === 0) reasons.push('Lower-risk funding source by the supplied evidence.');

  return { label, address, category, amount_usd, kyc_level, risk_score: risk, risk_source, kyc_adjusted, flagged, sanctioned, reasons };
}

export function analyze(body: any): { error: string } | { result: FundingResult } {
  if (body === undefined || body === null || typeof body !== 'object' || Array.isArray(body))
    return { error: 'Provide a JSON object with a "sources" array.' };
  const list = body.sources;
  if (!Array.isArray(list) || list.length === 0)
    return { error: 'Provide a non-empty "sources" array; each item is a funding source (label/address, amount_usd, optional category/kyc_level/risk_score/flagged/sanctioned).' };
  if (list.length > 1000) return { error: 'Too many sources — limit 1000 per call.' };
  if (!list.every((s) => s && typeof s === 'object' && !Array.isArray(s)))
    return { error: 'Every sources[] item must be a JSON object.' };

  const scored = list.map(scoreSource);
  const funded_total_usd = round(scored.reduce((s, c) => s + c.amount_usd, 0), 2);
  const n = scored.length;
  const weightOf = (amt: number) => (funded_total_usd > 0 ? amt / funded_total_usd : 1 / n);

  const sources: SourceRow[] = scored.map((c) => {
    const frac = weightOf(c.amount_usd);
    return { ...c, funding_share_pct: round(frac * 100, 2), weighted_risk_contribution: round(frac * c.risk_score, 2) };
  }).sort((a, b) => b.amount_usd - a.amount_usd || b.risk_score - a.risk_score);

  const funding_risk_score = clamp(round(sources.reduce((s, c) => s + c.weighted_risk_contribution, 0), 0), 0, 100);
  const funding_risk_band = bandOf(funding_risk_score);

  const shareOf = (pred: (c: SourceRow) => boolean) => round(sources.filter(pred).reduce((s, c) => s + weightOf(c.amount_usd), 0) * 100, 2);
  const kyc_coverage_pct = shareOf((c) => c.kyc_level === 'basic' || c.kyc_level === 'full');
  const full_kyc_pct = shareOf((c) => c.kyc_level === 'full');
  const unknown_source_pct = shareOf((c) => c.category === 'unknown' || c.risk_source === 'default');
  const mixer_funding_pct = shareOf((c) => MIXER_CATEGORIES.has(c.category));
  const flagged_funding_pct = shareOf((c) => c.flagged);
  const sanctioned_funding_pct = shareOf((c) => c.sanctioned);

  const hhi = round(sources.reduce((s, c) => { const f = weightOf(c.amount_usd); return s + f * f; }, 0), 4);
  const conc_band: 'low' | 'moderate' | 'high' = hhi >= 0.25 ? 'high' : hhi >= 0.15 ? 'moderate' : 'low';
  const top_source_share_pct = sources.length > 0 ? round(weightOf(sources[0].amount_usd) * 100, 2) : 0;
  const top3_share_pct = round(sources.slice(0, 3).reduce((s, c) => s + weightOf(c.amount_usd), 0) * 100, 2);

  const catMap = new Map<string, { amt: number; count: number }>();
  for (const c of sources) { const e = catMap.get(c.category) ?? { amt: 0, count: 0 }; e.amt += c.amount_usd; e.count += 1; catMap.set(c.category, e); }
  const category_breakdown = [...catMap.entries()]
    .map(([category, e]) => ({ category, amount_usd: round(e.amt, 2), share_pct: round(weightOf(e.amt) * 100, 2), source_count: e.count }))
    .sort((a, b) => b.amount_usd - a.amount_usd);

  const hard_block = sources.some((c) => c.sanctioned) || mixer_funding_pct >= 25;
  let verdict: Verdict;
  if (hard_block || funding_risk_score >= 70 || flagged_funding_pct >= 25) verdict = 'block';
  else if (funding_risk_score >= 40 || flagged_funding_pct > 0 || mixer_funding_pct > 0 || unknown_source_pct >= 50) verdict = 'review';
  else verdict = 'allow';

  return {
    result: {
      wallet: str(body.wallet) ?? str(body.address) ?? null,
      source_count: n, funded_total_usd,
      funding_risk_score, funding_risk_band,
      kyc_coverage_pct, full_kyc_pct, unknown_source_pct, mixer_funding_pct, flagged_funding_pct, sanctioned_funding_pct,
      concentration: { hhi, band: conc_band, top_source_share_pct, top3_share_pct },
      category_breakdown,
      verdict, hard_block,
      sources,
      top_sources: sources.slice(0, 5),
      high_risk_sources: sources.filter((c) => c.risk_score >= 50),
    },
  };
}

function actions(r: FundingResult): string[] {
  const out = [`Analyzed ${r.source_count} funding sources ($${r.funded_total_usd}): funding risk ${r.funding_risk_score}/100 (${r.funding_risk_band}) → verdict ${r.verdict}.`];
  if (r.sanctioned_funding_pct > 0) out.push(`Sanctioned funding present (${r.sanctioned_funding_pct}% of funds) — halt and escalate for compliance review.`);
  if (r.mixer_funding_pct > 0) out.push(`${r.mixer_funding_pct}% of funds came from mixers/tumblers — document provenance before treating the balance as clean.`);
  if (r.flagged_funding_pct > 0) out.push(`${r.flagged_funding_pct}% of funds from flagged sources — review those inflows.`);
  if (r.unknown_source_pct >= 25) out.push(`${r.unknown_source_pct}% of funds have unknown provenance — attribute these sources to tighten the assessment.`);
  if (r.kyc_coverage_pct < 50) out.push(`Only ${r.kyc_coverage_pct}% of funds come from KYC'd sources — provenance is weakly attested.`);
  if (out.length === 1) out.push('Provenance looks clean across the supplied sources; continue periodic review.');
  return out;
}

const CHAIN_TO = [
  { api: 'wallet-address-risk', reason: 'Score an individual flagged or unknown funding source address against AML/sanctions sources.', url: 'https://orbis-apis.onrender.com/wallet-address-risk' },
  { api: 'counterparty-exposure-graph', reason: 'Combine funding-side provenance with the outbound counterparty exposure for a full picture.', url: 'https://orbis-apis.onrender.com/counterparty-exposure-graph' },
  { api: 'wallet-risk-bundle', reason: 'Fold funding-source risk into a single wallet trust verdict.', url: 'https://orbis-apis.onrender.com/wallet-risk-bundle' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Wallet Funding Source Analyzer API', version: '1.0.0',
    description: 'Deterministic wallet funding-source analyzer. From a caller-supplied set of inflow sources (USD amounts, optional category/KYC level/flags) it scores provenance: value-weighted funding risk, KYC coverage, unknown/mixer/flagged/sanctioned funding shares, source concentration (HHI), a category breakdown, and an allow/review/block verdict. Analyzes the sources you supply — no chain fetch. No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/wallet-funding-source-analyzer/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/analyze', summary: 'Score the provenance of supplied funding sources', price_usdc: 0.025 },
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
    confidence_score: 0.85, confidence_per_section: { provenance: 1, interpretation: 0.7 },
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
      why_result_generated: `Scored provenance over ${v.source_count} funding sources; value-weighted funding risk is ${v.funding_risk_score}/100 (${v.funding_risk_band}) → verdict ${v.verdict}${v.hard_block ? ' via hard-block override' : ''}.`,
      key_factors: [
        `Funded total $${v.funded_total_usd} across ${v.source_count} sources.`,
        `KYC coverage ${v.kyc_coverage_pct}% (full ${v.full_kyc_pct}%); unknown-provenance ${v.unknown_source_pct}%.`,
        `Mixer funding ${v.mixer_funding_pct}%, flagged ${v.flagged_funding_pct}%, sanctioned ${v.sanctioned_funding_pct}%.`,
        `Source concentration HHI ${v.concentration.hhi} (${v.concentration.band}); top source ${v.concentration.top_source_share_pct}%.`,
      ],
      invalidators: [
        'Analyzes only the funding sources you supplied — funds from omitted sources are unaccounted for, not assumed clean.',
        'Category-default scoring is opinionated; supplying real risk scores or KYC levels changes the weighting.',
        'A source flagged after your snapshot would not be reflected; re-analyze against fresh labels.',
      ],
    },
    confidence_score: 0.85, confidence_per_section: { provenance: 1, interpretation: 0.7 },
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
