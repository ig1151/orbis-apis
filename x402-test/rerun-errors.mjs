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

// Remaining failures only
const tests = [
  // ── 502 — CoinGecko upstream flaky (retry) ────────────────────────────────
  { slug: "token-price-feed-api-94e8e4",         path: "/price/bitcoin", body: null, method: "GET" },

  // ── 402 — Orbis x402 payment config issue ────────────────────────────────
  { slug: "wallet-balance-api-814f7d",           path: "/balance",    body: { address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", chain: "ethereum" } },

  // ── Not in Orbis marketplace (404 / body-unusable) ────────────────────────
  { slug: "maps-places-api-e15b12",              path: "/search",     body: { query: "coffee shops", location: "New York, NY" } },
  { slug: "sports-scores-api-854b8a",            path: "/live",       body: { sport: "basketball", league: "NBA" } },
  { slug: "x-twitter-post-lookup-api-cc55f3",    path: "/lookup",     body: { post_id: "1234567890" } },
  { slug: "sentiment-api-53dcab",                path: "/analyze",    body: { text: "This product is absolutely amazing!" } },
  { slug: "entity-extraction-api-d5f53c",        path: "/extract",    body: { text: "Elon Musk founded Tesla and SpaceX in California." } },
  { slug: "tokenomics-api-f2c5e2",               path: "/analyze",    body: { token: "ETH" } },
  { slug: "image-to-content-api-5c7f80",         path: "/workflow/start", body: { goal: "analyze image" } },
];

const results = { pass: [], fail: [], error: [] };
console.log(`Wallet: ${account.address}`);
console.log(`Rerunning ${tests.length} previously failed APIs...\n`);

for (const test of tests) {
  const url = `${PROXY}/${test.slug}${test.path}`;
  const start = Date.now();
  try {
    const method = test.method || "POST";
    const fetchOpts = { method, headers: { "Content-Type": "application/json" } };
    if (test.body !== null) fetchOpts.body = JSON.stringify(test.body);
    const res = await fetch402(url, fetchOpts);
    const ms = Date.now() - start;
    let data = {};
    try { data = await res.json(); } catch {}
    const success = res.status >= 200 && res.status < 300 && data.success !== false;
    const body = JSON.stringify(data.error || data.message || data).slice(0, 100);
    if (success) {
      results.pass.push(test.slug);
      console.log(`✅ ${test.slug.padEnd(50)} ${res.status}  ${ms}ms`);
    } else {
      results.fail.push({ slug: test.slug, status: res.status, body });
      console.log(`❌ ${test.slug.padEnd(50)} ${res.status}  ${body}`);
    }
  } catch (e) {
    const ms = Date.now() - start;
    results.error.push({ slug: test.slug, error: e.message });
    console.log(`💀 ${test.slug.padEnd(50)} ERR  ${e.message}`);
  }
}

console.log("\n=== RERUN SUMMARY ===");
console.log(`✅ Now passing: ${results.pass.length}`);
console.log(`❌ Still failing: ${results.fail.length}`);
console.log(`💀 Errors: ${results.error.length}`);
if (results.fail.length) {
  console.log("\nStill failed:");
  results.fail.forEach(f => console.log(`  ❌ ${f.slug} (${f.status}) — ${f.body}`));
}
if (results.error.length) {
  console.log("\nErrors:");
  results.error.forEach(e => console.log(`  💀 ${e.slug} — ${e.error}`));
}
