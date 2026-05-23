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

const PROXY  = "https://orbisapi.com/proxy";
const WALLET = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const USDC   = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

const tests = [
  // URL/domain-based — all use { input: "..." }
  { slug: "meta-tags-extractor-api-e8d998",     path: "/extract",   body: { input: "https://stripe.com" } },
  { slug: "open-graph-preview-api-067189",      path: "/preview",   body: { input: "https://stripe.com" } },
  { slug: "app-store-lookup-api-2ed26d",        path: "/lookup",    body: { input: "Spotify" } },
  { slug: "chrome-extension-lookup-api-33d1b7", path: "/lookup",    body: { input: "uBlock Origin" } },
  { slug: "browser-compatibility-api-4a4331",   path: "/check",     body: { input: "css-grid" } },
  { slug: "dns-propagation-api-c2eee5",         path: "/check",     body: { input: "google.com" } },
  { slug: "ssl-expiry-monitor-api-206cfc",      path: "/check",     body: { input: "stripe.com" } },
  { slug: "tls-configuration-api-08d4b5",       path: "/analyze",   body: { input: "stripe.com" } },
  { slug: "website-carbon-footprint-api-f182b8",path: "/estimate",  body: { input: "https://stripe.com" } },
  { slug: "accessibility-audit-lite-api-a8f1cd",path: "/audit",     body: { input: "https://stripe.com" } },
  { slug: "keyword-density-api-fd89f5",         path: "/analyze",   body: { input: "AI and machine learning are transforming how businesses operate. AI tools help automate tasks and improve efficiency across industries." } },
  { slug: "serp-snippet-preview-api-2d9d34",    path: "/preview",   body: { input: "https://stripe.com" } },
  // Text/content tools
  { slug: "slug-generator-api-96e070",          path: "/generate",  body: { input: "How to Build a REST API with Node.js" } },
  { slug: "text-readability-score-api-03ab19",  path: "/score",     body: { input: "The quick brown fox jumps over the lazy dog. Simple sentences are easy to read and understand by most people." } },
  { slug: "grammar-check-lite-api-451a02",      path: "/check",     body: { input: "This are a test sentence with some grammer errors in it." } },
  { slug: "hashtag-generator-api-82039f",       path: "/generate",  body: { input: "AI startup product launch" } },
  { slug: "emoji-sentiment-api-f10512",         path: "/analyze",   body: { input: "I love this product! 😊🎉 It is absolutely amazing! 💯" } },
  { slug: "caption-generator-api-796a17",       path: "/generate",  body: { input: "product launch announcement for a new AI tool" } },
  { slug: "cta-generator-api-038820",           path: "/generate",  body: { input: "SaaS landing page free trial signup" } },
  { slug: "subject-line-scorer-api-0f6635",     path: "/score",     body: { input: "Don't miss our biggest sale ever - 50% off everything today only!" } },
  // Intelligence/enrichment — specific field names
  { slug: "decision-maker-fit-api-7c9541",      path: "/score",     body: { name: "Jane Smith", company: "Microsoft", title: "VP Engineering" } },
  // Crypto/onchain — specific field names
  { slug: "token-risk-lite-api-737aac",         path: "/assess",    body: { address: USDC, chain: "ethereum" } },
  { slug: "token-metadata-api-1bb1fc",          path: "/lookup",    body: { address: USDC, chain: "ethereum" } },
  { slug: "smart-contract-decoder-api-87d3f3",  path: "/decode",    body: { address: USDC, chain: "ethereum" } },
];

const results = { pass: [], fail: [], error: [] };
console.log(`Wallet: ${account.address}`);
console.log(`Running Batch 4b: ${tests.length} fixed APIs...\n`);

for (const test of tests) {
  const url = `${PROXY}/${test.slug}${test.path}`;
  const start = Date.now();
  try {
    const fetchOpts = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(test.body) };
    const res = await fetch402(url, fetchOpts);
    const ms = Date.now() - start;
    let data = {};
    try { data = await res.json(); } catch {}
    const success = res.status >= 200 && res.status < 300 && data.success !== false;
    const body = JSON.stringify(data.error || data.message || data).slice(0, 100);
    if (success) {
      results.pass.push(test.slug);
      console.log(`✅ ${test.slug.padEnd(52)} ${res.status}  ${ms}ms`);
    } else {
      results.fail.push({ slug: test.slug, status: res.status, body });
      console.log(`❌ ${test.slug.padEnd(52)} ${res.status}  ${body}`);
    }
  } catch (e) {
    results.error.push({ slug: test.slug, error: e.message });
    console.log(`💀 ${test.slug.padEnd(52)} ERR  ${e.message.slice(0, 60)}`);
  }
}

console.log("\n=== BATCH 4b SUMMARY ===");
console.log(`✅ Passing: ${results.pass.length}`);
console.log(`❌ Failing: ${results.fail.length}`);
console.log(`💀 Errors:  ${results.error.length}`);
if (results.fail.length) {
  console.log("\nFailed:");
  results.fail.forEach(f => console.log(`  ❌ ${f.slug} (${f.status}) — ${f.body}`));
}
if (results.error.length) {
  console.log("\nErrors:");
  results.error.forEach(e => console.log(`  💀 ${e.slug} — ${e.error}`));
}
