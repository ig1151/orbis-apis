// Real-data grounding for the wallet-verdict aggregator.
//
// Two AUTHORITATIVE, non-LLM signals, fetched live for the supplied address:
//   1. OFAC sanctions — exact match against the U.S. Treasury OFAC SDN crypto-address
//      list (OFAC-derived dataset, refreshed daily, cached in memory). A real fact, not
//      an LLM guess. This is what makes the verdict's `is_sanctioned` defensible.
//   2. On-chain heuristics — native balance, sent-tx count, contract/EOA, first-seen age,
//      fetched from the chain itself: Etherscan V2 for ALL EVM chains (incl. BNB Chain),
//      Solana public RPC, or Blockstream for Bitcoin.
//
// A source that can't be reached is reported `checked:false` and is NEVER treated as clean.

export type ChainFamily = 'evm' | 'solana' | 'bitcoin';

// EVM chains covered by Etherscan V2 with a single ETHERSCAN_API_KEY (chainid switch).
const EVM_CHAINS: Record<string, number> = {
  ethereum: 1, eth: 1, mainnet: 1,
  bsc: 56, binance: 56, bnb: 56, 'bnb-chain': 56, 'binance-smart-chain': 56,
  polygon: 137, matic: 137,
  arbitrum: 42161, arb: 42161, 'arbitrum-one': 42161,
  optimism: 10, op: 10,
  base: 8453,
  avalanche: 43114, avax: 43114, 'avalanche-c': 43114,
  fantom: 250, ftm: 250,
  gnosis: 100, xdai: 100,
  celo: 42220,
  moonbeam: 1284,
  cronos: 25,
  linea: 59144,
  scroll: 534352,
  zksync: 324, 'zksync-era': 324,
  mantle: 5000,
  blast: 81457,
  sei: 1329,
  unichain: 130,
  'polygon-zkevm': 1101,
};
const NON_EVM: Record<string, ChainFamily> = {
  solana: 'solana', sol: 'solana',
  bitcoin: 'bitcoin', btc: 'bitcoin', xbt: 'bitcoin',
};

// Native symbol per EVM chainId (for balance display).
const EVM_SYMBOL: Record<number, string> = {
  1: 'ETH', 56: 'BNB', 137: 'POL', 42161: 'ETH', 10: 'ETH', 8453: 'ETH',
  43114: 'AVAX', 250: 'FTM', 100: 'xDAI', 42220: 'CELO', 1284: 'GLMR',
  25: 'CRO', 59144: 'ETH', 534352: 'ETH', 324: 'ETH', 5000: 'MNT',
  81457: 'ETH', 1329: 'SEI', 130: 'ETH', 1101: 'ETH',
};

const EVM_RE = /^0x[a-fA-F0-9]{40}$/;
const SOL_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const BTC_RE = /^(bc1[a-z0-9]{6,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,39})$/;

export const SUPPORTED_CHAINS = [...Object.keys(EVM_CHAINS), ...Object.keys(NON_EVM)];

export interface Detected { family: ChainFamily; chain: string; chainId?: number; }

// Resolve which chain/family an address belongs to. An explicit `chainHint` wins (and is
// validated against the address format); otherwise we infer from the address shape.
export function detectChain(address: string, chainHint?: string): Detected | { error: string } {
  const hint = (chainHint || '').trim().toLowerCase();
  if (hint) {
    if (hint in EVM_CHAINS) {
      if (!EVM_RE.test(address)) return { error: `chain "${chainHint}" is EVM but the address is not a 0x + 40-hex EVM address.` };
      return { family: 'evm', chain: hint, chainId: EVM_CHAINS[hint] };
    }
    if (hint in NON_EVM) {
      const fam = NON_EVM[hint];
      if (fam === 'solana' && !SOL_RE.test(address)) return { error: `chain "${chainHint}" is Solana but the address is not a base58 Solana address.` };
      if (fam === 'bitcoin' && !BTC_RE.test(address)) return { error: `chain "${chainHint}" is Bitcoin but the address is not a recognized BTC address.` };
      return { family: fam, chain: fam };
    }
    return { error: `Unsupported chain "${chainHint}". Supported: ${SUPPORTED_CHAINS.join(', ')}.` };
  }
  // Infer from format when no hint is given.
  if (EVM_RE.test(address)) return { family: 'evm', chain: 'ethereum', chainId: 1 };
  if (address.startsWith('bc1') && BTC_RE.test(address)) return { family: 'bitcoin', chain: 'bitcoin' };
  // Legacy BTC (starts 1/3, ≤34 chars) overlaps with base58 Solana; prefer BTC for the short legacy shape.
  if (/^[13]/.test(address) && address.length <= 34 && BTC_RE.test(address)) return { family: 'bitcoin', chain: 'bitcoin' };
  if (SOL_RE.test(address)) return { family: 'solana', chain: 'solana' };
  if (BTC_RE.test(address)) return { family: 'bitcoin', chain: 'bitcoin' };
  return { error: 'Address format not recognized (expected EVM 0x+40hex, Solana base58, or Bitcoin). Pass an explicit "chain" to disambiguate.' };
}

// ---------------------------------------------------------------------------
// OFAC sanctions list (cached in memory, daily refresh, lazy + warm-loaded).
// ---------------------------------------------------------------------------
const OFAC_BASE = 'https://raw.githubusercontent.com/0xB10C/ofac-sanctioned-digital-currency-addresses/lists';
const OFAC_EVM_CURRENCIES = ['ETH', 'BSC', 'ARB', 'ETC', 'USDT', 'USDC']; // all 0x-format
const OFAC_TTL_MS = 24 * 60 * 60 * 1000;

interface OfacCache { loadedAt: number; evm: Set<string>; sol: Set<string>; btc: Set<string>; total: number; ok: boolean; }
let ofacCache: OfacCache | null = null;
let ofacLoading: Promise<OfacCache> | null = null;

async function fetchOfacList(currency: string, timeoutMs: number): Promise<string[]> {
  const r = await fetch(`${OFAC_BASE}/sanctioned_addresses_${currency}.json`, { signal: AbortSignal.timeout(timeoutMs) });
  if (!r.ok) throw new Error(`OFAC ${currency} HTTP ${r.status}`);
  const arr = await r.json();
  return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
}

async function loadOfac(timeoutMs: number): Promise<OfacCache> {
  const evm = new Set<string>(), sol = new Set<string>(), btc = new Set<string>();
  let ok = true;
  const evmLists = await Promise.allSettled(OFAC_EVM_CURRENCIES.map((c) => fetchOfacList(c, timeoutMs)));
  for (const r of evmLists) { if (r.status === 'fulfilled') r.value.forEach((a) => evm.add(a.toLowerCase())); else ok = false; }
  const [solR, btcR] = await Promise.allSettled([fetchOfacList('SOL', timeoutMs), fetchOfacList('XBT', timeoutMs)]);
  if (solR.status === 'fulfilled') solR.value.forEach((a) => sol.add(a)); else ok = false;
  if (btcR.status === 'fulfilled') btcR.value.forEach((a) => btc.add(a)); else ok = false;
  const total = evm.size + sol.size + btc.size;
  return { loadedAt: Date.now(), evm, sol, btc, total, ok: ok && total > 0 };
}

async function getOfac(timeoutMs = 12000): Promise<OfacCache> {
  if (ofacCache && Date.now() - ofacCache.loadedAt < OFAC_TTL_MS) return ofacCache;
  if (!ofacLoading) {
    ofacLoading = loadOfac(timeoutMs)
      .then((c) => { if (c.ok) ofacCache = c; ofacLoading = null; return c; })
      .catch((e) => { ofacLoading = null; throw e; });
  }
  return ofacLoading;
}

// Warm the cache at import so the first paid request isn't slowed by the list download.
getOfac().catch(() => { /* first real request will retry */ });

export interface SanctionsResult { checked: boolean; listed: boolean; source: string; list_size: number | null; detail: string; }

export async function checkSanctions(address: string, family: ChainFamily, timeoutMs: number): Promise<SanctionsResult> {
  const source = 'OFAC SDN crypto-address list (treasury.gov, OFAC-derived)';
  try {
    const c = await getOfac(timeoutMs);
    if (!c.ok) return { checked: false, listed: false, source, list_size: null, detail: 'OFAC list unavailable right now — NOT treated as clear' };
    const set = family === 'solana' ? c.sol : family === 'bitcoin' ? c.btc : c.evm;
    const key = family === 'evm' ? address.toLowerCase() : address;
    const listed = set.has(key);
    return { checked: true, listed, source, list_size: c.total, detail: listed ? 'address IS on the OFAC SDN sanctions list' : 'no OFAC SDN match' };
  } catch (e: any) {
    return { checked: false, listed: false, source, list_size: null, detail: `OFAC check unavailable: ${String(e?.message ?? e).slice(0, 80)} — NOT treated as clear` };
  }
}

// ---------------------------------------------------------------------------
// On-chain heuristics.
// ---------------------------------------------------------------------------
export interface OnchainResult {
  checked: boolean;
  exists: boolean | null;
  is_contract: boolean | null;
  native_balance: number | null;
  native_symbol: string | null;
  tx_count: number | null;
  age_days: number | null;
  risk_score: number | null; // 0-100, CONSERVATIVE chain-only heuristic (OFAC is the decisive signal)
  flags: string[];
  provider: string;
  detail: string;
}

const ETHERSCAN_KEY = process.env.ETHERSCAN_API_KEY || '';
const ETHERSCAN_V2 = 'https://api.etherscan.io/v2/api';

const clamp01to100 = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

// Conservative chain-only risk heuristic. Chain history is weak evidence of risk on its own,
// so this stays in a narrow band; the decisive risk signal is OFAC + the upstream AML API.
// Uses balance/first-tx-age/transaction-history (always available) rather than depending on
// the sent-tx nonce (tx_count), which some provider tiers don't serve.
function heuristicRisk(o: { exists: boolean | null; tx_count: number | null; age_days: number | null; is_contract: boolean | null; has_history?: boolean }): { risk: number; flags: string[] } {
  const flags: string[] = [];
  let risk = 20; // neutral baseline for an address we only have thin chain data on
  const tx = o.tx_count ?? 0;
  const active = o.has_history === true || tx > 0;
  if (o.exists === false && !active) { flags.push('no_onchain_activity'); risk = 30; }
  if (o.age_days !== null && o.age_days < 7 && active) { flags.push('newly_active_wallet'); risk = Math.max(risk, 35); }
  if (o.age_days !== null && o.age_days > 365 && (active || tx > 50)) { flags.push('established_history'); risk = Math.min(risk, 12); }
  if (o.is_contract) flags.push('is_contract');
  return { risk: clamp01to100(risk), flags };
}

const isRateLimited = (j: any) => j?.status === '0' && /rate limit/i.test(String(j?.result ?? j?.message ?? ''));

async function etherscanV2(chainId: number, params: Record<string, string>, timeoutMs: number): Promise<any> {
  const qs = new URLSearchParams({ chainid: String(chainId), ...params, apikey: ETHERSCAN_KEY });
  const once = async () => {
    const r = await fetch(`${ETHERSCAN_V2}?${qs.toString()}`, { signal: AbortSignal.timeout(timeoutMs) });
    if (!r.ok) throw new Error(`etherscan HTTP ${r.status}`);
    return r.json();
  };
  let j = await once();
  // One backoff retry on the free-tier "Max rate limit reached" soft error.
  if (isRateLimited(j)) { await new Promise((res) => setTimeout(res, 280)); j = await once(); }
  return j;
}

// Calls share one Etherscan key (alongside the balance/reputation sub-APIs), so run them
// sequentially to stay under the free-tier rate limit rather than bursting in parallel.
async function onchainEvm(address: string, chainId: number, timeoutMs: number): Promise<OnchainResult> {
  const provider = 'etherscan-v2';
  const symbol = EVM_SYMBOL[chainId] ?? 'ETH';
  if (!ETHERSCAN_KEY) return { checked: false, exists: null, is_contract: null, native_balance: null, native_symbol: symbol, tx_count: null, age_days: null, risk_score: null, flags: [], provider, detail: 'ETHERSCAN_API_KEY not set on server' };
  const settle = async (p: Promise<any>): Promise<any | null> => { try { return await p; } catch { return null; } };
  const per = Math.min(timeoutMs, 6000);
  const balV = await settle(etherscanV2(chainId, { module: 'account', action: 'balance', address, tag: 'latest' }, per));
  const codeV = await settle(etherscanV2(chainId, { module: 'proxy', action: 'eth_getCode', address, tag: 'latest' }, per));
  const nonceV = await settle(etherscanV2(chainId, { module: 'proxy', action: 'eth_getTransactionCount', address, tag: 'latest' }, per));
  const txV = await settle(etherscanV2(chainId, { module: 'account', action: 'txlist', address, startblock: '0', endblock: '99999999', page: '1', offset: '1', sort: 'asc' }, per));
  // A bad/missing key returns status:0 + "Invalid API Key" on every call — report unavailable,
  // not a fake all-null result, and never mistake the error string for bytecode.
  const invalidKey = [balV, codeV, nonceV, txV].some((j) => typeof j?.result === 'string' && /invalid api key/i.test(j.result));
  if (invalidKey) return { checked: false, exists: null, is_contract: null, native_balance: null, native_symbol: symbol, tx_count: null, age_days: null, risk_score: null, flags: [], provider, detail: 'Etherscan API key invalid/not configured on server' };
  const hex = (v: any) => typeof v?.result === 'string' && v.result.startsWith('0x') ? v.result as string : null;
  let native_balance: number | null = null;
  if (balV?.status === '1' && typeof balV.result === 'string' && /^\d+$/.test(balV.result)) {
    try { native_balance = Number(BigInt(balV.result)) / 1e18; } catch { /* keep null */ }
  }
  const codeHex = hex(codeV);
  const is_contract: boolean | null = codeHex !== null ? codeHex !== '0x' && codeHex !== '0x0' : null;
  let age_days: number | null = null;
  let hasHistory = false;
  if (txV?.status === '1' && Array.isArray(txV.result) && txV.result.length > 0) {
    hasHistory = true;
    const ts = Number(txV.result[0]?.timeStamp);
    if (Number.isFinite(ts) && ts > 0) age_days = Math.round((Date.now() / 1000 - ts) / 86400);
  }
  let tx_count: number | null = null;
  const nonceHex = hex(nonceV);
  if (nonceHex !== null) { const n = parseInt(nonceHex, 16); if (Number.isFinite(n)) tx_count = n; }
  const exists = (native_balance !== null && native_balance > 0) || hasHistory || (tx_count !== null && tx_count > 0) || is_contract === true;
  const reachable = balV !== null || codeV !== null || txV !== null || nonceV !== null;
  if (!reachable) return { checked: false, exists: null, is_contract: null, native_balance: null, native_symbol: symbol, tx_count: null, age_days: null, risk_score: null, flags: [], provider, detail: 'all Etherscan calls failed' };
  const { risk, flags } = heuristicRisk({ exists, tx_count, age_days, is_contract, has_history: hasHistory });
  return { checked: true, exists, is_contract, native_balance: native_balance !== null ? Math.round(native_balance * 1e6) / 1e6 : null, native_symbol: symbol, tx_count, age_days, risk_score: risk, flags, provider, detail: `${symbol} balance ${native_balance ?? 'n/a'}, ${tx_count ?? '?'} tx, ${age_days !== null ? age_days + 'd old' : 'age n/a'}${is_contract ? ', contract' : ''}` };
}

const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
async function solanaRpc(method: string, params: unknown[], timeoutMs: number): Promise<any> {
  const r = await fetch(SOLANA_RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(timeoutMs) });
  if (!r.ok) throw new Error(`solana RPC HTTP ${r.status}`);
  const j: any = await r.json();
  if (j.error) throw new Error(`solana RPC ${j.error?.message ?? 'error'}`);
  return j.result;
}

async function onchainSolana(address: string, timeoutMs: number): Promise<OnchainResult> {
  const provider = 'solana-rpc';
  const [balR, accR, sigR] = await Promise.allSettled([
    solanaRpc('getBalance', [address], timeoutMs),
    solanaRpc('getAccountInfo', [address, { encoding: 'base64' }], timeoutMs),
    solanaRpc('getSignaturesForAddress', [address, { limit: 1000 }], timeoutMs),
  ]);
  const reachable = balR.status === 'fulfilled' || accR.status === 'fulfilled' || sigR.status === 'fulfilled';
  if (!reachable) return { checked: false, exists: null, is_contract: null, native_balance: null, native_symbol: 'SOL', tx_count: null, age_days: null, risk_score: null, flags: [], provider, detail: 'all Solana RPC calls failed' };
  let native_balance: number | null = null;
  if (balR.status === 'fulfilled' && typeof balR.value?.value === 'number') native_balance = balR.value.value / 1e9;
  let is_contract: boolean | null = null;
  let exists: boolean | null = null;
  if (accR.status === 'fulfilled') { const v = accR.value?.value; exists = v !== null && v !== undefined; is_contract = v?.executable === true; }
  const SIG_LIMIT = 1000;
  let tx_count: number | null = null;
  let age_days: number | null = null;
  if (sigR.status === 'fulfilled' && Array.isArray(sigR.value)) {
    tx_count = sigR.value.length; // recent signatures (capped at SIG_LIMIT)
    if (sigR.value.length > 0) {
      exists = true;
      // Only infer age when we've seen the FULL history (window not truncated); otherwise the
      // oldest-of-window is just a recent tx and would falsely mark a busy account as "new".
      if (sigR.value.length < SIG_LIMIT) { const oldest = sigR.value[sigR.value.length - 1]?.blockTime; if (Number.isFinite(oldest)) age_days = Math.round((Date.now() / 1000 - oldest) / 86400); }
    }
  }
  if ((native_balance ?? 0) > 0) exists = true;
  const { risk, flags } = heuristicRisk({ exists, tx_count, age_days, is_contract, has_history: (tx_count ?? 0) > 0 });
  return { checked: true, exists, is_contract, native_balance: native_balance !== null ? Math.round(native_balance * 1e6) / 1e6 : null, native_symbol: 'SOL', tx_count, age_days, risk_score: risk, flags, provider, detail: `SOL balance ${native_balance ?? 'n/a'}, ${tx_count ?? '?'} recent sigs${is_contract ? ', program account' : ''}` };
}

// Two interchangeable Esplora-compatible BTC explorers; fall back if the first rate-limits (429).
const BTC_EXPLORERS = ['https://blockstream.info/api', 'https://mempool.space/api'];
async function onchainBitcoin(address: string, timeoutMs: number): Promise<OnchainResult> {
  let lastErr = 'no explorer reachable';
  for (const base of BTC_EXPLORERS) {
    const provider = base.includes('mempool') ? 'mempool.space' : 'blockstream';
    try {
      const r = await fetch(`${base}/address/${address}`, { signal: AbortSignal.timeout(timeoutMs) });
      if (!r.ok) { lastErr = `${provider} HTTP ${r.status}`; continue; }
      const d: any = await r.json();
      const cs = d?.chain_stats ?? {};
      const funded = Number(cs.funded_txo_sum ?? 0), spent = Number(cs.spent_txo_sum ?? 0);
      const native_balance = (funded - spent) / 1e8;
      const tx_count = Number(cs.tx_count ?? 0);
      const exists = tx_count > 0 || funded > 0;
      const { risk, flags } = heuristicRisk({ exists, tx_count, age_days: null, is_contract: false, has_history: tx_count > 0 });
      return { checked: true, exists, is_contract: false, native_balance: Math.round(native_balance * 1e8) / 1e8, native_symbol: 'BTC', tx_count, age_days: null, risk_score: risk, flags, provider, detail: `BTC balance ${native_balance}, ${tx_count} tx` };
    } catch (e: any) { lastErr = `${provider}: ${String(e?.message ?? e).slice(0, 60)}`; }
  }
  return { checked: false, exists: null, is_contract: null, native_balance: null, native_symbol: 'BTC', tx_count: null, age_days: null, risk_score: null, flags: [], provider: 'blockstream/mempool', detail: `BTC explorer unavailable: ${lastErr}` };
}

export async function fetchOnchain(address: string, det: Detected, timeoutMs: number): Promise<OnchainResult> {
  if (det.family === 'evm') return onchainEvm(address, det.chainId ?? 1, timeoutMs);
  if (det.family === 'solana') return onchainSolana(address, timeoutMs);
  return onchainBitcoin(address, timeoutMs);
}

export interface GroundFetch { source: string; status: 'ok' | 'failed' | 'timeout'; latency_ms: number; detail: string; }
export interface Grounding {
  detected: Detected;
  sanctions: SanctionsResult;
  onchain: OnchainResult;
  fetches: GroundFetch[];
}

export async function groundAddress(address: string, det: Detected, timeoutMs: number): Promise<Grounding> {
  const tS = Date.now();
  const [sanctions, onchain] = await Promise.all([
    checkSanctions(address, det.family, Math.min(timeoutMs, 12000)),
    fetchOnchain(address, det, timeoutMs).catch((): OnchainResult => ({ checked: false, exists: null, is_contract: null, native_balance: null, native_symbol: null, tx_count: null, age_days: null, risk_score: null, flags: [], provider: 'unknown', detail: 'on-chain fetch threw' })),
  ]);
  const ms = Date.now() - tS;
  const fetches: GroundFetch[] = [
    { source: 'ofac_sanctions', status: sanctions.checked ? 'ok' : 'failed', latency_ms: ms, detail: sanctions.detail },
    { source: 'onchain', status: onchain.checked ? 'ok' : 'failed', latency_ms: ms, detail: onchain.detail },
  ];
  return { detected: det, sanctions, onchain, fetches };
}
