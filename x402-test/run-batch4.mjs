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

const tests = [
  // Web/domain tools
  { slug: "company-logo-api-a23fd0",          path: "/batch",        body: { domains: ["google.com"] } },
  { slug: "domain-age-api-02007a",             path: "/lookup",       body: { domain: "google.com" } },
  { slug: "broken-link-checker-api-05d00c",    path: "/check",        body: { url: "https://stripe.com" } },
  { slug: "website-speed-lite-api-a3e270",     path: "/score",        body: { url: "https://stripe.com" } },
  { slug: "domain-availability-api-073035",    path: "/batch",        body: { domains: ["example-xyz-unavail.com"] } },
  { slug: "sitemap-parser-api-636f07",         path: "/parse",        body: { url: "https://stripe.com/sitemap.xml" } },
  { slug: "mx-record-checker-api-c35596",      path: "/batch",        body: { domains: ["gmail.com"] } },
  { slug: "canonical-url-api-636389",          path: "/check",        body: { url: "https://stripe.com/docs" } },
  { slug: "spf-dkim-dmarc-checker-api-fa894b", path: "/check",        body: { domain: "google.com" } },
  { slug: "robots-txt-parser-api-8e2a86",      path: "/parse",        body: { url: "https://stripe.com" } },
  { slug: "email-reputation-api-6a9bd6",       path: "/score",        body: { email: "test@gmail.com" } },
  { slug: "disposable-email-detector-api-f61ca5", path: "/detect",    body: { email: "test@mailinator.com" } },
  { slug: "email-syntax-cleaner-api-1a1ab1",   path: "/clean",        body: { email: " Test@Gmail.com " } },
  { slug: "company-domain-finder-api-2d9266",  path: "/find-domain",  body: { company_name: "Stripe" } },
  { slug: "brand-color-extractor-api-22f0c3",  path: "/batch",        body: { domains: ["stripe.com"] } },
  { slug: "website-tech-stack-api-a58cf2",     path: "/detect",       body: { url: "https://stripe.com" } },
  { slug: "redirect-chain-api-6daa61",         path: "/trace",        body: { url: "https://stripe.com" } },
  { slug: "url-expander-api-6cd4ea",           path: "/expand",       body: { short_url: "https://bit.ly/3example" } },
  { slug: "http-header-inspector-api-4ab21e",  path: "/inspect",      body: { url: "https://stripe.com" } },
  { slug: "cookie-scanner-api-a40e3c",         path: "/scan",         body: { url: "https://stripe.com" } },
  { slug: "meta-tags-extractor-api-e8d998",    path: "/extract",      body: { url: "https://stripe.com" } },
  { slug: "open-graph-preview-api-067189",     path: "/preview",      body: { url: "https://stripe.com" } },
  { slug: "app-store-lookup-api-2ed26d",       path: "/lookup",       body: { app_name_or_id: "Spotify" } },
  { slug: "chrome-extension-lookup-api-33d1b7",path: "/lookup",       body: { extension_id_or_name: "uBlock Origin" } },
  { slug: "browser-compatibility-api-4a4331",  path: "/check",        body: { feature: "css-grid", browsers: ["chrome", "firefox", "safari"] } },
  { slug: "dns-propagation-api-c2eee5",        path: "/check",        body: { domain: "google.com", record_type: "A" } },
  { slug: "ssl-expiry-monitor-api-206cfc",     path: "/check",        body: { domain: "stripe.com" } },
  { slug: "tls-configuration-api-08d4b5",      path: "/analyze",      body: { domain: "stripe.com" } },
  { slug: "website-carbon-footprint-api-f182b8",path: "/estimate",    body: { url: "https://stripe.com" } },
  { slug: "accessibility-audit-lite-api-a8f1cd",path: "/audit",       body: { url: "https://stripe.com" } },
  { slug: "keyword-density-api-fd89f5",        path: "/analyze",      body: { text: "AI and machine learning are transforming how businesses operate. AI tools help automate repetitive tasks and improve efficiency." } },
  { slug: "serp-snippet-preview-api-2d9d34",   path: "/preview",      body: { url: "https://stripe.com" } },
  // Content/text tools
  { slug: "slug-generator-api-96e070",         path: "/generate",     body: { title: "How to Build a REST API with Node.js" } },
  { slug: "text-readability-score-api-03ab19", path: "/score",        body: { text: "The quick brown fox jumps over the lazy dog. Simple sentences are easy to read and understand by most people." } },
  { slug: "grammar-check-lite-api-451a02",     path: "/check",        body: { text: "This are a test sentence with some grammer errors in it." } },
  { slug: "hashtag-generator-api-82039f",      path: "/generate",     body: { topic: "AI startup launch", platform: "twitter" } },
  { slug: "emoji-sentiment-api-f10512",        path: "/analyze",      body: { text: "I love this product! 😊🎉 It is absolutely amazing! 💯" } },
  { slug: "caption-generator-api-796a17",      path: "/generate",     body: { topic: "product launch announcement", platform: "instagram" } },
  { slug: "cta-generator-api-038820",          path: "/generate",     body: { use_case: "SaaS landing page", goal: "free trial signup" } },
  { slug: "subject-line-scorer-api-0f6635",    path: "/score",        body: { subject: "Don't miss our biggest sale ever - 50% off everything today only!" } },
  // Utility/conversion
  { slug: "html-to-markdown-api-5bda8f",       path: "/convert",      body: { html: "<h1>Hello World</h1><p>This is a <strong>test</strong> paragraph with <em>formatting</em>.</p>" } },
  { slug: "markdown-cleaner-api-ca5b27",       path: "/clean",        body: { markdown: "# Title\n\n\n\n## Section\n\nSome    extra    spaces here.\n\n\n" } },
  { slug: "url-metadata-api-12f62f",           path: "/fetch",        body: { url: "https://stripe.com" } },
  // Financial
  { slug: "insider-trades-api-dff6d5",         path: "/lookup",       body: { ticker: "TSLA" } },
  { slug: "etf-holdings-api-57a551",           path: "/lookup",       body: { ticker: "QQQ" } },
  { slug: "thumbnail-analysis-api-bc6f8d",     path: "/analyze",      body: { image_url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg" } },
  // AI-enrichment / intelligence
  { slug: "executive-risk-api-e929c0",         path: "/assess",       body: { name: "Elon Musk", company: "Tesla" } },
  { slug: "founder-background-api-0806b6",     path: "/lookup",       body: { name: "Sam Altman", company: "OpenAI" } },
  { slug: "crm-contact-intelligence-api-ea1469",path: "/enrich",      body: { email: "tim@apple.com", company: "Apple" } },
  { slug: "decision-maker-fit-api-7c9541",     path: "/score",        body: { contact_name: "Jane Smith", company: "Microsoft", title: "VP Engineering" } },
  { slug: "virality-score-api-3dd2ef",         path: "/score",        body: { content: "OpenAI just released GPT-5 with 100x capability improvement. This changes everything!", platform: "twitter" } },
  // Crypto / onchain
  { slug: "wallet-balance-api-814f7d",         path: "/lookup",       body: { address: WALLET, chain: "ethereum" } },
  { slug: "wallet-balance-api-a406fc",         path: "/lookup",       body: { address: WALLET, chain: "base" } },
  { slug: "gas-fee-api-9ac144",                path: "/current",      body: { chain: "ethereum" } },
  { slug: "onchain-labeling-api-d20288",       path: "/label",        body: { address: WALLET, chain: "ethereum" } },
  { slug: "defi-pool-data-api-3bcdf1",         path: "/lookup",       body: { pool_address: "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640", chain: "ethereum" } },
  { slug: "token-risk-lite-api-737aac",        path: "/assess",       body: { contract_address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", chain: "ethereum" } },
  { slug: "token-metadata-api-1bb1fc",         path: "/lookup",       body: { contract_address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", chain: "ethereum" } },
  { slug: "blockchain-transaction-lookup-api-4d2a98", path: "/lookup", body: { tx_hash: "0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060", chain: "ethereum" } },
  { slug: "smart-contract-decoder-api-87d3f3", path: "/decode",       body: { contract_address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", chain: "ethereum" } },
  // Trends
  { slug: "trend-velocity-api-8ff328",         path: "/measure",      body: { topic: "artificial intelligence" } },
];

const results = { pass: [], fail: [], error: [] };
console.log(`Wallet: ${account.address}`);
console.log(`Running Batch 4: ${tests.length} new APIs...\n`);

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

console.log("\n=== BATCH 4 SUMMARY ===");
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
