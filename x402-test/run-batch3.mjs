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
  { slug: "legal-contract-risk-api-fa4750",   path: "/analyze",    body: { contract_text: "This Agreement shall terminate upon 30 days written notice. The Contractor is liable for all damages arising from negligence." } },
  { slug: "context-compression-api-46c95b",   path: "/compress",   body: { content: "This is a long transcript from a sales call that needs to be compressed into a shorter summary while retaining the key points and action items discussed by the team.", content_type: "transcript" } },
  { slug: "fact-verification-api-fb64cd",     path: "/verify",     body: { content: "The Earth orbits the Sun at an average distance of 93 million miles.", content_type: "ai_output" } },
  { slug: "earnings-analyzer-api-322c11",     path: "/analyze",    body: { earnings_text: "Apple Inc Q1 2025 Results: Revenue $119.6B up 5% YoY. EPS $2.18 beating consensus of $2.09. iPhone revenue $69.1B. Services revenue $26.3B up 14%.", ticker: "AAPL", fiscal_period: "Q1 2025" } },
  { slug: "portfolio-risk-api-4cdcbe",        path: "/score",      body: { holdings: [{ ticker: "AAPL", weight: 0.3 }, { ticker: "BTC", weight: 0.7 }] } },
  { slug: "financial-news-monitor-api-5d4a1f",path: "/analyze",    body: { ticker: "AAPL" } },
  { slug: "vendor-ranking-api-0aaa50",        path: "/rank",       body: { vendors: ["AWS", "GCP", "Azure"], criteria: ["cost", "reliability"] } },
  { slug: "reddit-intelligence-api-43b968",   path: "/analyze",    body: { subreddit: "technology", query: "AI" } },
  { slug: "autonomous-negotiation-api-77346a",path: "/counteroffer",body: { initial_offer: 100000, target: 85000, context: "software license" } },
  { slug: "address-risk-api-296f15",          path: "/score",      body: { address: WALLET } },
  { slug: "company-enrichment-api-9daab8",    path: "/enrich",     body: { company: "OpenAI", domain: "openai.com" } },
  { slug: "risk-event-forecast-api-1cb246",   path: "/forecast",   body: { company: "Tesla", asset: "TSLA" } },
  { slug: "reputation-intelligence-api-34db35",path: "/score",     body: { brand: "Tesla", ticker: "TSLA" } },
  { slug: "job-posting-search-api-bff64b",    path: "/search",     body: { title: "Software Engineer", skills: ["Python", "AI", "Machine Learning"], location: "San Francisco" } },
  { slug: "qa-testing-api-9f659f",            path: "/generate",   body: { workflow: "user login flow", spec: "User enters email and password, clicks login, sees dashboard" } },
  { slug: "openapi-validator-api-427e3e",     path: "/validate",   body: { spec: { openapi: "3.0.0", info: { title: "Test API", version: "1.0.0" }, paths: { "/health": { get: { summary: "Health check", responses: { "200": { description: "OK" } } } } } } } },
  { slug: "linkedin-profile-api-ddb819",      path: "/analyze",    body: { linkedin_url: "https://www.linkedin.com/in/example" } },
  { slug: "knowledge-graph-api-bd4d52",       path: "/extract",    body: { text: "Elon Musk founded Tesla in 2003 and SpaceX in 2002. Tesla is based in Austin, Texas." } },
  { slug: "github-repo-stats-api-e697c1",     path: "/analyze",    body: { repo: "microsoft/vscode" } },
  { slug: "image-ocr-api-491c11",             path: "/extract",    body: { image_url: "https://example.com/invoice.jpg" } },
  { slug: "email-finder-api-fa5c01",          path: "/find",       body: { first_name: "John", last_name: "Smith", company: "OpenAI", domain: "openai.com" } },
  { slug: "economic-calendar-api-b05e61",     path: "/events",     body: { country: "US", days_ahead: 7 } },
  { slug: "due-diligence-api-2db2d6",         path: "/assess",     body: { company: "Stripe", domain: "stripe.com" } },
  { slug: "corporate-actions-api-2565fb",     path: "/splits",     body: { company: "Apple Inc" } },
  { slug: "website-screenshot-api-b7b558",    path: "/capture",    body: { url: "https://stripe.com" } },
  { slug: "stock-quote-api-59d5c7",           path: "/quote",      body: { ticker: "AAPL" } },
  { slug: "supply-chain-risk-api-01e56f",     path: "/assess",     body: { company: "Apple Inc", industry: "consumer electronics" } },
  { slug: "sec-filing-intelligence-api-2ee3bf",path: "/analyze",   body: { filing_text: "Apple Inc 10-K Annual Report 2024. Net sales $391.0B. Operating income $123.2B. Research and development $29.9B. Cash and equivalents $29.9B. Risk factors include supply chain concentration in Asia, foreign currency fluctuations, and competitive pressures in smartphone market." } },
  { slug: "sales-intelligence-api-8b43ec",    path: "/qualify",    body: { company: "Acme Corp", contact: "Jane Smith", title: "VP Engineering", budget: 50000 } },
];

const results = { pass: [], fail: [], error: [] };
console.log(`Wallet: ${account.address}`);
console.log(`Running Batch 3: ${tests.length} new APIs...\n`);

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
      console.log(`✅ ${test.slug.padEnd(50)} ${res.status}  ${ms}ms`);
    } else {
      results.fail.push({ slug: test.slug, status: res.status, body });
      console.log(`❌ ${test.slug.padEnd(50)} ${res.status}  ${body}`);
    }
  } catch (e) {
    results.error.push({ slug: test.slug, error: e.message });
    console.log(`💀 ${test.slug.padEnd(50)} ERR  ${e.message.slice(0, 60)}`);
  }
}

console.log("\n=== BATCH 3 SUMMARY ===");
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
