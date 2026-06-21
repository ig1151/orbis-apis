import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { round, clamp, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';
import { assess as fuse } from '../../wallet-risk-bundle-api/routes/intelligence';
import { detectChain, groundAddress, SUPPORTED_CHAINS, SanctionsResult, OnchainResult } from '../grounding';

// Orchestrated wallet-verdict aggregator. Give it ONE address and it does the work itself,
// fanning out SERVER-SIDE in parallel:
//   • REAL-DATA GROUNDING (authoritative, non-LLM): an OFAC SDN sanctions match + live
//     on-chain heuristics (balance / tx count / contract / age) — across EVM chains
//     (incl. BNB Chain), Solana, and Bitcoin.
//   • Upstream signal APIs (EVM only): Wallet Address Risk (AML), Wallet Reputation, Wallet Balance.
// It fuses everything into one composite risk score, trust tier, and allow/review/block
// verdict. The sanctions verdict is grounded in the real OFAC list — not an LLM guess.
// A source that is slow/down is listed under unavailable_sources and EXCLUDED from the
// fusion (never assumed safe). Always HTTP 200 with success:true so agent loops never hang.

const router = Router();

const DISCLAIMER =
  'Composite verdict for the supplied address. `is_sanctioned` is grounded in the real OFAC SDN crypto-address list (authoritative); on-chain fields are fetched live (Etherscan V2 / Solana RPC / Blockstream); the AML risk/reputation components (EVM) are AI-assisted/single-provider and advisory. A source that is slow or unavailable is listed under unavailable_sources and excluded from the fusion — NOT assumed safe. Not financial or compliance advice.';

const INTERNAL_BASE = process.env.INTERNAL_BASE || `http://127.0.0.1:${process.env.PORT || '3939'}`;
const PER_CALL_TIMEOUT_MS = Number(process.env.WALLET_VERDICT_TIMEOUT_MS || 13000);

interface SourceFetch {
  source: string;
  status: 'ok' | 'failed' | 'timeout';
  latency_ms: number;
  detail: string;
}

async function callInternal(path: string, body: unknown, timeoutMs: number): Promise<{ ok: boolean; json?: any; status: 'ok' | 'failed' | 'timeout'; ms: number; detail: string }> {
  const t0 = Date.now();
  try {
    const r = await fetch(`${INTERNAL_BASE}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const ms = Date.now() - t0;
    if (!r.ok) return { ok: false, status: 'failed', ms, detail: `upstream HTTP ${r.status}` };
    const json = await r.json();
    return { ok: true, json, status: 'ok', ms, detail: 'ok' };
  } catch (e: any) {
    const ms = Date.now() - t0;
    const timedOut = e?.name === 'TimeoutError' || /timeout|abort/i.test(String(e?.message));
    return { ok: false, status: timedOut ? 'timeout' : 'failed', ms, detail: timedOut ? `timed out after ${ms}ms` : `error: ${String(e?.message ?? e).slice(0, 120)}` };
  }
}

export interface VerdictResult {
  address: string;
  chain: string;
  chain_family: string;
  composite_risk_score: number | null;
  trust_tier: string;
  verdict: 'allow' | 'review' | 'block';
  hard_block: boolean;
  is_sanctioned: boolean;
  sources_used: string[];
  unavailable_sources: { source: string; status: string; detail: string }[];
  source_fetches: SourceFetch[];
  fetched: {
    sanctions: SanctionsResult | null;
    onchain: OnchainResult | null;
    address_risk: { risk_score: number; risk_level: string | null; is_sanctioned: boolean; is_mixer: boolean; illicit_exposure_pct: number | null } | null;
    reputation: { score: number; rating: string | null } | null;
    balance: { native_balance_usd: number | null; native_symbol: string | null; last_activity: string | null } | null;
  };
  contributions: any[];
  data_unavailable: boolean;
}

const truthy = (v: unknown) => v === true || v === 'true' || v === 'yes' || v === 1;
const numOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export async function buildVerdict(body: any): Promise<{ error: string } | { result: VerdictResult }> {
  if (body === undefined || body === null || typeof body !== 'object' || Array.isArray(body))
    return { error: 'Provide a JSON object with an "address".' };
  const address = typeof body.address === 'string' ? body.address.trim() : '';
  if (!address) return { error: 'Provide a wallet "address" (string).' };
  if (body.chain !== undefined && typeof body.chain !== 'string')
    return { error: '"chain" must be a string when provided.' };

  // Resolve chain/family from the address shape (or an explicit chain hint).
  const det = detectChain(address, typeof body.chain === 'string' ? body.chain : undefined);
  if ('error' in det) return { error: det.error };
  const { family, chain } = det;

  // Fan out in parallel; each call is independently timeout-bounded so total ≈ slowest call.
  // Real-data grounding (OFAC + on-chain) runs for EVERY chain; the EVM-only upstream signal
  // APIs are skipped for Solana/Bitcoin (they would error) — grounding carries those verdicts.
  const groundingP = groundAddress(address, det, Math.min(PER_CALL_TIMEOUT_MS, 9000));
  const isEvm = family === 'evm';
  const [grounding, riskR, repR, balR] = await Promise.all([
    groundingP,
    isEvm ? callInternal('/wallet-address-risk/check', { input: address }, PER_CALL_TIMEOUT_MS) : Promise.resolve(null),
    isEvm ? callInternal('/wallet-reputation/score', { address }, Math.min(PER_CALL_TIMEOUT_MS, 9000)) : Promise.resolve(null),
    isEvm ? callInternal('/wallet-balance/lookup', { address, chain }, Math.min(PER_CALL_TIMEOUT_MS, 9000)) : Promise.resolve(null),
  ]);

  const source_fetches: SourceFetch[] = [];
  const fuseBody: any = { address };
  const { sanctions, onchain } = grounding;
  const ofacListed = sanctions.checked && sanctions.listed;

  // --- upstream address-risk (EVM only, AI-assisted/advisory) ---
  let fetchedRisk: VerdictResult['fetched']['address_risk'] = null;
  if (riskR) {
    const d = riskR.ok ? (riskR.json?.data ?? riskR.json) : null;
    const score = d ? numOrNull(d.risk_score) : null;
    if (riskR.ok && score !== null) {
      const is_mixer = truthy(d.is_mixer);
      const illicit = numOrNull(d.illicit_exposure_pct);
      fetchedRisk = { risk_score: clamp(round(score, 0), 0, 100), risk_level: d.risk_level ?? null, is_sanctioned: truthy(d.is_sanctioned), is_mixer, illicit_exposure_pct: illicit };
      // Map illicit/mixer exposure into the bundle's exposure block.
      if (is_mixer || illicit !== null) {
        fuseBody.exposure = { mixer_exposure_pct: is_mixer ? Math.max(illicit ?? 0, 25) : 0, flagged_counterparty_pct: illicit ?? 0 };
      }
      source_fetches.push({ source: 'address_risk', status: 'ok', latency_ms: riskR.ms, detail: `AML risk ${fetchedRisk.risk_score}/100${fetchedRisk.is_sanctioned ? ', flagged sanctioned' : ''}` });
    } else {
      source_fetches.push({ source: 'address_risk', status: riskR.status === 'ok' ? 'failed' : riskR.status, latency_ms: riskR.ms, detail: riskR.status === 'ok' ? 'no risk_score in response' : riskR.detail });
    }
  }

  // --- address_risk fusion input: REAL data is authoritative ---
  // OFAC listing forces sanctioned + max risk; otherwise blend the live on-chain heuristic
  // (weighted higher, it's real) with the advisory AML score. sanctioned is OFAC-derived
  // whenever the list was reachable; only if OFAC is unavailable do we fall back to the AML flag.
  {
    const onScore = onchain.checked ? onchain.risk_score : null;
    const llmScore = fetchedRisk ? fetchedRisk.risk_score : null;
    const sanctioned = ofacListed ? true : (sanctions.checked ? false : !!fetchedRisk?.is_sanctioned);
    let blended: number | null;
    if (ofacListed) blended = 100;
    else if (onScore !== null && llmScore !== null) blended = clamp(round(0.6 * onScore + 0.4 * llmScore, 0), 0, 100);
    else blended = onScore ?? llmScore;
    if (blended !== null || sanctioned) fuseBody.address_risk = { score: blended ?? (sanctioned ? 100 : 0), sanctioned };
  }

  // --- reputation (EVM only; score 0-100, higher = better) ---
  let fetchedRep: VerdictResult['fetched']['reputation'] = null;
  if (repR) {
    const d = repR.ok ? (repR.json?.data ?? repR.json) : null;
    const score = d ? numOrNull(d.score) : null;
    if (repR.ok && score !== null) {
      fetchedRep = { score: clamp(round(score, 0), 0, 100), rating: d.rating ?? null };
      fuseBody.reputation = { score: fetchedRep.score };
      source_fetches.push({ source: 'reputation', status: 'ok', latency_ms: repR.ms, detail: `reputation ${fetchedRep.score}/100 (${fetchedRep.rating ?? 'n/a'})` });
    } else {
      source_fetches.push({ source: 'reputation', status: repR.status === 'ok' ? 'failed' : repR.status, latency_ms: repR.ms, detail: repR.status === 'ok' ? 'no score in response' : repR.detail });
    }
  }

  // --- balance (EVM upstream, context only; not scored by the fusion) ---
  let fetchedBal: VerdictResult['fetched']['balance'] = null;
  if (balR) {
    const d = balR.ok ? balR.json : null;
    if (balR.ok && d && d.success !== false) {
      const usd = numOrNull(d.native_balance_usd);
      fetchedBal = { native_balance_usd: usd, native_symbol: d.native_symbol ?? null, last_activity: d.last_activity ?? null };
      fuseBody.balance = { net_worth_usd: usd ?? undefined };
      source_fetches.push({ source: 'balance', status: 'ok', latency_ms: balR.ms, detail: usd !== null ? `$${usd} ${fetchedBal.native_symbol ?? ''}`.trim() : 'balance fetched (USD n/a)' });
    } else {
      source_fetches.push({ source: 'balance', status: balR.status === 'ok' ? 'failed' : balR.status, latency_ms: balR.ms, detail: balR.status === 'ok' ? 'upstream returned failure' : balR.detail });
    }
  }

  // --- grounding fetches (OFAC + on-chain) — always present, all chains ---
  source_fetches.push(...grounding.fetches.map((f) => ({ source: f.source, status: f.status, latency_ms: f.latency_ms, detail: f.detail })));

  const sources_used = source_fetches.filter((s) => s.status === 'ok').map((s) => s.source);
  const unavailable_sources = source_fetches.filter((s) => s.status !== 'ok').map((s) => ({ source: s.source, status: s.status, detail: s.detail }));
  const fetched = { sanctions, onchain, address_risk: fetchedRisk, reputation: fetchedRep, balance: fetchedBal };

  // Fuse whatever scored signals we obtained.
  const fused = fuse(fuseBody);
  if ('error' in fused) {
    // No scored signal at all — return a graceful degraded verdict, never a hard failure.
    return {
      result: {
        address, chain, chain_family: family,
        composite_risk_score: null, trust_tier: 'unknown', verdict: 'review', hard_block: false, is_sanctioned: ofacListed,
        sources_used, unavailable_sources, source_fetches, fetched, contributions: [], data_unavailable: true,
      },
    };
  }

  const r = fused.result;
  return {
    result: {
      address, chain, chain_family: family,
      composite_risk_score: r.composite_risk_score, trust_tier: r.trust_tier, verdict: r.verdict, hard_block: r.hard_block,
      is_sanctioned: ofacListed,
      sources_used, unavailable_sources, source_fetches, fetched,
      contributions: r.source_contributions, data_unavailable: false,
    },
  };
}

function confidenceFor(r: VerdictResult): number {
  const ok = r.source_fetches.filter((s) => s.status === 'ok').length;
  if (ok === 0) return 0.2;
  return clamp(round(0.55 + ok * 0.12, 2), 0, 0.95);
}

function actions(r: VerdictResult): string[] {
  const out: string[] = [];
  if (r.is_sanctioned) out.push('OFAC SANCTIONS MATCH (real list) — do NOT transact; this is a hard block, escalate to compliance immediately.');
  if (r.data_unavailable) {
    out.push('No scored risk signal could be fetched right now (sources slow/unavailable) — verdict defaults to review; retry shortly.');
    return out;
  }
  out.push(`Fused ${r.sources_used.length} live signal(s) for ${r.address} on ${r.chain}: composite ${r.composite_risk_score}/100 (${r.trust_tier}) → verdict ${r.verdict}.`);
  if (r.hard_block && !r.is_sanctioned) out.push('Hard-block signal (heavy mixer/flagged exposure) — halt the action and escalate for manual review.');
  else if (r.verdict === 'block') out.push('Block: do not proceed autonomously; require manual approval.');
  else if (r.verdict === 'review') out.push('Review: gate the action behind a stricter threshold or human approval.');
  else out.push('Allow: no blocking signals in the fetched data; proceed with normal monitoring.');
  if (r.unavailable_sources.length > 0) out.push(`${r.unavailable_sources.length} source(s) were unavailable (${r.unavailable_sources.map((s) => s.source).join(', ')}); the verdict is fused over the rest — re-run for a fuller picture.`);
  return out;
}

const CHAIN_TO = [
  { api: 'wallet-address-risk', reason: 'Pull the full AML/sanctions detail behind the address-risk component of this verdict.', url: 'https://orbis-apis.onrender.com/wallet-address-risk' },
  { api: 'token-approval-risk-scanner', reason: 'Add token-approval drain exposure to the verdict (supply the wallet\'s approvals).', url: 'https://orbis-apis.onrender.com/token-approval-risk-scanner' },
  { api: 'counterparty-exposure-graph', reason: 'Deepen the verdict with a volume-weighted counterparty exposure graph.', url: 'https://orbis-apis.onrender.com/counterparty-exposure-graph' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Wallet Verdict API', version: '1.1.0',
    description: 'Orchestrated one-call wallet risk verdict grounded in REAL data. Give it an address (EVM incl. BNB Chain, Solana, or Bitcoin); it checks the address against the live OFAC SDN sanctions list and fetches on-chain heuristics (balance / tx count / contract / age), plus AML-risk + reputation + balance for EVM, all in parallel, and fuses them into one composite risk score, trust tier, and allow/review/block verdict. `is_sanctioned` is a real OFAC fact, not an LLM guess. Returns partial results if a source is slow/down, and is always HTTP 200.',
    supported_chains: SUPPORTED_CHAINS,
    openapi_url: 'https://orbis-apis.onrender.com/wallet-verdict/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/verdict', summary: 'Fetch live wallet signals and fuse into one verdict', price_usdc: 0.05 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL verdict + reasoning + prioritized actions', price_usdc: 0.09 },
    ],
    pricing: [
      { path: '/verdict', price_usdc: 0.05, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.09, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/verdict', async (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = await buildVerdict(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, {
    ...r.result, risk_disclaimer: DISCLAIMER,
    confidence_score: confidenceFor(r.result), confidence_per_section: { fetch: r.result.data_unavailable ? 0 : 1, sanctions: r.result.fetched.sanctions?.checked ? 1 : 0, fusion: 1, interpretation: 0.7 },
    recommended_actions_priority_order: actions(r.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', async (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = await buildVerdict(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v, risk_disclaimer: DISCLAIMER,
    reasoning: {
      why_result_generated: v.data_unavailable
        ? `Could not fetch any scored risk signal for ${v.address} on ${v.chain} (sources unavailable); verdict defaults to review.`
        : `On ${v.chain} (${v.chain_family}): ${v.is_sanctioned ? 'OFAC SANCTIONS MATCH forced a hard block. ' : ''}Fetched ${v.sources_used.length} live signal(s) for ${v.address} and fused them into composite ${v.composite_risk_score}/100 (${v.trust_tier}) → verdict ${v.verdict}${v.hard_block ? ' via hard-block override' : ''}.`,
      key_factors: [
        `Sources used: ${v.sources_used.length ? v.sources_used.join(', ') : 'none'}; unavailable: ${v.unavailable_sources.length ? v.unavailable_sources.map((s) => s.source).join(', ') : 'none'}.`,
        v.fetched.sanctions ? `OFAC sanctions: ${v.fetched.sanctions.checked ? (v.fetched.sanctions.listed ? 'MATCH — address is on the SDN list' : 'no match') : 'list unavailable (not assumed clear)'} [${v.fetched.sanctions.source}].` : 'OFAC sanctions: not checked.',
        v.fetched.onchain && v.fetched.onchain.checked ? `On-chain (${v.fetched.onchain.provider}): balance ${v.fetched.onchain.native_balance ?? 'n/a'} ${v.fetched.onchain.native_symbol ?? ''}, ${v.fetched.onchain.tx_count ?? '?'} tx, age ${v.fetched.onchain.age_days !== null ? v.fetched.onchain.age_days + 'd' : 'n/a'}${v.fetched.onchain.flags.length ? ', flags: ' + v.fetched.onchain.flags.join('/') : ''}.`.trim() : 'On-chain heuristics: unavailable.',
        v.fetched.address_risk ? `AML risk ${v.fetched.address_risk.risk_score}/100 (${v.fetched.address_risk.risk_level ?? 'n/a'}, advisory).` : 'AML risk (EVM): unavailable or N/A for this chain.',
        v.fetched.reputation ? `Reputation ${v.fetched.reputation.score}/100 (${v.fetched.reputation.rating ?? 'n/a'}).` : 'Reputation (EVM): unavailable or N/A for this chain.',
      ],
      invalidators: [
        'Fuses only the signals it could fetch at call time; a slow/unavailable source is excluded, not assumed safe — re-run for a fuller verdict.',
        'OFAC match is exact-address against the SDN list (refreshed daily) — it will NOT catch indirect/downstream exposure or newly-added addresses before the next refresh.',
        'AML-risk is AI-assisted and reputation/balance derive from a single provider; on-chain heuristics are conservative — treat the composite as advisory, not a definitive compliance ruling.',
        'The verdict reflects state at fetch time and can change as the wallet transacts.',
      ],
    },
    confidence_score: confidenceFor(v), confidence_per_section: { fetch: v.data_unavailable ? 0 : 1, sanctions: v.fetched.sanctions?.checked ? 1 : 0, fusion: 1, interpretation: 0.7 },
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
