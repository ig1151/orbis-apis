
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { createWalletClient, http } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const privateKey = "0xb7a1e0a3b487ea55ef33bf02583a266a46061e1dcbecc21fb582d57dff72f470";
const account = privateKeyToAccount(privateKey);
const walletClient = createWalletClient({ account, chain: base, transport: http() });
const signer = { address: account.address, signTypedData: (msg) => walletClient.signTypedData(msg) };
const schemeClient = new ExactEvmScheme(signer);
const client = x402Client.fromConfig({ schemes: [{ network: "eip155:8453", client: schemeClient }] });
const fetch402 = wrapFetchWithPayment(fetch, client);

const PROXY = "https://orbisapi.com/proxy";

const tests = [
  { slug: "market-trigger-api-eacfff",       path: "/create",    body: { asset: "BTC", conditions: { min_confidence: 0.7 }, context: { market_signal: { signal: "buy" } } } },
  { slug: "market-webhook-api-0ddeec",        path: "/",          body: { url: "https://example.com/webhook", event_type: "market_signal", conditions: { asset: "BTC", min_confidence: 0.7 } } },
  { slug: "portfolio-rebalance-api-020cbc",   path: "/rebalance", body: { portfolio: [{ asset: "BTC", value: 50000 }, { asset: "ETH", value: 50000 }], strategy: "equal_weight", risk_tolerance: "medium" } },
  { slug: "strategy-execution-api-fa18ef",    path: "/execute",   body: { strategy: "trend_following", risk_tolerance: "medium", portfolio: [{ asset: "BTC", value: 10000, weight: 0.6 }, { asset: "ETH", value: 6667, weight: 0.4 }] } },
  { slug: "unified-decision-api-92b734",      path: "/",          body: { portfolio: [{ asset: "BTC", value: 50000 }, { asset: "ETH", value: 50000 }], risk_tolerance: "medium" } },
  { slug: "user-risk-api-593da1",             path: "/assess",    body: { ip: "8.8.8.8" } },
  { slug: "wallet-intelligence-api-446f3b",   path: "/analyze",   body: { address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" } },
];

const results = { pass: [], fail: [], error: [] };
console.log("Final x402 test on " + tests.length + " APIs...\n");

for (const test of tests) {
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
      console.log(`✅ ${test.slug.padEnd(45)} ${res.status}  ${ms}ms`);
    } else {
      const err = data.error || data.message || data.details || JSON.stringify(data).slice(0, 100);
      results.fail.push({ slug: test.slug, status: res.status, error: err });
      console.log(`❌ ${test.slug.padEnd(45)} ${res.status}  ${JSON.stringify(err).slice(0,80)}`);
    }
  } catch (e) {
    results.error.push({ slug: test.slug, error: e.message });
    console.log(`💀 ${test.slug.padEnd(45)} ERR  ${e.message.slice(0, 60)}`);
  }
}

console.log("\n=== SUMMARY ===");
console.log(`✅ Passing: ${results.pass.length}`);
console.log(`❌ Failing: ${results.fail.length}`);
console.log(`💀 Errors:  ${results.error.length}`);
if (results.fail.length) {
  console.log("\nFailed:");
  results.fail.forEach(f => console.log(`  ❌ ${f.slug} (${f.status}) — ${JSON.stringify(f.error).slice(0,100)}`));
}
