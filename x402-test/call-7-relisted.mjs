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

const PROXY    = "https://orbisapi.com/proxy";
const WALLET   = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const CONTRACT = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

const tests = [
  { slug: "ai-output-safety-api-d3b0f3",   path: "/v1/check",   body: { text: "This is a test output for safety validation." } },
  { slug: "token-trust-api-d1d13a",         path: "/v1/check",   body: { contract: CONTRACT, chain: "ethereum" } },
  { slug: "lead-enrichment-api-1cbaf3",     path: "/v1/enrich",  body: { email: "test@anthropic.com" } },
  { slug: "search-extract-api-f1caaf",      path: "/v1/search",  body: { query: "latest AI developments 2026", max_results: 3 } },
  { slug: "robots-txt-parser-api-bc08cf",   path: "/parse",      body: { input: "https://google.com/robots.txt" } },
  { slug: "ip-geolocation-api-b389b3",      path: "/lookup",     body: { ip: "8.8.8.8" } },
  { slug: "wallet-balance-api-df563c",      path: "/lookup",     body: { address: WALLET, chain: "ethereum" } },
];

const results = { pass: [], fail: [], error: [] };
console.log(`Wallet: ${account.address}`);
console.log(`Calling 7 relisted APIs via x402...\n`);

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
      const err = data.error || data.message || data.details || JSON.stringify(data).slice(0, 120);
      results.fail.push({ slug: test.slug, status: res.status, error: err });
      console.log(`❌ ${test.slug.padEnd(45)} ${res.status}  ${JSON.stringify(err).slice(0, 100)}`);
    }
  } catch (e) {
    results.error.push({ slug: test.slug, error: e.message });
    console.log(`💀 ${test.slug.padEnd(45)} ERR  ${e.message.slice(0, 80)}`);
  }
}

console.log("\n=== SUMMARY ===");
console.log(`✅ Pass:  ${results.pass.length}`);
console.log(`❌ Fail:  ${results.fail.length}`);
console.log(`💀 Error: ${results.error.length}`);
if (results.fail.length) {
  console.log("\nFailed:");
  results.fail.forEach(f => console.log(`  ❌ ${f.slug} (${f.status}) — ${JSON.stringify(f.error).slice(0, 120)}`));
}
if (results.error.length) {
  console.log("\nErrors:");
  results.error.forEach(f => console.log(`  💀 ${f.slug} — ${f.error.slice(0, 80)}`));
}
