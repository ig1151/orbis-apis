import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { round, clamp, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';
import { detectChain, groundToken, SUPPORTED_CHAINS, TokenGrounding } from '../grounding';

// Orchestrated token-profile aggregator. Give it ONE token (contract address + chain) and it
// does the work itself, fanning out SERVER-SIDE in parallel to REAL sources:
//   • CoinGecko   — identity / market / supply (no key)
//   • DexScreener — real DEX liquidity / pair age / DEX price (no key)
//   • Etherscan V2 (EVM) — contract verification / proxy / deployer / on-chain supply
//   • Solana RPC (Solana) — mint supply/decimals + mint/freeze authority (renounced?)
//   • Solscan (Solana, optional) — holder count
// It fuses everything into a deterministic trust composite (score / tier / verdict) built ONLY
// from real facts. Nothing is LLM-generated; holder concentration on EVM is reported unavailable
// rather than fabricated. A source that is slow/down is excluded from the fusion (not assumed
// good). Always HTTP 200 so agent loops never hang.

const router = Router();

const TIMEOUT_MS = Number(process.env.TOKEN_PROFILE_TIMEOUT_MS || 8000);

const DISCLAIMER =
  'Token profile fused from REAL sources for the supplied contract. Market/identity/supply are from CoinGecko, DEX liquidity/price from DexScreener, contract verification/supply from the chain explorer (Etherscan V2 / Solana RPC) — all fetched live and may lag the chain. The trust composite is a DETERMINISTIC score over those real facts (verification, liquidity, dilution, price deviation, age, mint authority); it is NOT a bytecode honeypot/rug scan and not investment advice. Holder concentration is shown only where a real indexed source is available (EVM holder lists require a paid explorer tier and are reported unavailable, NEVER fabricated). A source that is slow/unavailable is excluded from the fusion, not assumed good.';

const VERDICT_ENUM = ['allow', 'review', 'caution'] as const;
type Verdict = typeof VERDICT_ENUM[number];

export interface TokenProfile {
  address: string; chain: string; chain_family: string;
  identity: { name: string | null; symbol: string | null; categories: string[]; market_cap_rank: number | null; coingecko_id: string | null; coingecko_listed: boolean; explorer_url: string; homepage: string | null; twitter: string | null };
  market: { price_usd: number | null; market_cap_usd: number | null; fdv_usd: number | null; volume_24h_usd: number | null; ath_usd: number | null; ath_change_pct: number | null; price_change_24h_pct: number | null; dex_price_usd: number | null; price_deviation_pct: number | null };
  supply: { circulating: number | null; total: number | null; max: number | null; circulating_pct: number | null; fdv_mc_ratio: number | null; onchain_total: number | null; decimals: number | null };
  liquidity: { total_dex_liquidity_usd: number | null; pairs_found: number; top_pair: TokenGrounding['dex']['top_pair']; liquidity_to_mcap_ratio: number | null; oldest_pair_age_days: number | null };
  contract: { verified_source: boolean | null; is_proxy: boolean | null; contract_name: string | null; compiler: string | null; deployer: string | null; mint_authority_renounced: boolean | null; freeze_authority_none: boolean | null };
  holders: { available: boolean; holder_count: number | null; source: string | null };
  flags: string[];
  trust_score: number | null; trust_tier: string; verdict: Verdict;
  sources_used: string[];
  unavailable_sources: { source: string; status: string; detail: string }[];
  source_fetches: { source: string; status: string; latency_ms: number; detail: string }[];
  data_unavailable: boolean;
}

const pct = (a: number | null | undefined, b: number | null | undefined): number | null => (typeof a === 'number' && typeof b === 'number' && b !== 0 ? round((a / b) * 100, 2) : null);

const STABLE_RE = /stablecoin/i;

// Deterministic trust composite over REAL facts only. risk starts neutral and is adjusted by
// each measured signal; trust_score = 100 - risk. No LLM, no fabricated honeypot/rug score.
function fuseTrust(g: TokenGrounding, p: TokenProfile): { trust_score: number | null; trust_tier: string; verdict: Verdict; flags: string[] } {
  const flags: string[] = [];
  const cg = g.coingecko, dex = g.dex, con = g.contract;
  const anyData = cg.checked || dex.checked || con.checked;
  if (!anyData) return { trust_score: null, trust_tier: 'unknown', verdict: 'review', flags: ['no_data_available'] };

  let risk = 50; // neutral baseline

  // Listing / market tracking.
  if (cg.checked && cg.listed) {
    risk -= 10;
    if (cg.market_cap_rank !== null && cg.market_cap_rank <= 1000) { risk -= 8; flags.push('coingecko_top1000'); }
  } else if (cg.checked && !cg.listed) { risk += 12; flags.push('not_listed_on_coingecko'); }

  // Contract verification (EVM).
  if (con.verified_source === true) { risk -= 12; flags.push('verified_source'); }
  else if (con.verified_source === false) { risk += 20; flags.push('unverified_source'); }
  if (con.is_proxy === true) { risk += 6; flags.push('proxy_contract'); }

  // Solana mint authority (renounced = can't inflate supply; present = can).
  if (con.mint_authority_renounced === false) { risk += 16; flags.push('mint_authority_active'); }
  else if (con.mint_authority_renounced === true) { risk -= 6; flags.push('mint_authority_renounced'); }
  if (con.freeze_authority_none === false) { risk += 10; flags.push('freeze_authority_present'); }

  // DEX liquidity depth.
  const liq = dex.total_liquidity_usd;
  if (dex.checked) {
    if (liq !== null && liq >= 1_000_000) { risk -= 12; flags.push('deep_liquidity'); }
    else if (liq !== null && liq >= 100_000) { risk -= 5; }
    else if (liq !== null && liq < 10_000) { risk += 20; flags.push('thin_liquidity'); }
    else if (dex.pairs_found === 0) { risk += 15; flags.push('no_dex_liquidity'); }
  }
  // Liquidity relative to market cap.
  if (p.liquidity.liquidity_to_mcap_ratio !== null && p.liquidity.liquidity_to_mcap_ratio < 0.5) { risk += 8; flags.push('low_liquidity_vs_mcap'); }

  // Dilution (lots of supply not yet circulating).
  if (p.supply.fdv_mc_ratio !== null) {
    if (p.supply.fdv_mc_ratio > 10) { risk += 15; flags.push('extreme_dilution'); }
    else if (p.supply.fdv_mc_ratio > 5) { risk += 8; flags.push('high_dilution'); }
  }

  // DEX vs CoinGecko price deviation (illiquidity/manipulation signal).
  if (p.market.price_deviation_pct !== null && Math.abs(p.market.price_deviation_pct) > 3) { risk += 10; flags.push('price_source_deviation'); }

  // Token age (via oldest DEX pair).
  const age = dex.oldest_pair_age_days;
  if (age !== null) {
    if (age < 2) { risk += 25; flags.push('very_new_token'); }
    else if (age < 14) { risk += 12; flags.push('new_token'); }
    else if (age > 365) { risk -= 6; flags.push('established_token'); }
  }

  // Stablecoin depeg.
  const isStable = cg.categories.some((c) => STABLE_RE.test(c));
  if (isStable && cg.price_usd !== null && Math.abs(cg.price_usd - 1) > 0.02) { risk += 20; flags.push('stablecoin_depeg'); }

  const trust_score = clamp(round(100 - risk, 0), 0, 100);
  // Lower trust_score = higher risk.
  let trust_tier: string, verdict: Verdict;
  if (trust_score >= 70) { trust_tier = 'trusted'; verdict = 'allow'; }
  else if (trust_score >= 50) { trust_tier = 'neutral'; verdict = 'allow'; }
  else if (trust_score >= 35) { trust_tier = 'caution'; verdict = 'review'; }
  else { trust_tier = 'high_risk'; verdict = 'caution'; }
  return { trust_score, trust_tier, verdict, flags };
}

export async function buildProfile(body: any): Promise<{ error: string } | { result: TokenProfile }> {
  if (body === undefined || body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide a JSON object with a token "address".' };
  const address = typeof body.address === 'string' ? body.address.trim() : '';
  if (!address) return { error: 'Provide a token "address" (the contract/mint address, string).' };
  if (body.chain !== undefined && typeof body.chain !== 'string') return { error: '"chain" must be a string when provided.' };

  const det = detectChain(address, typeof body.chain === 'string' ? body.chain : undefined);
  if ('error' in det) return { error: det.error };

  const g = await groundToken(address, det, TIMEOUT_MS);
  const cg = g.coingecko, dex = g.dex, con = g.contract;

  // Humanize the EVM raw on-chain supply with CoinGecko's decimal_place (Etherscan returns base
  // units; Solana already returns a uiAmount). decimals: CoinGecko for EVM, RPC for Solana.
  const decimals = det.family === 'solana' ? con.decimals : (cg.decimals ?? null);
  let onchain_total = con.onchain_total_supply;
  if (det.family === 'evm' && onchain_total !== null) onchain_total = decimals !== null ? round(onchain_total / Math.pow(10, decimals), 4) : null;

  const circulating_pct = pct(cg.circulating_supply, cg.total_supply ?? cg.max_supply);
  const fdv_mc_ratio = (cg.fdv_usd !== null && cg.market_cap_usd && cg.market_cap_usd > 0) ? round(cg.fdv_usd / cg.market_cap_usd, 3) : null;
  const liquidity_to_mcap_ratio = (dex.total_liquidity_usd !== null && cg.market_cap_usd && cg.market_cap_usd > 0) ? round((dex.total_liquidity_usd / cg.market_cap_usd) * 100, 3) : null;
  const price_deviation_pct = (cg.price_usd !== null && dex.dex_price_usd !== null && cg.price_usd > 0) ? round(((dex.dex_price_usd - cg.price_usd) / cg.price_usd) * 100, 2) : null;

  const profile: TokenProfile = {
    address, chain: det.chain, chain_family: det.family,
    identity: { name: cg.name, symbol: cg.symbol, categories: cg.categories.slice(0, 8), market_cap_rank: cg.market_cap_rank, coingecko_id: cg.id, coingecko_listed: cg.checked && cg.listed, explorer_url: `${det.explorer}${address}`, homepage: cg.homepage, twitter: cg.twitter },
    market: { price_usd: cg.price_usd, market_cap_usd: cg.market_cap_usd, fdv_usd: cg.fdv_usd, volume_24h_usd: cg.volume_24h_usd, ath_usd: cg.ath_usd, ath_change_pct: cg.ath_change_pct, price_change_24h_pct: cg.price_change_24h_pct, dex_price_usd: dex.dex_price_usd, price_deviation_pct },
    supply: { circulating: cg.circulating_supply, total: cg.total_supply, max: cg.max_supply, circulating_pct, fdv_mc_ratio, onchain_total, decimals },
    liquidity: { total_dex_liquidity_usd: dex.total_liquidity_usd, pairs_found: dex.pairs_found, top_pair: dex.top_pair, liquidity_to_mcap_ratio, oldest_pair_age_days: dex.oldest_pair_age_days },
    contract: { verified_source: con.verified_source, is_proxy: con.is_proxy, contract_name: con.contract_name, compiler: con.compiler, deployer: con.deployer, mint_authority_renounced: con.mint_authority_renounced, freeze_authority_none: con.freeze_authority_none },
    holders: { available: g.holders.available, holder_count: g.holders.holder_count, source: g.holders.source },
    flags: [],
    trust_score: null, trust_tier: 'unknown', verdict: 'review',
    sources_used: g.fetches.filter((f) => f.status === 'ok').map((f) => f.source),
    unavailable_sources: g.fetches.filter((f) => f.status !== 'ok').map((f) => ({ source: f.source, status: f.status, detail: f.detail })),
    source_fetches: g.fetches.map((f) => ({ source: f.source, status: f.status, latency_ms: f.latency_ms, detail: f.detail })),
    data_unavailable: !(cg.checked || dex.checked || con.checked),
  };

  const t = fuseTrust(g, profile);
  profile.trust_score = t.trust_score; profile.trust_tier = t.trust_tier; profile.verdict = t.verdict; profile.flags = t.flags;
  return { result: profile };
}

function confidenceFor(p: TokenProfile): number {
  const ok = p.source_fetches.filter((s) => s.status === 'ok').length;
  if (ok === 0) return 0.2;
  return clamp(round(0.5 + ok * 0.13, 2), 0, 0.95);
}

function actions(p: TokenProfile): string[] {
  const out: string[] = [];
  if (p.data_unavailable) { out.push('No real data could be fetched for this token right now (sources slow/unavailable or address not recognized on this chain) — verdict defaults to review; retry shortly.'); return out; }
  out.push(`Token ${p.identity.symbol ?? p.address} on ${p.chain}: trust ${p.trust_score}/100 (${p.trust_tier}) over ${p.sources_used.length} live source(s) → verdict ${p.verdict}.`);
  if (p.flags.includes('unverified_source')) out.push('Contract source is UNVERIFIED on the explorer — treat with elevated caution and audit the bytecode before interacting.');
  if (p.flags.includes('mint_authority_active')) out.push('Mint authority is NOT renounced — the supply can still be inflated by the mint owner.');
  if (p.flags.includes('thin_liquidity') || p.flags.includes('no_dex_liquidity')) out.push('DEX liquidity is thin/absent — high slippage and exit risk; size positions accordingly.');
  if (p.flags.includes('very_new_token') || p.flags.includes('new_token')) out.push('Token/pair is very new — limited track record; higher rug/volatility risk.');
  if (p.flags.includes('stablecoin_depeg')) out.push('Stablecoin is off its peg by >2% — verify the depeg cause before treating as a dollar proxy.');
  if (p.verdict === 'caution') out.push('Caution: multiple risk flags present — do not interact autonomously; require manual review.');
  else if (p.verdict === 'review') out.push('Review: gate the action behind a stricter threshold or human approval.');
  else out.push('Allow: no major risk flags in the fetched data; proceed with normal monitoring.');
  if (!p.holders.available) out.push('Holder concentration was not fetched (no indexed source for this chain) — pull it separately if you need whale/top-holder analysis.');
  if (p.unavailable_sources.length > 0) out.push(`${p.unavailable_sources.length} source(s) unavailable (${p.unavailable_sources.map((s) => s.source).join(', ')}); the profile is fused over the rest — re-run for a fuller picture.`);
  return out;
}

const CHAIN_TO = [
  { api: 'contract-analyzer', reason: 'Run a deep AI + source-code risk/vulnerability audit on this contract.', url: 'https://orbis-apis.onrender.com/contract-analyzer' },
  { api: 'token-approval-risk-scanner', reason: 'Score the drain exposure of a wallet\'s approvals to this token.', url: 'https://orbis-apis.onrender.com/token-approval-risk-scanner' },
  { api: 'wallet-verdict', reason: 'Screen a holder/counterparty wallet for sanctions + on-chain risk in one call.', url: 'https://orbis-apis.onrender.com/wallet-verdict' },
];

function confSections(p: TokenProfile) {
  return { fetch: p.data_unavailable ? 0 : 1, market: p.market.price_usd !== null ? 1 : 0, contract: p.contract.verified_source !== null || p.contract.mint_authority_renounced !== null ? 1 : 0, fusion: 1, interpretation: 0.7 };
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Token Profile API', version: '1.0.0',
    description: 'Orchestrated one-call token intelligence grounded in REAL data. Give it a token contract (EVM incl. BNB Chain, or Solana); it fetches identity/market/supply from CoinGecko, DEX liquidity/price/age from DexScreener, and contract verification/supply/authority from the chain explorer (Etherscan V2 / Solana RPC), all in parallel, and fuses them into one dossier plus a deterministic trust score, tier, and allow/review/caution verdict. No LLM fabrication; holder concentration is shown only where a real source exists. Always HTTP 200 with partial results.',
    supported_chains: SUPPORTED_CHAINS,
    openapi_url: 'https://orbis-apis.onrender.com/token-profile/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/intel', summary: 'Fetch live token signals and fuse into one profile + trust verdict', price_usdc: 0.05 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL profile + reasoning + prioritized actions', price_usdc: 0.09 },
    ],
    pricing: [
      { path: '/intel', price_usdc: 0.05, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.09, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/intel', async (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = await buildProfile(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, {
    ...r.result, risk_disclaimer: DISCLAIMER,
    confidence_score: confidenceFor(r.result), confidence_per_section: confSections(r.result),
    recommended_actions_priority_order: actions(r.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', async (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = await buildProfile(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const p = r.result;
  respond(res, t0, {
    ...p, risk_disclaimer: DISCLAIMER,
    reasoning: {
      why_result_generated: p.data_unavailable
        ? `Could not fetch any real data for ${p.address} on ${p.chain}; verdict defaults to review.`
        : `On ${p.chain} (${p.chain_family}): fetched ${p.sources_used.length} live source(s) for ${p.identity.name ?? p.address} and fused them into trust ${p.trust_score}/100 (${p.trust_tier}) → verdict ${p.verdict}.`,
      key_factors: [
        `Sources used: ${p.sources_used.length ? p.sources_used.join(', ') : 'none'}; unavailable: ${p.unavailable_sources.length ? p.unavailable_sources.map((s) => s.source).join(', ') : 'none'}.`,
        p.identity.coingecko_listed ? `CoinGecko: ${p.identity.name} (rank ${p.identity.market_cap_rank ?? 'n/a'}), price $${p.market.price_usd ?? 'n/a'}, mcap $${p.market.market_cap_usd ?? 'n/a'}, FDV/MC ${p.supply.fdv_mc_ratio ?? 'n/a'}.` : 'CoinGecko: token not listed/tracked.',
        p.liquidity.pairs_found ? `DEX: $${p.liquidity.total_dex_liquidity_usd} liquidity across ${p.liquidity.pairs_found} pair(s), oldest pair ${p.liquidity.oldest_pair_age_days ?? '?'}d, DEX price deviation ${p.market.price_deviation_pct ?? 'n/a'}%.` : 'DEX: no pairs on this chain.',
        p.contract.verified_source !== null ? `Contract: verified=${p.contract.verified_source}${p.contract.is_proxy ? ', proxy' : ''}${p.contract.contract_name ? ', ' + p.contract.contract_name : ''}.` : (p.contract.mint_authority_renounced !== null ? `SPL mint: mint_auth_renounced=${p.contract.mint_authority_renounced}, freeze_auth_none=${p.contract.freeze_authority_none}.` : 'Contract facts: unavailable.'),
        `Flags: ${p.flags.length ? p.flags.join(', ') : 'none'}.`,
      ],
      invalidators: [
        'Fuses only the sources reachable at call time; a slow/unavailable source is excluded, not assumed good — re-run for a fuller profile.',
        'The trust score is a deterministic read of real facts (verification, liquidity, dilution, age, authority); it is NOT a bytecode honeypot/rug audit — chain to contract-analyzer for that.',
        'Holder concentration is omitted unless a real indexed source exists (EVM holder lists are paid-tier) — absence is reported, never fabricated.',
        'Market/liquidity data can lag the chain and a token can be re-deployed or rugged after this snapshot.',
      ],
    },
    confidence_score: confidenceFor(p), confidence_per_section: confSections(p),
    recommended_actions_priority_order: actions(p), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
