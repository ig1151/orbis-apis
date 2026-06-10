import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

// Real on-chain data via the Etherscan V2 multichain API (one key, many EVM chains).
// Set ETHERSCAN_API_KEY on the host. No fabrication: unavailable data is returned as
// null with a data_note, never invented.
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';
const ETHERSCAN_V2 = 'https://api.etherscan.io/v2/api';

// chain alias → { id, symbol } (native decimals are 18 for all of these).
const CHAINS: Record<string, { id: number; symbol: string }> = {
  ethereum: { id: 1, symbol: 'ETH' }, eth: { id: 1, symbol: 'ETH' }, mainnet: { id: 1, symbol: 'ETH' },
  polygon: { id: 137, symbol: 'POL' }, matic: { id: 137, symbol: 'POL' },
  bsc: { id: 56, symbol: 'BNB' }, binance: { id: 56, symbol: 'BNB' }, bnb: { id: 56, symbol: 'BNB' },
  arbitrum: { id: 42161, symbol: 'ETH' }, arb: { id: 42161, symbol: 'ETH' },
  optimism: { id: 10, symbol: 'ETH' }, op: { id: 10, symbol: 'ETH' },
  base: { id: 8453, symbol: 'ETH' },
  avalanche: { id: 43114, symbol: 'AVAX' }, avax: { id: 43114, symbol: 'AVAX' },
};
const SUPPORTED = [...new Set(Object.keys(CHAINS))];

function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }
const now = () => new Date().toISOString();
const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;

function resolveChain(chain?: string) { return CHAINS[(chain || 'ethereum').toLowerCase()] || null; }
function chainName(chain?: string): string { return (chain || 'ethereum').toLowerCase(); }

// wei (decimal string) → human string with up to 6 dp, no fabricated precision.
function formatUnits(wei: string, decimals = 18): string {
  try {
    const neg = wei.startsWith('-');
    const v = BigInt(neg ? wei.slice(1) : wei);
    const base = BigInt(10) ** BigInt(decimals);
    const whole = v / base;
    const frac = v % base;
    const fracStr = frac.toString().padStart(decimals, '0').slice(0, 6).replace(/0+$/, '');
    return (neg ? '-' : '') + whole.toString() + (fracStr ? '.' + fracStr : '');
  } catch { return '0'; }
}
function toNumberEther(wei: string, decimals = 18): number {
  try { return Number(BigInt(wei)) / Math.pow(10, decimals); } catch { return 0; }
}

// Hardened Etherscan call: 15s timeout + bounded retry on 429/5xx/timeout/rate-limit.
async function etherscan(chainId: number, params: Record<string, string>): Promise<any> {
  const MAX_RETRIES = 2;
  let lastErr: any;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await axios.get(ETHERSCAN_V2, {
        params: { chainid: chainId, ...params, apikey: ETHERSCAN_API_KEY },
        timeout: 15000,
      });
      const d = res.data;
      // Etherscan signals soft errors with status:"0"; rate-limit is retryable.
      if (d && d.status === '0' && typeof d.result === 'string' && /rate limit|max .*rate/i.test(d.result)) {
        if (attempt < MAX_RETRIES) { await new Promise(r => setTimeout(r, 600 * (attempt + 1))); continue; }
      }
      return d;
    } catch (e: any) {
      lastErr = e;
      const status = e?.response?.status;
      const retryable = !status || status === 429 || status >= 500 || e?.code === 'ECONNABORTED';
      if (attempt < MAX_RETRIES && retryable) { await new Promise(r => setTimeout(r, 600 * (attempt + 1))); continue; }
      throw e;
    }
  }
  throw lastErr;
}

async function getNativeBalanceWei(chainId: number, address: string): Promise<string> {
  const d = await etherscan(chainId, { module: 'account', action: 'balance', address, tag: 'latest' });
  if (d?.status === '1' && typeof d.result === 'string') return d.result;
  if (d?.result === '0') return '0'; // valid zero balance
  throw new Error(`Etherscan balance error: ${d?.result || d?.message || 'unknown'}`);
}

// USD price for the native asset — only Ethereum's ethprice is authoritative here.
async function getEthUsd(chainId: number): Promise<number | null> {
  if (chainId !== 1) return null;
  try {
    const d = await etherscan(1, { module: 'stats', action: 'ethprice' });
    const p = d?.result?.ethusd;
    return p ? Number(p) : null;
  } catch { return null; }
}

async function getIsContract(chainId: number, address: string): Promise<boolean | null> {
  try {
    const d = await etherscan(chainId, { module: 'proxy', action: 'eth_getCode', address, tag: 'latest' });
    if (typeof d?.result === 'string') return d.result !== '0x' && d.result !== '0x0' && d.result.length > 2;
    return null;
  } catch { return null; }
}

// Recent normal transactions (for last-activity + history).
async function getRecentTxs(chainId: number, address: string, limit: number): Promise<any[]> {
  try {
    const d = await etherscan(chainId, { module: 'account', action: 'txlist', address, page: '1', offset: String(Math.min(Math.max(limit, 1), 50)), sort: 'desc' });
    return Array.isArray(d?.result) ? d.result : [];
  } catch { return []; }
}

// ---- envelope ---------------------------------------------------------------
function provenance(freshness = 1.0) { return { provider: 'etherscan', retrieved_at: now(), freshness_score: freshness }; }
function configError(res: Response) {
  return res.status(200).json({
    trace_id: traceId(), computed_at: now(), success: false,
    error: 'not_configured', detail: 'ETHERSCAN_API_KEY is not set on the server.', retryable: false,
    source_provenance: { provider: 'system', retrieved_at: now(), freshness_score: 1.0 },
    privacy: { data_stored: false, retention: 'none' },
  });
}
function upstreamError(res: Response, e: any) {
  return res.status(200).json({
    trace_id: traceId(), computed_at: now(), success: false,
    error: 'upstream_unavailable', detail: e instanceof Error ? e.message : 'Unknown', retryable: true,
    source_provenance: provenance(0), privacy: { data_stored: false, retention: 'none' },
  });
}
function badChain(res: Response, chain?: string) {
  return res.status(200).json({
    trace_id: traceId(), computed_at: now(), success: false,
    error: 'unsupported_chain', detail: `Chain "${chain}" not supported. Supported: ${SUPPORTED.join(', ')}.`, retryable: false,
    source_provenance: { provider: 'system', retrieved_at: now(), freshness_score: 1.0 },
    privacy: { data_stored: false, retention: 'none' },
  });
}
// Shared guards: returns the resolved chain, or null after writing the proper 200/400 response.
function guard(req: Request, res: Response): { id: number; symbol: string } | null {
  const { address } = req.body;
  if (!address) { res.status(400).json({ error: 'address is required' }); return null; }
  if (!ADDR_RE.test(String(address))) { res.status(400).json({ error: 'address must be a 0x-prefixed 40-hex EVM address' }); return null; }
  if (!ETHERSCAN_API_KEY) { configError(res); return null; }
  const c = resolveChain(req.body.chain);
  if (!c) { badChain(res, req.body.chain); return null; }
  return c;
}

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Wallet Balance API', info: '/wallet-balance/info', openapi: '/wallet-balance/openapi.json', health: 'ok' });
});

// ---- /lookup ----------------------------------------------------------------
router.post('/lookup', async (req: Request, res: Response) => {
  const c = guard(req, res); if (!c) return;
  const { address, chain } = req.body;
  try {
    const [wei, ethUsd, isContract, txs] = await Promise.all([
      getNativeBalanceWei(c.id, address), getEthUsd(c.id), getIsContract(c.id, address), getRecentTxs(c.id, address, 1),
    ]);
    const nativeNum = toNumberEther(wei);
    const usd = ethUsd != null ? Math.round(nativeNum * ethUsd * 100) / 100 : null;
    const lastTs = txs[0]?.timeStamp ? new Date(Number(txs[0].timeStamp) * 1000).toISOString() : 'none';
    const data_notes: string[] = [];
    if (usd === null) data_notes.push(`USD value not available for ${c.symbol} on this chain (native USD pricing is provided for Ethereum only).`);
    data_notes.push('token_count/nft_count require an indexer (not on the Etherscan free tier); returned as null rather than estimated.');
    res.json({
      trace_id: traceId(), computed_at: now(), success: true,
      address, chain: chainName(chain), native_symbol: c.symbol,
      native_balance: formatUnits(wei), native_balance_usd: usd,
      token_count: null, nft_count: null, last_activity: lastTs, is_contract: isContract, data_notes,
      source_provenance: provenance(1.0), cache_ttl_seconds: 30, cache_recommended: true,
      recommended_next_api: 'wallet-balance', recommended_next_endpoint: '/portfolio',
      automation_safe: true, confidence_per_section: { balance: 1.0 },
      recommended_actions_priority_order: ['check portfolio', 'assess risk', 'monitor activity'],
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { upstreamError(res, e); }
});

// ---- /portfolio -------------------------------------------------------------
router.post('/portfolio', async (req: Request, res: Response) => {
  const c = guard(req, res); if (!c) return;
  const { address, chain } = req.body;
  try {
    const [wei, ethUsd] = await Promise.all([getNativeBalanceWei(c.id, address), getEthUsd(c.id)]);
    const nativeNum = toNumberEther(wei);
    const nativeUsd = ethUsd != null ? Math.round(nativeNum * ethUsd * 100) / 100 : null;
    const tokens = [{
      symbol: c.symbol, name: c.symbol, contract: 'native', balance: formatUnits(wei),
      balance_usd: nativeUsd, price_usd: ethUsd, price_change_24h_pct: null, weight_pct: nativeUsd != null ? 100 : null,
    }];
    res.json({
      trace_id: traceId(), computed_at: now(), success: true,
      address, chain: chainName(chain),
      tokens, total_value_usd: nativeUsd, defi_value_usd: null, nft_floor_value_usd: null,
      data_notes: ['Only the native asset is listed; ERC-20/DeFi/NFT enumeration requires an indexer (Etherscan free tier has no full token list). Values are real on-chain data, not estimated.'],
      source_provenance: provenance(1.0), cache_ttl_seconds: 30, cache_recommended: true,
      recommended_next_api: 'wallet-balance', recommended_next_endpoint: '/net-worth',
      automation_safe: true, confidence_per_section: { portfolio: nativeUsd != null ? 1.0 : 0.6 },
      recommended_actions_priority_order: ['calculate net worth', 'assess diversification', 'monitor high-value positions'],
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { upstreamError(res, e); }
});

// ---- /history (real recent transactions, not invented balance snapshots) ----
router.post('/history', async (req: Request, res: Response) => {
  const c = guard(req, res); if (!c) return;
  const { address, chain, limit } = req.body;
  try {
    const txs = await getRecentTxs(c.id, address, Number(limit) || 10);
    const history = txs.map((t: any) => ({
      date: t.timeStamp ? new Date(Number(t.timeStamp) * 1000).toISOString() : null,
      tx_hash: t.hash,
      direction: t.from?.toLowerCase() === String(address).toLowerCase() ? 'out' : 'in',
      value_native: formatUnits(t.value || '0'),
      counterparty: t.from?.toLowerCase() === String(address).toLowerCase() ? t.to : t.from,
      method: t.functionName || (t.input && t.input !== '0x' ? 'contract_call' : 'transfer'),
    }));
    const activeDays = new Set(txs.map((t: any) => t.timeStamp ? new Date(Number(t.timeStamp) * 1000).toISOString().slice(0, 10) : '')).size;
    res.json({
      trace_id: traceId(), computed_at: now(), success: true,
      address, chain: chainName(chain),
      history, tx_count_returned: history.length, active_days: activeDays,
      peak_value_usd: null, current_vs_peak_pct: null,
      data_notes: ['History is the real recent transaction list. Historical balance snapshots / peak value require a time-series indexer and are returned as null rather than estimated.'],
      source_provenance: provenance(1.0), cache_ttl_seconds: 60, cache_recommended: true,
      recommended_next_api: 'wallet-balance', recommended_next_endpoint: '/wallet-intelligence',
      automation_safe: true, confidence_per_section: { history: 1.0 },
      recommended_actions_priority_order: ['analyze recent activity', 'identify counterparties', 'monitor inflows/outflows'],
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { upstreamError(res, e); }
});

// ---- /execution-gate (deterministic) ----------------------------------------
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { address, objective } = req.body;
  if (!address) return res.status(400).json({ error: 'address is required' });
  const validAddr = ADDR_RE.test(String(address));
  res.json({
    trace_id: traceId(), computed_at: now(), success: true,
    execution_ready: validAddr && !!ETHERSCAN_API_KEY, objective: objective || 'wallet_balance_check',
    next_api: 'wallet-balance', next_endpoint: '/lookup',
    blocking_flags: [...(!validAddr ? ['INVALID_ADDRESS'] : []), ...(!ETHERSCAN_API_KEY ? ['PROVIDER_NOT_CONFIGURED'] : [])],
    flag_definitions: { INVALID_ADDRESS: 'address must be a 0x EVM address', PROVIDER_NOT_CONFIGURED: 'ETHERSCAN_API_KEY not set' },
    source_provenance: { provider: 'system', retrieved_at: now(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'wallet-balance', recommended_next_endpoint: '/lookup',
    automation_safe: true, confidence_per_section: { execution_ready: 1.0 },
    recommended_actions_priority_order: ['Check balance', 'View portfolio', 'Estimate net worth'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// ---- /wallet-intelligence ---------------------------------------------------
router.post('/wallet-intelligence', async (req: Request, res: Response) => {
  const c = guard(req, res); if (!c) return;
  const { address, chain } = req.body;
  try {
    const [wei, ethUsd, isContract, txs] = await Promise.all([
      getNativeBalanceWei(c.id, address), getEthUsd(c.id), getIsContract(c.id, address), getRecentTxs(c.id, address, 50),
    ]);
    const nativeNum = toNumberEther(wei);
    const usd = ethUsd != null ? Math.round(nativeNum * ethUsd * 100) / 100 : null;
    const wallet_type = usd != null
      ? (usd >= 10_000_000 ? 'whale' : usd >= 1_000_000 ? 'high_value' : usd >= 50_000 ? 'mid_tier' : usd > 0 ? 'retail' : 'empty')
      : (nativeNum >= 1000 ? 'high_balance' : nativeNum > 0 ? 'active' : 'empty');
    const lastTs = txs[0]?.timeStamp ? Number(txs[0].timeStamp) * 1000 : 0;
    const daysSince = lastTs ? Math.floor((Date.now() - lastTs) / 86400000) : null;
    const activity_pattern = daysSince == null ? 'unknown' : daysSince <= 7 ? 'active' : daysSince <= 90 ? 'moderate' : 'dormant';
    res.json({
      trace_id: traceId(), computed_at: now(), success: true,
      address, chain: chainName(chain), native_symbol: c.symbol,
      native_balance: formatUnits(wei), total_value_usd: usd,
      token_count: null, nft_count: null, defi_positions: null,
      wallet_type, risk_profile: null, activity_pattern, is_contract: isContract, recent_tx_count: txs.length,
      last_activity: lastTs ? new Date(lastTs).toISOString() : 'none', days_since_last_activity: daysSince, notable_holdings: [],
      data_notes: ['Classification derived from real native balance + transaction recency. Token/NFT/DeFi holdings and risk_profile require an indexer and are null, not estimated.'],
      source_provenance: provenance(1.0), cache_ttl_seconds: 30, cache_recommended: true,
      recommended_next_api: 'address-risk', recommended_next_endpoint: '/assess',
      automation_safe: true, confidence_per_section: { balance: 1.0, classification: usd != null ? 0.9 : 0.6 },
      recommended_actions_priority_order: ['assess risk profile', 'review recent activity', 'monitor balance'],
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { upstreamError(res, e); }
});

// ---- /net-worth -------------------------------------------------------------
router.post('/net-worth', async (req: Request, res: Response) => {
  const c = guard(req, res); if (!c) return;
  const { address, chain } = req.body;
  try {
    const [wei, ethUsd] = await Promise.all([getNativeBalanceWei(c.id, address), getEthUsd(c.id)]);
    const nativeNum = toNumberEther(wei);
    const nativeUsd = ethUsd != null ? Math.round(nativeNum * ethUsd * 100) / 100 : null;
    res.json({
      trace_id: traceId(), computed_at: now(), success: true,
      address, chain: chainName(chain), net_worth_usd: nativeUsd,
      breakdown: { native_usd: nativeUsd, liquid_tokens_usd: null, defi_positions_usd: null, nft_floor_value_usd: null, staked_usd: null },
      largest_position: nativeUsd != null ? { asset: c.symbol, value_usd: nativeUsd, weight_pct: 100 } : null,
      portfolio_concentration: 'native_only',
      data_notes: ['Net worth covers the native asset only (real on-chain). Tokens/DeFi/NFTs require an indexer and are null, not estimated — this is a lower bound, not a full net worth.'],
      source_provenance: provenance(1.0), cache_ttl_seconds: 30, cache_recommended: true,
      recommended_next_api: 'wallet-balance', recommended_next_endpoint: '/wallet-intelligence',
      automation_safe: true, confidence_per_section: { net_worth: nativeUsd != null ? 0.7 : 0.5 },
      recommended_actions_priority_order: ['treat as lower bound', 'add a token indexer for full value', 'set portfolio alerts'],
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { upstreamError(res, e); }
});

// ---- /batch -----------------------------------------------------------------
router.post('/batch', async (req: Request, res: Response) => {
  const { addresses } = req.body;
  if (!Array.isArray(addresses) || addresses.length === 0) return res.status(400).json({ error: 'addresses array is required' });
  if (addresses.length > 5) return res.status(400).json({ error: 'Maximum 5 addresses per batch' });
  if (!ETHERSCAN_API_KEY) return configError(res);
  const results = await Promise.all(addresses.map(async (a: { address: string; chain?: string }) => {
    if (!a?.address || !ADDR_RE.test(String(a.address))) return { address: a?.address, success: false, error: 'invalid_address' };
    const c = resolveChain(a.chain);
    if (!c) return { address: a.address, success: false, error: 'unsupported_chain' };
    try {
      const [wei, ethUsd] = await Promise.all([getNativeBalanceWei(c.id, a.address), getEthUsd(c.id)]);
      const nativeNum = toNumberEther(wei);
      return {
        address: a.address, chain: chainName(a.chain), native_symbol: c.symbol,
        native_balance: formatUnits(wei),
        native_balance_usd: ethUsd != null ? Math.round(nativeNum * ethUsd * 100) / 100 : null,
        token_count: null, success: true,
      };
    } catch (e: any) { return { address: a.address, success: false, error: 'upstream_unavailable', detail: e?.message }; }
  }));
  res.json({
    trace_id: traceId(), computed_at: now(), success: true,
    batch_count: addresses.length, results,
    succeeded: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length,
    source_provenance: provenance(1.0), cache_ttl_seconds: 30, cache_recommended: true,
    recommended_next_api: 'wallet-balance', recommended_next_endpoint: '/wallet-intelligence',
    automation_safe: true, privacy: { data_stored: false, retention: 'none' },
  });
});

export default router;
