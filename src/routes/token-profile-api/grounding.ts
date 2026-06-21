// Real-data grounding for the token-profile aggregator.
//
// Everything here is FETCHED from a real source — NOTHING is LLM-generated. For one token
// (contract address + chain) we fan out, in parallel, to:
//   • CoinGecko   — identity (name/symbol/categories/links/rank), market (price/mcap/FDV/
//                   volume/ATH), and supply (circulating/total/max). No key required.
//   • DexScreener — real on-chain DEX liquidity, top pair, 24h DEX volume, pair age, and DEX
//                   price (cross-checked against CoinGecko). No key required.
//   • Etherscan V2 (EVM) — contract VERIFICATION status (verified/proxy/compiler/name),
//                   deployer, and on-chain token supply. Real facts from the chain.
//   • Solana RPC (Solana) — on-chain mint supply/decimals + mint/freeze AUTHORITY (renounced?),
//                   which is a real safety signal. No key required.
//   • Solscan (Solana, optional key) — holder count where the key is configured.
//
// Holder concentration on EVM is gated behind paid explorer tiers, so we DO NOT fabricate it —
// it is reported `available:false`. A source that can't be reached is reported `checked:false`
// and never treated as "clean". The result is cached briefly to stay under free-tier limits.

export type TokenChainFamily = 'evm' | 'solana';

// EVM chains: chainId for Etherscan V2, CoinGecko platform id, and DexScreener chain slug.
interface ChainMeta { chainId: number; cgPlatform: string; dexChain: string; symbol: string; explorer: string; }
const EVM_CHAINS: Record<string, ChainMeta> = {
  ethereum: { chainId: 1, cgPlatform: 'ethereum', dexChain: 'ethereum', symbol: 'ETH', explorer: 'https://etherscan.io/token/' },
  eth: { chainId: 1, cgPlatform: 'ethereum', dexChain: 'ethereum', symbol: 'ETH', explorer: 'https://etherscan.io/token/' },
  mainnet: { chainId: 1, cgPlatform: 'ethereum', dexChain: 'ethereum', symbol: 'ETH', explorer: 'https://etherscan.io/token/' },
  bsc: { chainId: 56, cgPlatform: 'binance-smart-chain', dexChain: 'bsc', symbol: 'BNB', explorer: 'https://bscscan.com/token/' },
  binance: { chainId: 56, cgPlatform: 'binance-smart-chain', dexChain: 'bsc', symbol: 'BNB', explorer: 'https://bscscan.com/token/' },
  bnb: { chainId: 56, cgPlatform: 'binance-smart-chain', dexChain: 'bsc', symbol: 'BNB', explorer: 'https://bscscan.com/token/' },
  'bnb-chain': { chainId: 56, cgPlatform: 'binance-smart-chain', dexChain: 'bsc', symbol: 'BNB', explorer: 'https://bscscan.com/token/' },
  'binance-smart-chain': { chainId: 56, cgPlatform: 'binance-smart-chain', dexChain: 'bsc', symbol: 'BNB', explorer: 'https://bscscan.com/token/' },
  polygon: { chainId: 137, cgPlatform: 'polygon-pos', dexChain: 'polygon', symbol: 'POL', explorer: 'https://polygonscan.com/token/' },
  matic: { chainId: 137, cgPlatform: 'polygon-pos', dexChain: 'polygon', symbol: 'POL', explorer: 'https://polygonscan.com/token/' },
  arbitrum: { chainId: 42161, cgPlatform: 'arbitrum-one', dexChain: 'arbitrum', symbol: 'ETH', explorer: 'https://arbiscan.io/token/' },
  arb: { chainId: 42161, cgPlatform: 'arbitrum-one', dexChain: 'arbitrum', symbol: 'ETH', explorer: 'https://arbiscan.io/token/' },
  'arbitrum-one': { chainId: 42161, cgPlatform: 'arbitrum-one', dexChain: 'arbitrum', symbol: 'ETH', explorer: 'https://arbiscan.io/token/' },
  optimism: { chainId: 10, cgPlatform: 'optimistic-ethereum', dexChain: 'optimism', symbol: 'ETH', explorer: 'https://optimistic.etherscan.io/token/' },
  op: { chainId: 10, cgPlatform: 'optimistic-ethereum', dexChain: 'optimism', symbol: 'ETH', explorer: 'https://optimistic.etherscan.io/token/' },
  base: { chainId: 8453, cgPlatform: 'base', dexChain: 'base', symbol: 'ETH', explorer: 'https://basescan.org/token/' },
  avalanche: { chainId: 43114, cgPlatform: 'avalanche', dexChain: 'avalanche', symbol: 'AVAX', explorer: 'https://snowtrace.io/token/' },
  avax: { chainId: 43114, cgPlatform: 'avalanche', dexChain: 'avalanche', symbol: 'AVAX', explorer: 'https://snowtrace.io/token/' },
  fantom: { chainId: 250, cgPlatform: 'fantom', dexChain: 'fantom', symbol: 'FTM', explorer: 'https://ftmscan.com/token/' },
  ftm: { chainId: 250, cgPlatform: 'fantom', dexChain: 'fantom', symbol: 'FTM', explorer: 'https://ftmscan.com/token/' },
  gnosis: { chainId: 100, cgPlatform: 'xdai', dexChain: 'gnosischain', symbol: 'xDAI', explorer: 'https://gnosisscan.io/token/' },
  celo: { chainId: 42220, cgPlatform: 'celo', dexChain: 'celo', symbol: 'CELO', explorer: 'https://celoscan.io/token/' },
  linea: { chainId: 59144, cgPlatform: 'linea', dexChain: 'linea', symbol: 'ETH', explorer: 'https://lineascan.build/token/' },
  scroll: { chainId: 534352, cgPlatform: 'scroll', dexChain: 'scroll', symbol: 'ETH', explorer: 'https://scrollscan.com/token/' },
  blast: { chainId: 81457, cgPlatform: 'blast', dexChain: 'blast', symbol: 'ETH', explorer: 'https://blastscan.io/token/' },
};
const SOLANA_META = { cgPlatform: 'solana', dexChain: 'solana', explorer: 'https://solscan.io/token/' };

const EVM_RE = /^0x[a-fA-F0-9]{40}$/;
const SOL_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export const SUPPORTED_CHAINS = [...Object.keys(EVM_CHAINS), 'solana', 'sol'];

export interface TokenDetected { family: TokenChainFamily; chain: string; chainId?: number; cgPlatform: string; dexChain: string; explorer: string; }

// Resolve which chain a token contract belongs to. An explicit hint wins (validated against the
// address format); otherwise inferred from the address shape. Tokens are EVM or Solana only.
export function detectChain(address: string, chainHint?: string): TokenDetected | { error: string } {
  const hint = (chainHint || '').trim().toLowerCase();
  if (hint) {
    if (hint in EVM_CHAINS) {
      if (!EVM_RE.test(address)) return { error: `chain "${chainHint}" is EVM but the address is not a 0x + 40-hex token contract.` };
      const m = EVM_CHAINS[hint];
      return { family: 'evm', chain: hint, chainId: m.chainId, cgPlatform: m.cgPlatform, dexChain: m.dexChain, explorer: m.explorer };
    }
    if (hint === 'solana' || hint === 'sol') {
      if (!SOL_RE.test(address)) return { error: `chain "${chainHint}" is Solana but the address is not a base58 SPL mint address.` };
      return { family: 'solana', chain: 'solana', cgPlatform: SOLANA_META.cgPlatform, dexChain: SOLANA_META.dexChain, explorer: SOLANA_META.explorer };
    }
    return { error: `Unsupported chain "${chainHint}". Supported: ${SUPPORTED_CHAINS.join(', ')}.` };
  }
  // Infer from format. EVM 0x-addresses are unambiguous; otherwise try Solana base58.
  if (EVM_RE.test(address)) { const m = EVM_CHAINS.ethereum; return { family: 'evm', chain: 'ethereum', chainId: m.chainId, cgPlatform: m.cgPlatform, dexChain: m.dexChain, explorer: m.explorer }; }
  if (SOL_RE.test(address)) return { family: 'solana', chain: 'solana', cgPlatform: SOLANA_META.cgPlatform, dexChain: SOLANA_META.dexChain, explorer: SOLANA_META.explorer };
  return { error: 'Token address not recognized (expected EVM 0x+40hex or Solana base58 mint). Pass an explicit "chain" to disambiguate an EVM chain.' };
}

const numOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const round = (n: number, dp = 6) => { const f = Math.pow(10, dp); return Math.round(n * f) / f; };

// ---------------------------------------------------------------------------
// CoinGecko — identity + market + supply (no key).
// ---------------------------------------------------------------------------
const CG_BASE = process.env.COINGECKO_BASE || 'https://api.coingecko.com/api/v3';
export interface CgResult {
  checked: boolean; listed: boolean;
  id: string | null; name: string | null; symbol: string | null;
  categories: string[]; market_cap_rank: number | null;
  price_usd: number | null; market_cap_usd: number | null; fdv_usd: number | null;
  volume_24h_usd: number | null; ath_usd: number | null; ath_change_pct: number | null; price_change_24h_pct: number | null;
  circulating_supply: number | null; total_supply: number | null; max_supply: number | null;
  decimals: number | null;
  homepage: string | null; twitter: string | null;
  detail: string;
}
const emptyCg = (detail: string): CgResult => ({ checked: false, listed: false, id: null, name: null, symbol: null, categories: [], market_cap_rank: null, price_usd: null, market_cap_usd: null, fdv_usd: null, volume_24h_usd: null, ath_usd: null, ath_change_pct: null, price_change_24h_pct: null, circulating_supply: null, total_supply: null, max_supply: null, decimals: null, homepage: null, twitter: null, detail });

async function fetchCoinGecko(address: string, det: TokenDetected, timeoutMs: number): Promise<CgResult> {
  const url = `${CG_BASE}/coins/${det.cgPlatform}/contract/${address.toLowerCase()}`;
  try {
    const headers: Record<string, string> = { accept: 'application/json' };
    if (process.env.COINGECKO_API_KEY) headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY;
    const r = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
    if (r.status === 429) return emptyCg('CoinGecko rate-limited (429) — market data temporarily unavailable, NOT assumed');
    if (r.status === 404) return { ...emptyCg('not found on CoinGecko (token is not listed/tracked)'), checked: true, listed: false };
    if (!r.ok) return emptyCg(`CoinGecko HTTP ${r.status}`);
    const d: any = await r.json();
    const md = d.market_data ?? {};
    const usd = (o: any) => (o && typeof o.usd === 'number' ? o.usd : null);
    const links = d.links ?? {};
    const tw = links.twitter_screen_name ? `https://twitter.com/${links.twitter_screen_name}` : null;
    const home = Array.isArray(links.homepage) ? (links.homepage.find((x: string) => x) ?? null) : null;
    const dp = d.detail_platforms ?? {};
    const decimals = numOrNull(dp[det.cgPlatform]?.decimal_place) ?? numOrNull(Object.values(dp).map((p: any) => p?.decimal_place).find((x: any) => typeof x === 'number'));
    return {
      checked: true, listed: true,
      id: d.id ?? null, name: d.name ?? null, symbol: typeof d.symbol === 'string' ? d.symbol.toUpperCase() : null,
      categories: Array.isArray(d.categories) ? d.categories.filter((x: any) => typeof x === 'string') : [],
      market_cap_rank: numOrNull(d.market_cap_rank),
      price_usd: usd(md.current_price), market_cap_usd: usd(md.market_cap), fdv_usd: usd(md.fully_diluted_valuation),
      volume_24h_usd: usd(md.total_volume), ath_usd: usd(md.ath), ath_change_pct: usd(md.ath_change_percentage),
      price_change_24h_pct: numOrNull(md.price_change_percentage_24h),
      circulating_supply: numOrNull(md.circulating_supply), total_supply: numOrNull(md.total_supply), max_supply: numOrNull(md.max_supply),
      decimals,
      homepage: home, twitter: tw,
      detail: `listed as ${d.name ?? d.id} (rank ${d.market_cap_rank ?? 'n/a'})`,
    };
  } catch (e: any) {
    const to = e?.name === 'TimeoutError';
    return emptyCg(`CoinGecko ${to ? 'timed out' : 'error: ' + String(e?.message ?? e).slice(0, 80)} — NOT assumed`);
  }
}

// ---------------------------------------------------------------------------
// DexScreener — real DEX liquidity / pairs / age / price (no key).
// ---------------------------------------------------------------------------
const DEX_BASE = 'https://api.dexscreener.com/latest/dex/tokens';
export interface DexResult {
  checked: boolean; pairs_found: number; total_liquidity_usd: number | null;
  top_pair: { dex: string | null; pair_url: string | null; liquidity_usd: number | null; volume_24h_usd: number | null; price_usd: number | null } | null;
  oldest_pair_age_days: number | null; dex_price_usd: number | null; detail: string;
}
const emptyDex = (detail: string): DexResult => ({ checked: false, pairs_found: 0, total_liquidity_usd: null, top_pair: null, oldest_pair_age_days: null, dex_price_usd: null, detail });

async function fetchDexScreener(address: string, det: TokenDetected, timeoutMs: number): Promise<DexResult> {
  try {
    const r = await fetch(`${DEX_BASE}/${address}`, { signal: AbortSignal.timeout(timeoutMs) });
    if (r.status === 429) return emptyDex('DexScreener rate-limited (429)');
    if (!r.ok) return emptyDex(`DexScreener HTTP ${r.status}`);
    const d: any = await r.json();
    const all = Array.isArray(d.pairs) ? d.pairs : [];
    // CRITICAL: filter to the requested chain — the global pair list mixes chains.
    const pairs = all.filter((p: any) => String(p.chainId).toLowerCase() === det.dexChain);
    if (pairs.length === 0) return { ...emptyDex(all.length ? `no DEX pairs on ${det.chain} (found ${all.length} on other chains)` : 'no DEX pairs found'), checked: true };
    const liqOf = (p: any) => numOrNull(p?.liquidity?.usd) ?? 0;
    const sorted = [...pairs].sort((a, b) => liqOf(b) - liqOf(a));
    const top = sorted[0];
    const total = round(pairs.reduce((s: number, p: any) => s + liqOf(p), 0), 2);
    let oldestAge: number | null = null;
    for (const p of pairs) { const c = numOrNull(p.pairCreatedAt); if (c !== null) { const age = Math.floor((Date.now() - c) / 86400000); oldestAge = oldestAge === null ? age : Math.max(oldestAge, age); } }
    return {
      checked: true, pairs_found: pairs.length, total_liquidity_usd: total,
      top_pair: { dex: top.dexId ?? null, pair_url: top.url ?? null, liquidity_usd: round(liqOf(top), 2), volume_24h_usd: numOrNull(top?.volume?.h24), price_usd: top.priceUsd ? Number(top.priceUsd) : null },
      oldest_pair_age_days: oldestAge, dex_price_usd: top.priceUsd ? Number(top.priceUsd) : null,
      detail: `${pairs.length} pair(s) on ${det.chain}, top ${top.dexId}, liquidity $${total}`,
    };
  } catch (e: any) {
    const to = e?.name === 'TimeoutError';
    return emptyDex(`DexScreener ${to ? 'timed out' : 'error: ' + String(e?.message ?? e).slice(0, 80)}`);
  }
}

// ---------------------------------------------------------------------------
// On-chain contract facts.
// ---------------------------------------------------------------------------
export interface ContractResult {
  checked: boolean; verified_source: boolean | null; is_proxy: boolean | null;
  contract_name: string | null; compiler: string | null; deployer: string | null;
  onchain_total_supply: number | null; decimals: number | null;
  mint_authority_renounced: boolean | null; freeze_authority_none: boolean | null; // Solana only
  detail: string;
}
const emptyContract = (detail: string): ContractResult => ({ checked: false, verified_source: null, is_proxy: null, contract_name: null, compiler: null, deployer: null, onchain_total_supply: null, decimals: null, mint_authority_renounced: null, freeze_authority_none: null, detail });

const ETHERSCAN_KEY = process.env.ETHERSCAN_API_KEY || '';
const ETHERSCAN_V2 = 'https://api.etherscan.io/v2/api';
const isRateLimited = (j: any) => j?.status === '0' && /rate limit/i.test(String(j?.result ?? j?.message ?? ''));

async function etherscanV2(chainId: number, params: Record<string, string>, timeoutMs: number): Promise<any> {
  const qs = new URLSearchParams({ chainid: String(chainId), ...params, apikey: ETHERSCAN_KEY });
  const once = async () => { const r = await fetch(`${ETHERSCAN_V2}?${qs.toString()}`, { signal: AbortSignal.timeout(timeoutMs) }); if (!r.ok) throw new Error(`etherscan HTTP ${r.status}`); return r.json(); };
  let j = await once();
  if (isRateLimited(j)) { await new Promise((res) => setTimeout(res, 280)); j = await once(); }
  return j;
}

async function contractEvm(address: string, chainId: number, timeoutMs: number): Promise<ContractResult> {
  if (!ETHERSCAN_KEY) return emptyContract('ETHERSCAN_API_KEY not set on server');
  const settle = async (p: Promise<any>): Promise<any | null> => { try { return await p; } catch { return null; } };
  const per = Math.min(timeoutMs, 5000);
  // Sequential: shares one Etherscan key with sibling APIs, so don't burst.
  const srcV = await settle(etherscanV2(chainId, { module: 'contract', action: 'getsourcecode', address }, per));
  const supV = await settle(etherscanV2(chainId, { module: 'stats', action: 'tokensupply', contractaddress: address }, per));
  const creV = await settle(etherscanV2(chainId, { module: 'contract', action: 'getcontractcreation', contractaddresses: address }, per));
  const invalidKey = [srcV, supV, creV].some((j) => typeof j?.result === 'string' && /invalid api key/i.test(j.result));
  if (invalidKey) return emptyContract('Etherscan API key invalid/not configured on server');
  if (srcV === null && supV === null && creV === null) return emptyContract('all Etherscan calls failed');
  let verified_source: boolean | null = null, is_proxy: boolean | null = null, contract_name: string | null = null, compiler: string | null = null;
  const src = srcV?.status === '1' && Array.isArray(srcV.result) ? srcV.result[0] : null;
  if (src) {
    verified_source = typeof src.SourceCode === 'string' && src.SourceCode.trim().length > 0;
    is_proxy = src.Proxy === '1' || src.Proxy === 1;
    contract_name = src.ContractName || null;
    compiler = src.CompilerVersion || null;
  }
  // RAW base-unit supply; humanized in the fusion layer using CoinGecko's decimal_place.
  let onchain_total_raw: number | null = null;
  if (supV?.status === '1' && typeof supV.result === 'string' && /^\d+$/.test(supV.result)) { try { onchain_total_raw = Number(BigInt(supV.result)); } catch { /* keep null */ } }
  let deployer: string | null = null;
  if (creV?.status === '1' && Array.isArray(creV.result) && creV.result[0]?.contractCreator) deployer = creV.result[0].contractCreator;
  const checked = src !== null || onchain_total_raw !== null || deployer !== null;
  return { checked, verified_source, is_proxy, contract_name, compiler, deployer, onchain_total_supply: onchain_total_raw, decimals: null, mint_authority_renounced: null, freeze_authority_none: null, detail: checked ? `verified=${verified_source}${is_proxy ? ', proxy' : ''}${contract_name ? ', ' + contract_name : ''}` : 'contract facts unavailable' };
}

// Prefer Helius (reliable for getAccountInfo) when a key is configured; the public mainnet-beta
// endpoint is a fallback but frequently rate-limits unauthenticated account lookups.
const SOLANA_RPCS: string[] = [
  ...(process.env.SOLANA_RPC_URL ? [process.env.SOLANA_RPC_URL] : []),
  ...(process.env.HELIUS_API_KEY ? [`https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`] : []),
  'https://api.mainnet-beta.solana.com',
];
async function solanaRpc(method: string, params: unknown[], timeoutMs: number): Promise<any> {
  let lastErr = 'no solana RPC reachable';
  for (const endpoint of SOLANA_RPCS) {
    try {
      const r = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(timeoutMs) });
      if (!r.ok) { lastErr = `solana RPC HTTP ${r.status}`; continue; }
      const j: any = await r.json();
      if (j.error) { lastErr = `solana RPC ${j.error?.message ?? 'error'}`; continue; } // e.g. invalid Helius key → try next
      return j.result;
    } catch (e: any) { lastErr = String(e?.message ?? e).slice(0, 80); }
  }
  throw new Error(lastErr);
}

async function contractSolana(address: string, timeoutMs: number): Promise<ContractResult> {
  // getAccountInfo with jsonParsed on a mint returns supply, decimals, mintAuthority, freezeAuthority
  // — all REAL facts, no key. A renounced mint authority is a meaningful safety signal.
  const [accR, supR] = await Promise.allSettled([
    solanaRpc('getAccountInfo', [address, { encoding: 'jsonParsed' }], timeoutMs),
    solanaRpc('getTokenSupply', [address], timeoutMs),
  ]);
  if (accR.status !== 'fulfilled' && supR.status !== 'fulfilled') return emptyContract('Solana RPC unavailable');
  let decimals: number | null = null, onchain_total_supply: number | null = null;
  let mint_authority_renounced: boolean | null = null, freeze_authority_none: boolean | null = null;
  let isMint = false;
  if (accR.status === 'fulfilled') {
    const info = accR.value?.value?.data?.parsed?.info;
    const type = accR.value?.value?.data?.parsed?.type;
    if (info && type === 'mint') {
      isMint = true;
      decimals = numOrNull(info.decimals);
      mint_authority_renounced = info.mintAuthority === null || info.mintAuthority === undefined;
      freeze_authority_none = info.freezeAuthority === null || info.freezeAuthority === undefined;
    }
  }
  if (supR.status === 'fulfilled') { const ui = supR.value?.value?.uiAmount; if (typeof ui === 'number') onchain_total_supply = ui; if (decimals === null) decimals = numOrNull(supR.value?.value?.decimals); }
  const checked = isMint || onchain_total_supply !== null;
  return { checked, verified_source: null, is_proxy: null, contract_name: null, compiler: null, deployer: null, onchain_total_supply, decimals, mint_authority_renounced, freeze_authority_none, detail: checked ? `SPL mint: decimals ${decimals ?? '?'}, mint_auth_renounced=${mint_authority_renounced}, freeze_auth_none=${freeze_authority_none}` : 'not a recognized SPL mint' };
}

// ---------------------------------------------------------------------------
// Holder count — only where a real indexed source is available (NEVER fabricated).
// ---------------------------------------------------------------------------
export interface HoldersResult { available: boolean; holder_count: number | null; source: string | null; detail: string; }

async function fetchHolders(address: string, det: TokenDetected, timeoutMs: number): Promise<HoldersResult> {
  if (det.family === 'solana' && process.env.SOLSCAN_API_KEY) {
    try {
      const r = await fetch(`https://pro-api.solscan.io/v2.0/token/meta?address=${address}`, { headers: { token: process.env.SOLSCAN_API_KEY }, signal: AbortSignal.timeout(timeoutMs) });
      if (r.ok) { const d: any = await r.json(); const h = numOrNull(d?.data?.holder); if (h !== null) return { available: true, holder_count: h, source: 'solscan', detail: `${h} holders (Solscan)` }; }
    } catch { /* fall through to unavailable */ }
  }
  // EVM holder lists are gated behind paid explorer tiers — do NOT fabricate.
  return { available: false, holder_count: null, source: null, detail: det.family === 'evm' ? 'EVM holder distribution requires a paid explorer tier — not fetched (not fabricated)' : 'holder count source not configured' };
}

// ---------------------------------------------------------------------------
// Orchestration.
// ---------------------------------------------------------------------------
export interface GroundFetch { source: string; status: 'ok' | 'failed' | 'timeout'; latency_ms: number; detail: string; }
export interface TokenGrounding { detected: TokenDetected; coingecko: CgResult; dex: DexResult; contract: ContractResult; holders: HoldersResult; fetches: GroundFetch[]; }

// Short in-memory cache (per chain+address) to stay under CoinGecko/DexScreener free-tier limits.
const CACHE_TTL_MS = Number(process.env.TOKEN_PROFILE_CACHE_MS || 45000);
const cache = new Map<string, { at: number; data: TokenGrounding }>();

export async function groundToken(address: string, det: TokenDetected, timeoutMs: number): Promise<TokenGrounding> {
  const key = `${det.chain}:${address.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  const timed = async <T>(source: string, p: Promise<T>, okIf: (v: T) => boolean, detailOf: (v: T) => string): Promise<{ v: T; f: GroundFetch }> => {
    const t0 = Date.now();
    const v = await p;
    return { v, f: { source, status: okIf(v) ? 'ok' : 'failed', latency_ms: Date.now() - t0, detail: detailOf(v) } };
  };

  const onchainP = det.family === 'evm' ? contractEvm(address, det.chainId ?? 1, timeoutMs) : contractSolana(address, timeoutMs);
  const [cgT, dexT, conT, holT] = await Promise.all([
    timed('coingecko', fetchCoinGecko(address, det, Math.min(timeoutMs, 6000)), (v) => v.checked, (v) => v.detail),
    timed('dexscreener', fetchDexScreener(address, det, Math.min(timeoutMs, 6000)), (v) => v.checked, (v) => v.detail),
    timed('onchain_contract', onchainP.catch(() => emptyContract('on-chain fetch threw')), (v) => v.checked, (v) => v.detail),
    timed('holders', fetchHolders(address, det, Math.min(timeoutMs, 5000)), (v) => v.available, (v) => v.detail),
  ]);

  const data: TokenGrounding = { detected: det, coingecko: cgT.v, dex: dexT.v, contract: conT.v, holders: holT.v, fetches: [cgT.f, dexT.f, conT.f, holT.f] };
  cache.set(key, { at: Date.now(), data });
  return data;
}
