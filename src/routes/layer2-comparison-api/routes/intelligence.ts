import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { str, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';
import { L2S, L2 } from './data';

// Deterministic Layer-2 comparison over a curated static table. Categorical facts
// (type, settlement layer, VM, data availability) are exact; numeric metrics
// (approx fee, throughput, finality) are curated indicative estimates — hence
// confidence on the metrics is < 1. No fetch, no LLM.

const router = Router();

export function findL2(q: string): L2 | undefined {
  const s = q.trim().toLowerCase();
  return L2S.find((c) => c.slug === s || c.name.toLowerCase() === s) ||
    L2S.find((c) => c.name.toLowerCase().includes(s) && s.length >= 3);
}

const CONF = { confidence_score: 0.85, confidence_per_section: { classification: 1, metrics: 0.7 } };

export interface CompareResult {
  chains: L2[];
  cheapest: string; fastest_finality_type: string; highest_throughput: string;
  all_settle_to: string[]; types_present: string[];
}

function summarize(chains: L2[]): CompareResult {
  const cheapest = chains.reduce((a, b) => (b.approx_tx_fee_usd < a.approx_tx_fee_usd ? b : a));
  const fastest = chains.reduce((a, b) => (b.throughput_tps > a.throughput_tps ? b : a));
  // zk rollups generally reach L1 finality far sooner than the 7-day optimistic window.
  const finalityRank = (t: L2['type']) => (t === 'sidechain' ? 0 : t === 'zk_rollup' || t === 'validium' ? 1 : 2);
  const fastestFinality = chains.reduce((a, b) => (finalityRank(b.type) < finalityRank(a.type) ? b : a));
  return {
    chains,
    cheapest: cheapest.name,
    fastest_finality_type: fastestFinality.name,
    highest_throughput: fastest.name,
    all_settle_to: [...new Set(chains.map((c) => c.settlement_layer))],
    types_present: [...new Set(chains.map((c) => c.type))],
  };
}

const CHAIN_TO = [
  { api: 'gas-fee-api', reason: 'Get live gas/fee estimates for the chain you selected before transacting.' },
  { api: 'web3-security-checklist', reason: 'Assess audit-readiness of a contract you plan to deploy on the chosen L2.' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Layer 2 Blockchain Comparison API', version: '1.0.0',
    description: `Deterministic Layer-2 comparison over a curated static table (${L2S.length} networks). Resolve one network or compare several across type, settlement layer, VM, data availability, indicative fee, throughput, and finality. Categorical facts are exact; numeric metrics are curated indicative estimates. No fetch, no LLM.`,
    openapi_url: 'https://orbis-apis.onrender.com/layer2-comparison/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/chain', summary: 'Resolve one L2 network record', price_usdc: 0.004 },
      { method: 'POST', path: '/compare', summary: 'Compare 2+ L2 networks side by side', price_usdc: 0.006 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL resolve/compare + reasoning', price_usdc: 0.008 },
    ],
    pricing: [
      { path: '/chain', price_usdc: 0.004, currency: 'USDC' },
      { path: '/compare', price_usdc: 0.006, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/chain', (req: Request, res: Response) => {
  const t0 = Date.now();
  const q = str(req.body?.chain ?? req.body?.query ?? req.body?.name);
  if (q === undefined) return fail(res, t0, 400, 'invalid_request', 'Provide "chain" (network name or slug).');
  const c = findL2(q);
  if (!c) return respond(res, t0, { found: false, query: q, chain: null, available: L2S.map((x) => x.slug), ...CONF, recommended_actions_priority_order: [`No L2 matched "${q}". Use one of the listed slugs.`], chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA });
  respond(res, t0, {
    found: true, query: q, chain: c, available: L2S.map((x) => x.slug),
    ...CONF,
    recommended_actions_priority_order: [`${c.name}: ${c.type.replace(/_/g, ' ')} on ${c.settlement_layer}, ${c.vm}, ~$${c.approx_tx_fee_usd} per transfer, ~${c.throughput_tps} TPS.`, `Finality: ${c.time_to_finality}.`],
    chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

function resolveList(body: any): { error: string } | { result: L2[] } {
  const raw = body?.chains ?? body?.query;
  if (!Array.isArray(raw) || raw.length < 2) return { error: 'Provide "chains" as an array of 2+ network names or slugs.' };
  if (raw.length > 12) return { error: 'Compare at most 12 networks per call.' };
  const out: L2[] = [];
  for (const item of raw) {
    const q = str(item);
    if (q === undefined) return { error: 'Each entry in "chains" must be a non-empty string.' };
    const c = findL2(q);
    if (!c) return { error: `No L2 matched "${q}". Use one of: ${L2S.map((x) => x.slug).join(', ')}.` };
    if (!out.some((x) => x.slug === c.slug)) out.push(c);
  }
  if (out.length < 2) return { error: 'Provide at least 2 distinct networks to compare.' };
  return { result: out };
}

router.post('/compare', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = resolveList(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const cmp = summarize(r.result);
  respond(res, t0, {
    ...cmp, ...CONF,
    recommended_actions_priority_order: [
      `Comparing ${cmp.chains.length} networks: cheapest ${cmp.cheapest}, highest throughput ${cmp.highest_throughput}.`,
      `Fastest L1 finality class: ${cmp.fastest_finality_type} (zk/validium settle far sooner than the ~7-day optimistic window).`,
    ],
    chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const hasList = Array.isArray(req.body?.chains) && req.body.chains.length >= 2;
  if (hasList) {
    const r = resolveList(req.body);
    if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
    const cmp = summarize(r.result);
    return respond(res, t0, {
      mode: 'compare', ...cmp,
      reasoning: {
        why_result_generated: `Compared ${cmp.chains.length} curated L2 records; cheapest by indicative fee is ${cmp.cheapest}, highest throughput is ${cmp.highest_throughput}.`,
        key_factors: [`Types present: ${cmp.types_present.join(', ')}.`, `All settle to: ${cmp.all_settle_to.join(', ')}.`, `Cheapest: ${cmp.cheapest}.`],
        invalidators: ['Fees and throughput are curated indicative estimates and change with congestion, blob prices, and upgrades.', 'Finality classes are structural; actual times vary by batch/proof cadence.', 'Sidechains (e.g. Polygon PoS) have their own security, not Ethereum-equivalent rollup security.'],
      },
      ...CONF,
      recommended_actions_priority_order: [`Cheapest ${cmp.cheapest}; highest throughput ${cmp.highest_throughput}; fastest-finality class ${cmp.fastest_finality_type}.`],
      chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
    });
  }
  const q = str(req.body?.chain ?? req.body?.query ?? req.body?.name);
  if (q === undefined) return fail(res, t0, 400, 'invalid_request', 'Provide "chain" (name/slug) or "chains" (array of 2+).');
  const c = findL2(q);
  respond(res, t0, {
    mode: 'chain', found: !!c, query: q, chain: c ?? null, available: L2S.map((x) => x.slug),
    reasoning: {
      why_result_generated: c ? `Resolved "${q}" to ${c.name} (${c.type}) from the curated table.` : `No curated L2 matched "${q}".`,
      key_factors: c ? [`Type: ${c.type}.`, `VM: ${c.vm}.`, `Indicative fee: $${c.approx_tx_fee_usd}.`] : ['Query did not match any slug or name.'],
      invalidators: ['Numeric metrics are curated indicative estimates, not live readings.', 'New L2s or upgrades may not yet be reflected in the static table.', 'For a transaction decision, confirm live fees/finality on-chain.'],
    },
    ...CONF,
    recommended_actions_priority_order: c ? [`${c.name}: ${c.type.replace(/_/g, ' ')}, ${c.vm}, ~$${c.approx_tx_fee_usd}/transfer.`] : [`No match for "${q}"; use a listed slug.`],
    chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
