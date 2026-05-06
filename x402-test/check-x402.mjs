
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
  { slug: "agent-action-execution-api-7df4bf",                            path: "/execute",          body: { action_type: "research", parameters: { query: "test" } } },
  { slug: "agent-identity-trust-api-6276af",                              path: "/generate",         body: { label: "test-agent" } },
  { slug: "agent-memory-context-engine-dc2621",                           path: "/store",            body: { content: "This is a test memory entry for validation purposes." } },
  { slug: "agent-skills-routing-api-878656",                              path: "/compose",          body: { task: "research a company" } },
  { slug: "agent-workflow-orchestration-api-10af32",                      path: "/create",           body: { name: "test-workflow", goal: "test", steps: [] } },
  { slug: "agent-output-safety-validation-api-a1d8a5",                    path: "/check",            body: { text: "This is a test output for safety validation." } },
  { slug: "agent-trading-signal-opportunity-detection-api-9d3ca1",        path: "/scan-signals",     body: { symbols: ["BTC"] } },
  { slug: "agent-execution-orchestration-engine-a36284",                  path: "/next-action",      body: { context: "trading", state: {} } },
  { slug: "browser-task-execution-api-d8c3ef",                            path: "/run",              body: { goal: "Summarize homepage", task_type: "visit_and_summarize", url: "https://example.com" } },
  { slug: "agent-company-intelligence-due-diligence-api-a705d7",          path: "/profile-company",  body: { company: "Anthropic" } },
  { slug: "agent-smart-contract-risk-due-diligence-api-c4549e",           path: "/scan-contract",    body: { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" } },
  { slug: "agent-cross-chain-execution-bridge-intelligence-api-700529",   path: "/compare-routes",   body: { fromChain: "ethereum", toChain: "base", fromToken: "USDC", toToken: "USDC", amount: "100" } },
  { slug: "agent-crypto-trigger-market-alert-api-cafda3",                 path: "/create-trigger",   body: { symbol: "BTC", condition_type: "price_above", threshold: 100000 } },
  { slug: "decision-scorer-api-59e365",                                    path: "/score",            body: { decision: "Buy BTC at current price", context: "market is bullish" } },
  { slug: "agent-defi-position-risk-liquidation-defense-api-7e96e6",      path: "/scan-position",    body: { wallet: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", protocol: "aave", chain: "ethereum" } },
  { slug: "dev-utilities-api-4e6ffb",                                      path: "/summarize",        body: { text: "This is a test sentence that is long enough to meet the minimum character requirement for summarization." } },
  { slug: "document-intelligence-api-6aeac3",                              path: "/",                 body: { document: "SW52b2ljZSAjMTIzLCAkNTAwIGZyb20gQWNtZSBDb3Jw" } },
  { slug: "extraction-api-817a26",                                          path: "/extract/invoice",  body: { text: "Invoice #123, $500 from Acme Corp" } },
  { slug: "identity-intelligence-api-640f76",                               path: "/",                 body: { email: "test@example.com" } },
  { slug: "image-generation-intelligence-2c054e",                           path: "/generate",         body: { prompt: "a red apple" } },
  { slug: "image-to-content-api-c6e356",                                    path: "/",                 body: { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/240px-PNG_transparency_demonstration_1.png" } },
  { slug: "lead-discovery-api-910c21",                                      path: "/leads/find",       body: { query: "SaaS companies in San Francisco" } },
  { slug: "lead-enrichment-api-0483c6",                                     path: "/",                 body: { domain: "anthropic.com" } },
  { slug: "lead-quality-api-38b19c",                                         path: "/score",            body: { email: "test@example.com" } },
  { slug: "market-signal-api-c2fb7d",                                        path: "/batch",            body: { assets: ["BTC", "ETH"] } },
  { slug: "market-trigger-api-eacfff",                                       path: "/create",           body: { asset: "BTC", conditions: { min_confidence: 0.7 }, context: { market_signal: { signal: "buy" } } } },
  { slug: "market-webhook-api-0ddeec",                                       path: "/",                 body: { url: "https://example.com/webhook", event_type: "market_signal", conditions: { asset: "BTC", min_confidence: 0.7 } } },
  { slug: "on-chain-signal-api-ea2a21",                                      path: "/analyze",          body: { address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", chain: "ethereum" } },
  { slug: "portfolio-rebalance-api-020cbc",                                  path: "/rebalance",        body: { portfolio: [{ asset: "BTC", value: 50000 }, { asset: "ETH", value: 50000 }], strategy: "equal_weight", risk_tolerance: "medium" } },
  { slug: "agent-product-data-extraction-commerce-intelligence-api-dd156a", path: "/extract-product",  body: { url: "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html" } },
  { slug: "search-extract-api-41bcd1",                                       path: "/search",           body: { query: "latest AI news", intent: "research" } },
  { slug: "strategy-execution-api-fa18ef",                                   path: "/execute",          body: { strategy: "trend_following", risk_tolerance: "medium", portfolio: [{ asset: "BTC", value: 10000, weight: 0.6 }, { asset: "ETH", value: 6667, weight: 0.4 }] } },
  { slug: "text-extractor-api-de469e",                                       path: "/extract",          body: { text: "John Smith, CEO at Acme Corp, john@acme.com", schema: "name, title, email" } },
  { slug: "trust-api-2eaca2",                                                 path: "/score",            body: { wallet_address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" } },
  { slug: "unified-decision-api-92b734",                                      path: "/",                 body: { portfolio: [{ asset: "BTC", value: 50000 }, { asset: "ETH", value: 50000 }], risk_tolerance: "medium" } },
  { slug: "user-risk-api-593da1",                                             path: "/assess",           body: { ip: "8.8.8.8" } },
  { slug: "wallet-intelligence-api-446f3b",                                   path: "/analyze",          body: { address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" } },
  { slug: "agent-web-data-extraction-intelligence-api-1bb908",                path: "/scrape",           body: { url: "https://example.com" } },
  { slug: "website-monitor-api-4022bd",                                       path: "/",                 body: { url: "https://example.com" } },
];

const results = { pass: [], fail: [], error: [] };
console.log("Running full x402 execution test on " + tests.length + " APIs...\n");

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
      console.log(`✅ ${test.slug.padEnd(60)} ${res.status}  ${ms}ms`);
    } else {
      const err = data.error || data.message || data.details || JSON.stringify(data).slice(0, 100);
      results.fail.push({ slug: test.slug, status: res.status, error: err });
      console.log(`❌ ${test.slug.padEnd(60)} ${res.status}  ${JSON.stringify(err).slice(0,80)}`);
    }
  } catch (e) {
    results.error.push({ slug: test.slug, error: e.message });
    console.log(`💀 ${test.slug.padEnd(60)} ERR  ${e.message.slice(0, 60)}`);
  }
}

console.log("\n=== FINAL SUMMARY ===");
console.log(`✅ Passing: ${results.pass.length}`);
console.log(`❌ Failing: ${results.fail.length}`);
console.log(`💀 Errors:  ${results.error.length}`);
if (results.fail.length) {
  console.log("\nFailed:");
  results.fail.forEach(f => console.log(`  ❌ ${f.slug} (${f.status}) — ${JSON.stringify(f.error).slice(0,100)}`));
}
