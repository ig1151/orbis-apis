import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { createWalletClient, http } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) throw new Error("PRIVATE_KEY env var is required.");

const account = privateKeyToAccount(privateKey);
const walletClient = createWalletClient({ account, chain: base, transport: http() });
const signer = { address: account.address, signTypedData: (msg) => walletClient.signTypedData(msg) };
const schemeClient = new ExactEvmScheme(signer);
const client = x402Client.fromConfig({ schemes: [{ network: "eip155:8453", client: schemeClient }] });
const fetch402 = wrapFetchWithPayment(fetch, client);

const PROXY = "https://orbisapi.com/proxy";
const BAYC = "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D";

const tests = [
  // ── 402 price mismatches (retry — Orbis cache usually clears) ─────────────
  { slug: "fear-greed-index-api-e0755b",          path: "/current",       body: {} },
  { slug: "stablecoin-depeg-risk-api-e1a7a2",     path: "/check",         body: { symbol: "USDC" } },
  { slug: "top-movers-api-4a05c5",                path: "/gainers",       body: { limit: 5 } },
  { slug: "smart-money-flow-api-3bb343",          path: "/flows",         body: { chain: "ethereum", timeframe: "24h" } },
  { slug: "meme-coin-intelligence-api-d07159",    path: "/score",         body: { token: "PEPE", chain: "ethereum" } },
  { slug: "cross-exchange-arbitrage-api-6f66f2",  path: "/scan",          body: { token: "BTC" } },
  { slug: "market-dominance-api-db7411",          path: "/current",       body: {} },
  { slug: "borrowing-rates-api-4e8557",           path: "/rates",         body: { asset: "ETH", chain: "ethereum" } },
  { slug: "tvl-analytics-api-616ae3",             path: "/protocol",      body: { protocol: "aave" } },
  { slug: "honeypot-scanner-api-306e75",          path: "/scan",          body: { contract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", chain: "ethereum" } },
  { slug: "nft-collection-analytics-api-0c09f6",  path: "/collection",    body: { collection: "bayc", chain: "ethereum" } },
  { slug: "bollinger-band-alert-api-2240b8",      path: "/bands",         body: { symbol: "BTC", timeframe: "1d" } },
  { slug: "triangular-arbitrage-api-9eafbd",      path: "/scan",          body: { base_currency: "BTC", exchange: "binance" } },

  // ── 502 UPSTREAM_UNAVAILABLE (retry — Render cold start) ──────────────────
  { slug: "impermanent-loss-api-cc2b36",          path: "/calculate",     body: { token_a: "ETH", token_b: "USDC", entry_price_a: 2000, entry_price_b: 1, current_price_a: 2500, current_price_b: 1 } },
  { slug: "nft-floor-price-api-a82143",           path: "/floor",         body: { collection: "bayc", chain: "ethereum" } },
  { slug: "staking-rewards-api-96179c",           path: "/rates",         body: { symbol: "ETH" } },
  { slug: "token-holder-distribution-api-eef0f1", path: "/analyze",       body: { token: "ETH", chain: "ethereum" } },
  { slug: "ohlcv-candlestick-api-f1cfa1",         path: "/candles",       body: { symbol: "BTC", timeframe: "1h", limit: 24 } },
  { slug: "whale-entry-signal-api-1b8c23",        path: "/signals",       body: { token: "ETH", chain: "ethereum" } },
  { slug: "flash-loan-opportunity-api-54e664",    path: "/protocols",     body: { chain: "ethereum" } },
  { slug: "market-inefficiency-scanner-api-9e9fb0", path: "/scan",        body: { market: "crypto", timeframe: "5m" } },
  { slug: "nft-whale-tracker-api-435919",         path: "/movements",     method: "GET" },
  { slug: "nft-influencer-tracking-api-6d333b",   path: "/activity",      method: "GET" },

  // ── 400 missing params (fixed) ─────────────────────────────────────────────
  { slug: "nft-rarity-score-api-84b955",          path: `/score?contract=${BAYC}&tokenId=1234`, method: "GET" },
  { slug: "nft-sniper-alert-api-73806c",          path: "/listings?collection=bayc",            method: "GET" },
  { slug: "nft-volume-heatmap-api-35ba48",        path: "/collection?name=bayc",                method: "GET" },
  { slug: "nft-arbitrage-api-24207d",             path: "/opportunities?collection=bayc",       method: "GET" },
  { slug: "nft-arbitrage-api-e82297",             path: "/opportunities?collection=bayc",       method: "GET" },
];

const results = { pass: [], fail: [], error: [] };
console.log(`Wallet: ${account.address}`);
console.log(`Retrying ${tests.length} failed Tier 1-6 APIs...\n`);

for (const test of tests) {
  const url = `${PROXY}/${test.slug}${test.path}`;
  const method = test.method || "POST";
  const start = Date.now();
  try {
    const fetchOptions = { method, headers: { "Content-Type": "application/json" } };
    if (method !== "GET" && test.body && Object.keys(test.body).length > 0) fetchOptions.body = JSON.stringify(test.body);
    const res = await fetch402(url, fetchOptions);
    const ms = Date.now() - start;
    let data = {};
    try { data = await res.json(); } catch {}
    const success = res.status >= 200 && res.status < 300 && data.success !== false;
    if (success) {
      results.pass.push({ slug: test.slug, ms });
      console.log(`✅ ${test.slug.padEnd(55)} ${res.status}  ${ms}ms`);
    } else {
      const err = data.error || data.message || data.details || JSON.stringify(data).slice(0, 100);
      results.fail.push({ slug: test.slug, status: res.status, error: err });
      console.log(`❌ ${test.slug.padEnd(55)} ${res.status}  ${JSON.stringify(err).slice(0, 80)}`);
    }
  } catch (e) {
    results.error.push({ slug: test.slug, error: e.message });
    console.log(`💀 ${test.slug.padEnd(55)} ERR  ${e.message.slice(0, 60)}`);
  }
}

console.log("\n=== SUMMARY ===");
console.log(`✅ Pass:  ${results.pass.length}`);
console.log(`❌ Fail:  ${results.fail.length}`);
console.log(`💀 Error: ${results.error.length}`);
if (results.fail.length) {
  console.log("\nFailed:");
  results.fail.forEach(f => console.log(`  ❌ ${f.slug} (${f.status}) — ${JSON.stringify(f.error).slice(0, 100)}`));
}
