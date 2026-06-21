import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { num, str, round, clamp, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic counterparty exposure graph. Takes a CALLER-SUPPLIED set of
// counterparties a subject wallet has transacted with (inflow/outflow USD, tx
// counts, optional risk/category/flag), and builds the exposure side of the graph:
// volume-weighted risk, concentration (HHI), flagged/sanctioned/mixer exposure
// shares, a category breakdown, and a ranked top-counterparty list. It does NOT
// fetch the chain — it analyzes the edges you pass in — so it is advisory, not a
// verdict on a live wallet. Higher score = higher risk. No LLM, nothing stored.

const router = Router();

const DISCLAIMER =
  'Volume-weighted exposure analysis over the counterparties you supplied — not on-chain analysis, not financial/compliance advice. Inputs are trusted as given; missing or mislabeled counterparties change the result. A wallet you did not supply is excluded, not assumed safe.';

const truthy = (v: unknown) => v === true || v === 'true' || v === 'yes' || v === 1;

// Default counterparty risk (0-100) by category when no explicit risk_score is given.
const CATEGORY_RISK: Record<string, number> = {
  mixer: 90, tumbler: 90, scam: 95, phishing: 95, gambling: 60, bridge: 40,
  defi: 30, dex: 30, lending: 30, contract: 25, eoa: 20, wallet: 20,
  cex: 15, exchange: 15, unknown: 35,
};
const MIXER_CATEGORIES = new Set(['mixer', 'tumbler']);

export type Band = 'low' | 'medium' | 'high' | 'severe';
export type Verdict = 'allow' | 'review' | 'block';
type RiskSource = 'sanctioned' | 'flagged' | 'supplied' | 'category' | 'default';

export interface CounterpartyRow {
  label: string;
  address: string | null;
  category: string;
  gross_volume_usd: number;
  inflow_usd: number;
  outflow_usd: number;
  net_flow_usd: number;
  tx_count: number;
  exposure_pct: number; // share of total gross volume
  risk_score: number; // 0-100
  risk_source: RiskSource;
  flagged: boolean;
  sanctioned: boolean;
  weighted_risk_contribution: number; // exposure_fraction * risk_score
  reasons: string[];
}

export interface CategoryStat { category: string; gross_volume_usd: number; share_pct: number; counterparty_count: number; }

export interface GraphResult {
  subject: string | null;
  total_counterparties: number;
  total_gross_volume_usd: number;
  total_inflow_usd: number;
  total_outflow_usd: number;
  net_flow_usd: number;
  concentration: { hhi: number; band: 'low' | 'moderate' | 'high'; top_counterparty_share_pct: number; top3_share_pct: number };
  flagged_exposure_pct: number;
  sanctioned_exposure_pct: number;
  mixer_exposure_pct: number;
  category_breakdown: CategoryStat[];
  risk_weighted_exposure_score: number; // 0-100 volume-weighted counterparty risk
  exposure_band: Band;
  verdict: Verdict;
  hard_block: boolean;
  counterparties: CounterpartyRow[];
  top_counterparties: CounterpartyRow[];
  flagged_counterparties: CounterpartyRow[];
}

function scoreCounterparty(c: any): Omit<CounterpartyRow, 'exposure_pct' | 'weighted_risk_contribution'> {
  const label = str(c.label) ?? str(c.name) ?? str(c.address) ?? 'unknown-counterparty';
  const address = str(c.address) ?? null;
  const category = (str(c.category) ?? 'unknown').toLowerCase();
  const inflow = Math.max(0, num(c.inflow_usd) ?? 0);
  const outflow = Math.max(0, num(c.outflow_usd) ?? 0);
  const gross = round(inflow + outflow, 2);
  const net = round(inflow - outflow, 2);
  const tx_count = Math.max(0, Math.trunc(num(c.tx_count) ?? 0));
  const flagged = truthy(c.flagged) || truthy(c.blocklisted);
  const sanctioned = truthy(c.sanctioned);

  const supplied = num(c.risk_score);
  const categoryKnown = category in CATEGORY_RISK && category !== 'unknown';
  let risk: number;
  let risk_source: RiskSource;
  if (supplied !== undefined) { risk = clamp(round(supplied, 0), 0, 100); risk_source = 'supplied'; }
  else if (categoryKnown) { risk = CATEGORY_RISK[category]; risk_source = 'category'; }
  else { risk = CATEGORY_RISK.unknown; risk_source = 'default'; }
  // Flags/sanctions override upward and reset the attribution.
  if (flagged && risk < 90) { risk = 90; }
  if (flagged) risk_source = 'flagged';
  if (sanctioned) { risk = 100; risk_source = 'sanctioned'; }

  const reasons: string[] = [];
  if (sanctioned) reasons.push('Sanctioned counterparty — any exposure is a hard compliance block.');
  if (flagged && !sanctioned) reasons.push('Flagged/blocklisted counterparty — treat exposure as high risk.');
  if (MIXER_CATEGORIES.has(category)) reasons.push('Mixer/tumbler counterparty — obscures fund provenance.');
  if (risk_source === 'category' && risk >= 50 && !flagged && !sanctioned) reasons.push(`High-risk category "${category}" (no explicit score supplied).`);
  if (risk_source === 'default') reasons.push('No risk score or known category supplied — scored at the neutral-unknown default.');
  if (reasons.length === 0) reasons.push('Lower-risk counterparty by the supplied evidence.');

  return { label, address, category, gross_volume_usd: gross, inflow_usd: round(inflow, 2), outflow_usd: round(outflow, 2), net_flow_usd: net, tx_count, risk_score: risk, risk_source, flagged, sanctioned, reasons };
}

export function analyze(body: any): { error: string } | { result: GraphResult } {
  if (body === undefined || body === null || typeof body !== 'object' || Array.isArray(body))
    return { error: 'Provide a JSON object with a "counterparties" array.' };
  const list = body.counterparties;
  if (!Array.isArray(list) || list.length === 0)
    return { error: 'Provide a non-empty "counterparties" array; each item is a counterparty (label/address, inflow_usd, outflow_usd, tx_count, optional risk_score/category/flagged/sanctioned).' };
  if (list.length > 1000) return { error: 'Too many counterparties — limit 1000 per call.' };
  if (!list.every((c) => c && typeof c === 'object' && !Array.isArray(c)))
    return { error: 'Every counterparties[] item must be a JSON object.' };

  const scored = list.map(scoreCounterparty);
  const total_gross_volume_usd = round(scored.reduce((s, c) => s + c.gross_volume_usd, 0), 2);
  const total_inflow_usd = round(scored.reduce((s, c) => s + c.inflow_usd, 0), 2);
  const total_outflow_usd = round(scored.reduce((s, c) => s + c.outflow_usd, 0), 2);
  const n = scored.length;

  // Exposure weight: volume share when there is volume, otherwise equal weight so a
  // zero-volume snapshot still yields a meaningful average counterparty risk.
  const weightOf = (gross: number) => (total_gross_volume_usd > 0 ? gross / total_gross_volume_usd : 1 / n);

  const counterparties: CounterpartyRow[] = scored.map((c) => {
    const frac = weightOf(c.gross_volume_usd);
    return {
      ...c,
      exposure_pct: round(frac * 100, 2),
      weighted_risk_contribution: round(frac * c.risk_score, 2),
    };
  }).sort((a, b) => b.gross_volume_usd - a.gross_volume_usd || b.risk_score - a.risk_score);

  const risk_weighted_exposure_score = clamp(round(counterparties.reduce((s, c) => s + c.weighted_risk_contribution, 0), 0), 0, 100);
  const exposure_band: Band = risk_weighted_exposure_score >= 75 ? 'severe' : risk_weighted_exposure_score >= 50 ? 'high' : risk_weighted_exposure_score >= 25 ? 'medium' : 'low';

  const sharePctOf = (gross: number) => round(weightOf(gross) * 100, 2);
  const flagged_exposure_pct = round(counterparties.filter((c) => c.flagged).reduce((s, c) => s + weightOf(c.gross_volume_usd), 0) * 100, 2);
  const sanctioned_exposure_pct = round(counterparties.filter((c) => c.sanctioned).reduce((s, c) => s + weightOf(c.gross_volume_usd), 0) * 100, 2);
  const mixer_exposure_pct = round(counterparties.filter((c) => MIXER_CATEGORIES.has(c.category)).reduce((s, c) => s + weightOf(c.gross_volume_usd), 0) * 100, 2);

  // Herfindahl-Hirschman concentration over volume shares (0-1).
  const hhi = round(counterparties.reduce((s, c) => { const f = weightOf(c.gross_volume_usd); return s + f * f; }, 0), 4);
  const conc_band: 'low' | 'moderate' | 'high' = hhi >= 0.25 ? 'high' : hhi >= 0.15 ? 'moderate' : 'low';
  const top_counterparty_share_pct = counterparties.length > 0 ? sharePctOf(counterparties[0].gross_volume_usd) : 0;
  const top3_share_pct = round(counterparties.slice(0, 3).reduce((s, c) => s + weightOf(c.gross_volume_usd), 0) * 100, 2);

  // Category rollup.
  const catMap = new Map<string, { gross: number; count: number }>();
  for (const c of counterparties) {
    const e = catMap.get(c.category) ?? { gross: 0, count: 0 };
    e.gross += c.gross_volume_usd; e.count += 1; catMap.set(c.category, e);
  }
  const category_breakdown: CategoryStat[] = [...catMap.entries()]
    .map(([category, e]) => ({ category, gross_volume_usd: round(e.gross, 2), share_pct: sharePctOf(e.gross), counterparty_count: e.count }))
    .sort((a, b) => b.gross_volume_usd - a.gross_volume_usd);

  const hard_block = counterparties.some((c) => c.sanctioned) || mixer_exposure_pct >= 25;
  let verdict: Verdict;
  if (hard_block || risk_weighted_exposure_score >= 70 || flagged_exposure_pct >= 25) verdict = 'block';
  else if (risk_weighted_exposure_score >= 40 || flagged_exposure_pct > 0 || mixer_exposure_pct > 0) verdict = 'review';
  else verdict = 'allow';

  return {
    result: {
      subject: str(body.subject) ?? str(body.address) ?? null,
      total_counterparties: n,
      total_gross_volume_usd, total_inflow_usd, total_outflow_usd, net_flow_usd: round(total_inflow_usd - total_outflow_usd, 2),
      concentration: { hhi, band: conc_band, top_counterparty_share_pct, top3_share_pct },
      flagged_exposure_pct, sanctioned_exposure_pct, mixer_exposure_pct,
      category_breakdown,
      risk_weighted_exposure_score, exposure_band, verdict, hard_block,
      counterparties,
      top_counterparties: counterparties.slice(0, 5),
      flagged_counterparties: counterparties.filter((c) => c.flagged || c.sanctioned),
    },
  };
}

function actions(r: GraphResult): string[] {
  const out = [`Analyzed ${r.total_counterparties} counterparties over $${r.total_gross_volume_usd} gross volume: risk-weighted exposure ${r.risk_weighted_exposure_score}/100 (${r.exposure_band}) → verdict ${r.verdict}.`];
  if (r.sanctioned_exposure_pct > 0) out.push(`Sanctioned exposure present (${r.sanctioned_exposure_pct}% of volume) — halt and escalate for compliance review.`);
  if (r.mixer_exposure_pct > 0) out.push(`${r.mixer_exposure_pct}% of volume touches mixer/tumbler counterparties — document provenance before transacting.`);
  if (r.flagged_exposure_pct > 0) out.push(`${r.flagged_exposure_pct}% of volume is with flagged counterparties — review the ${r.flagged_counterparties.length} flagged edge(s).`);
  if (r.concentration.band !== 'low') out.push(`${r.concentration.band} concentration (HHI ${r.concentration.hhi}); top counterparty is ${r.concentration.top_counterparty_share_pct}% of volume — single-counterparty dependency risk.`);
  if (out.length === 1) out.push('No flagged, sanctioned, or mixer exposure in the supplied edges; continue periodic review.');
  return out;
}

const CHAIN_TO = [
  { api: 'wallet-risk-bundle', reason: 'Fold this counterparty exposure into a single wallet trust verdict alongside address risk, approvals, and reputation.', url: 'https://orbis-apis.onrender.com/wallet-risk-bundle' },
  { api: 'wallet-address-risk', reason: 'Score an individual flagged counterparty address against on-chain/label sources.', url: 'https://orbis-apis.onrender.com/wallet-address-risk' },
  { api: 'token-approval-risk-scanner', reason: 'Check whether risky counterparties also hold token approvals that could drain the wallet.', url: 'https://orbis-apis.onrender.com/token-approval-risk-scanner' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Counterparty Exposure Graph API', version: '1.0.0',
    description: 'Deterministic counterparty exposure graph. From a caller-supplied set of counterparties (inflow/outflow USD, tx counts, optional risk/category/flags) it computes volume-weighted counterparty risk, concentration (HHI), flagged/sanctioned/mixer exposure shares, a category breakdown, and a ranked top-counterparty list with an allow/review/block verdict. Analyzes the edges you supply — no chain fetch. No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/counterparty-exposure-graph/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/analyze', summary: 'Build the exposure graph and score counterparty risk', price_usdc: 0.025 },
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
    confidence_score: 0.85, confidence_per_section: { graph: 1, interpretation: 0.7 },
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
      why_result_generated: `Built an exposure graph over ${v.total_counterparties} counterparties; volume-weighted counterparty risk is ${v.risk_weighted_exposure_score}/100 (${v.exposure_band}) → verdict ${v.verdict}${v.hard_block ? ' via hard-block override' : ''}.`,
      key_factors: [
        `Total gross volume $${v.total_gross_volume_usd} across ${v.total_counterparties} counterparties.`,
        `Concentration HHI ${v.concentration.hhi} (${v.concentration.band}); top counterparty ${v.concentration.top_counterparty_share_pct}% of volume.`,
        `Flagged exposure ${v.flagged_exposure_pct}%, sanctioned ${v.sanctioned_exposure_pct}%, mixer ${v.mixer_exposure_pct}%.`,
        `${v.flagged_counterparties.length} flagged/sanctioned counterparty(ies).`,
      ],
      invalidators: [
        'Analyzes only the counterparties you supplied — it does not query the chain to find omitted edges.',
        'Counterparties scored by category default (no explicit risk_score) are opinionated; supplying real scores changes the weighting.',
        'A counterparty flagged after your snapshot would not be reflected; re-analyze against fresh labels.',
      ],
    },
    confidence_score: 0.85, confidence_per_section: { graph: 1, interpretation: 0.7 },
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
