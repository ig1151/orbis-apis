// x402 calls for the APIs that currently have ZERO calls (2026-05-30 snapshot):
// the 11-API Crypto Risk & Execution Suite + stablecoin-arbitrage.
// Paths/bodies from the live OpenAPI specs. The 5 slowest APIs use their lighter
// single-purpose endpoint (not the combined /lookup) to stay under the x402
// proxy's gateway timeout.
//
// Usage: PRIVATE_KEY=0x... node call-zero-now.mjs
//   ONLY="slug1,slug2" to retry a subset (avoids re-paying successes).
//   Each call costs ~$0.008–0.025 USDC on Base.
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

// slug = marketplace slug (proxy key); path + body from the live spec.
const tests = [
  { slug: "liquidation-cascade-intelligence-api-cf3041", path: "/clusters",     body: { symbol: "BTC" } },
  { slug: "funding-basis-divergence-api-3a1c84",         path: "/rates",        body: { symbol: "BTC" } },
  { slug: "open-interest-intelligence-api-221cd4",       path: "/lookup",       body: { symbol: "BTC", timeframe: "24h" } },
  { slug: "orderbook-intelligence-api-928438",           path: "/lookup",       body: { symbol: "BTC", exchange: "binance", order_sizes_usd: [10000, 100000] } },
  { slug: "stop-hunt-detection-api-634463",              path: "/lookup",       body: { symbol: "BTC", timeframe: "1h" } },
  { slug: "ai-risk-manager-api-7201f3",                  path: "/trade",        body: { symbol: "BTC", side: "long", size_usd: 1000, leverage: 3, entry_price: 50000, stop_price: 48000 } },
  { slug: "position-sizing-intelligence-api-394b5b",     path: "/calculate",    body: { account_size_usd: 10000, risk_per_trade_pct: 1, entry_price: 50000, stop_price: 48000, win_rate_pct: 55, avg_win_loss_ratio: 1.5, volatility_pct: 3 } },
  { slug: "portfolio-hedging-intelligence-api-97d4cc",   path: "/analyze",      body: { positions: [{ symbol: "BTC", size_usd: 5000, side: "long" }, { symbol: "ETH", size_usd: 3000, side: "long" }] } },
  { slug: "trade-execution-timing-api-20f5c9",           path: "/window",       body: { symbol: "BTC", side: "buy", order_size_usd: 50000, horizon_hours: 24 } },
  { slug: "smart-money-rotation-api-54a664",             path: "/sectors",      body: { timeframe: "7d" } },
  { slug: "yield-farming-optimizer-api-a72810",          path: "/opportunities", body: { chains: ["ethereum"], asset: "USDC", min_apy_pct: 3, min_tvl_usd: 1000000 } },
  { slug: "stablecoin-arbitrage-api-af3174",             path: "/spreads",      body: { stablecoin: "USDC" } },
];

const only = process.env.ONLY ? new Set(process.env.ONLY.split(",")) : null;
const runList = only ? tests.filter((t) => only.has(t.slug)) : tests;

const results = { pass: [], fail: [], error: [] };
console.log(`Wallet: ${account.address}`);
console.log(`Calling ${runList.length} zero-call APIs via x402...\n`);

for (const test of runList) {
  const url = `${PROXY}/${test.slug}${test.path}`;
  const start = Date.now();
  try {
    const res = await fetch402(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(test.body),
    });
    const ms = Date.now() - start;
    let data = {};
    try { data = await res.json(); } catch {}
    const success = res.status >= 200 && res.status < 300 && data.success !== false;
    if (success) {
      results.pass.push({ slug: test.slug, ms });
      console.log(`✅ ${test.slug.padEnd(52)} ${res.status}  ${ms}ms`);
    } else {
      const err = data.error || data.message || data.details || JSON.stringify(data).slice(0, 100);
      results.fail.push({ slug: test.slug, status: res.status, error: err });
      console.log(`❌ ${test.slug.padEnd(52)} ${res.status}  ${JSON.stringify(err).slice(0, 80)}`);
    }
  } catch (e) {
    results.error.push({ slug: test.slug, error: e.message });
    console.log(`💀 ${test.slug.padEnd(52)} ERR  ${e.message.slice(0, 70)}`);
  }
}

console.log("\n=== SUMMARY ===");
console.log(`✅ Paid OK : ${results.pass.length}`);
console.log(`❌ Failed  : ${results.fail.length}`);
console.log(`💀 Errors  : ${results.error.length}`);
if (results.fail.length) for (const f of results.fail) console.log(`   ${f.slug} [${f.status}] ${JSON.stringify(f.error).slice(0,100)}`);
if (results.error.length) for (const e of results.error) console.log(`   ${e.slug} ${e.error.slice(0,100)}`);
