
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
  // ── Agent Infrastructure ──────────────────────────────────────────────────
  { slug: "agent-action-execution-api-7df4bf",                              path: "/execute",               body: { action_type: "research", parameters: { query: "test" } } },
  { slug: "agent-identity-trust-api-6276af",                                path: "/generate",              body: { label: "test-agent" } },
  { slug: "agent-memory-context-engine-dc2621",                             path: "/store",                 body: { content: "This is a test memory entry for validation purposes." } },
  { slug: "agent-skills-routing-api-878656",                                path: "/compose",               body: { task: "research a company" } },
  { slug: "agent-workflow-orchestration-api-10af32",                        path: "/create",                body: { name: "test-workflow", goal: "test", steps: [] } },
  { slug: "agent-output-safety-validation-api-a1d8a5",                     path: "/check",                 body: { text: "This is a test output for safety validation." } },
  { slug: "agent-trading-signal-opportunity-detection-api-9d3ca1",         path: "/scan-signals",          body: { symbols: ["BTC"] } },
  { slug: "agent-execution-orchestration-engine-a36284",                    path: "/next-action",           body: { context: "trading", state: {} } },
  { slug: "agent-company-intelligence-due-diligence-api-a705d7",           path: "/profile-company",       body: { company: "Anthropic" } },
  { slug: "agent-smart-contract-risk-due-diligence-api-c4549e",            path: "/scan-contract",         body: { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" } },
  { slug: "agent-cross-chain-execution-bridge-intelligence-api-700529",    path: "/compare-routes",        body: { fromChain: "ethereum", toChain: "base", fromToken: "USDC", toToken: "USDC", amount: "100" } },
  { slug: "agent-crypto-trigger-market-alert-api-cafda3",                  path: "/create-trigger",        body: { symbol: "BTC", condition_type: "price_above", threshold: 100000 } },
  { slug: "agent-defi-position-risk-liquidation-defense-api-7e96e6",       path: "/scan-position",         body: { wallet: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", protocol: "aave", chain: "ethereum" } },
  { slug: "agent-web-data-extraction-intelligence-api-1bb908",             path: "/scrape",                body: { url: "https://example.com" } },
  { slug: "agent-product-data-extraction-commerce-intelligence-api-dd156a",path: "/extract-product",       body: { url: "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html" } },
  { slug: "browser-task-execution-api-d8c3ef",                             path: "/run",                   body: { goal: "Summarize homepage", task_type: "visit_and_summarize", url: "https://example.com" } },
  { slug: "agent-intelligence-extraction-monitoring-api-bc70d5",           path: "/extract/invoice",       body: { text: "Invoice #123, $500 from Acme Corp" } },
  { slug: "agent-career-optimization-application-intelligence-api-c46067", path: "/analyze-resume",        body: { resume_text: "John Smith, Software Engineer with 5 years experience in Python and JavaScript." } },
  { slug: "agent-location-intelligence-geocoding-api-8de502",              path: "/geocode",               body: { address: "1600 Pennsylvania Ave NW, Washington DC" } },
  { slug: "agent-phone-intelligence-contact-verification-api-84ccf1",      path: "/score-phone",           body: { phone: "+14155552671" } },
  { slug: "agent-pdf-extraction-api-fead7d",                               path: "/extract-invoice",       body: { text: "Invoice #123, $500 from Acme Corp, due 2026-06-01" } },

  // ── Crypto & DeFi ─────────────────────────────────────────────────────────
  { slug: "market-signal-api-c2fb7d",                                       path: "/batch",                 body: { assets: ["BTC", "ETH"] } },
  { slug: "market-trigger-api-eacfff",                                      path: "/create",                body: { asset: "BTC", conditions: { min_confidence: 0.7 }, context: { market_signal: { signal: "buy" } } } },
  { slug: "market-webhook-api-0ddeec",                                      path: "/",                      body: { url: "https://example.com/webhook", event_type: "market_signal", conditions: { asset: "BTC", min_confidence: 0.7 } } },
  { slug: "on-chain-signal-api-ea2a21",                                     path: "/analyze",               body: { address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", chain: "ethereum" } },
  { slug: "portfolio-rebalance-api-020cbc",                                 path: "/rebalance",             body: { portfolio: [{ asset: "BTC", value: 50000 }, { asset: "ETH", value: 50000 }], strategy: "equal_weight", risk_tolerance: "medium" } },
  { slug: "strategy-execution-api-fa18ef",                                  path: "/execute",               body: { strategy: "trend_following", risk_tolerance: "medium", portfolio: [{ asset: "BTC", value: 10000, weight: 0.6 }, { asset: "ETH", value: 6667, weight: 0.4 }] } },
  { slug: "trust-api-2eaca2",                                               path: "/score",                 body: { wallet_address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" } },
  { slug: "unified-decision-api-92b734",                                    path: "/",                      body: { portfolio: [{ asset: "BTC", value: 50000 }, { asset: "ETH", value: 50000 }], risk_tolerance: "medium" } },
  { slug: "user-risk-api-593da1",                                           path: "/assess",                body: { ip: "8.8.8.8" } },
  { slug: "wallet-intelligence-api-446f3b",                                 path: "/analyze",               body: { address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" } },
  { slug: "decision-scorer-api-59e365",                                     path: "/score",                 body: { decision: "Buy BTC at current price", context: "market is bullish" } },
  { slug: "market-correlation-api-50ede4",                                  path: "/correlation",           body: { asset: "BTC", window: "30d" } },
  { slug: "yield-farming-api-69fdc7",                                       path: "/yields/top",            body: { limit: 5 } },
  { slug: "tokenomics-api-4e766b",                                          path: "/tokenomics",            body: { token: "bitcoin" } },
  { slug: "strategy-signal-api-473ec5",                                     path: "/?symbol=BTC",           method: "GET" },
  { slug: "derivatives-intelligence-api-02b6cf",                           path: "/intelligence",          body: { asset: "BTC" } },
  { slug: "token-trust-api-ac7fdc",                                         path: "/check",                 body: { contract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", chain: "ethereum" } },
  { slug: "crypto-news-impact-api-d96978",                                  path: "/analyze",               body: { asset: "BTC", articles: [{ title: "Bitcoin reaches all-time high as institutional investors pour in." }] } },
  { slug: "derivatives-api-447d30",                                         path: "/options/summary/BTC",   method: "GET" },
  { slug: "liquidation-feed-api-468e93",                                    path: "/v1/liquidations/recent",method: "GET" },
  { slug: "market-stress-api-11f6a0",                                       path: "/v1/stress",             method: "GET" },
  { slug: "onchain-news-api-591f86",                                        path: "/news",                  body: { token: "BTC" } },
  { slug: "token-price-feed-api-94e8e4",                                    path: "/price",                 body: { coinId: "bitcoin" } },
  { slug: "wallet-reputation-api-473b01",                                   path: "/score",                 body: { address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" } },
  { slug: "tx-simulator-api-44fe99",                                        path: "/simulate?from=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045&to=0x742d35Cc6634C0532925a3b844Bc454e4438f44e&value=1000000000000000", method: "GET" },
  { slug: "wallet-api-5f3267",                                              path: "/balance/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", method: "GET" },
  { slug: "wallet-balance-api-5575de",                                      path: "/balance/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", method: "GET" },
  { slug: "nft-metadata-api-0c88fb",                                        path: "/token/0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D/1", method: "GET" },
  { slug: "ens-resolver-api-e6922d",                                        path: "/resolve?ens=vitalik.eth", method: "GET" },
  // ── Identity & Security ───────────────────────────────────────────────────
  { slug: "identity-intelligence-api-640f76",                               path: "/",                      body: { email: "test@example.com" } },
  { slug: "ip-intelligence-api-840be3",                                     path: "/?ip=8.8.8.8",           method: "GET" },

  // ── Data, Leads & Sales ───────────────────────────────────────────────────
  { slug: "lead-discovery-api-910c21",                                      path: "/leads/find",            body: { query: "SaaS companies in San Francisco" } },
  { slug: "lead-enrichment-api-0483c6",                                     path: "/",                      body: { domain: "anthropic.com" } },
  { slug: "lead-quality-api-38b19c",                                        path: "/score",                 body: { email: "test@example.com" } },
  { slug: "lead-scoring-api-a6e440",                                        path: "/score-lead",            body: { company_name: "Acme Corp", industry: "SaaS", company_size: "50-200", revenue: "$5M-$20M" } },
  { slug: "cold-outreach-api-9f54f6",                                       path: "/execution-gate",        body: { email_score: 75, spam_risk: "low", prospect_status: "active", has_email: true, do_not_contact: false } },
  { slug: "competitor-monitor-api-354088",                                  path: "/analyze-competitor",    body: { competitor_name: "OpenAI", industry: "AI", your_company: "Anthropic" } },
  { slug: "local-business-api-ff8abd",                                      path: "/analyze-business",      body: { business_name: "Downtown Coffee", location: "New York", category: "cafe" } },
  { slug: "serp-intelligence-api-f0fe1e",                                   path: "/analyze-serp",          body: { keyword: "AI tools", location: "US" } },
  { slug: "shopify-analyzer-api-e9d1ca",                                    path: "/analyze-store",         body: { store_url: "https://allbirds.com" } },
  { slug: "meeting-analyzer-api-c51ed8",                                    path: "/extract-action-items",  body: { transcript: "Alice: We need to finish the report by Friday. Bob: I will handle the data section. Alice: Great. Let us reconvene Monday." } },
  { slug: "crm-update-api-958cdd",                                          path: "/create-contact",        body: { name: "John Smith", email: "john@acme.com", company: "Acme Corp" } },
  { slug: "calendar-scheduling-api-067755",                                 path: "/find-slots",            body: { attendees: ["alice@example.com", "bob@example.com"], duration_minutes: 30, date_range: { start: "2026-05-12", end: "2026-05-16" }, timezone: "America/New_York" } },
  { slug: "workflow-orchestrator-api-d76499",                               path: "/execution-gate",        body: { workflow_context: "lead-to-deal", intended_workflow: "sales automation", resource_constraints: {} } },

  // ── AI Tools & Research ───────────────────────────────────────────────────
  { slug: "document-intelligence-api-6aeac3",                               path: "/",                      body: { document: "SW52b2ljZSAjMTIzLCAkNTAwIGZyb20gQWNtZSBDb3Jw" } },
  { slug: "image-generation-intelligence-2c054e",                           path: "/generate",              body: { prompt: "a red apple" } },
  { slug: "image-to-content-api-c6e356",                                    path: "/",                      body: { image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/240px-PNG_transparency_demonstration_1.png" } },
  { slug: "youtube-intelligence-api-8907c0",                                path: "/summarize",             body: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" } },
  { slug: "deep-research-api-732a5d",                                       path: "/extract-facts",         body: { content: "Artificial intelligence will transform industries by 2026 through automation and advanced reasoning." } },
  { slug: "website-monitor-api-4022bd",                                     path: "/",                      body: { url: "https://example.com" } },

  // ── Developer Utilities ───────────────────────────────────────────────────
  { slug: "dev-utilities-api-4e6ffb",                                       path: "/summarize",             body: { text: "This is a test sentence that is long enough to meet the minimum character requirement for summarization." } },

  // ── Finance & Validation ──────────────────────────────────────────────────
  { slug: "email-validation-api-204701",                                    path: "/validate",              body: { email: "test@example.com" } },
  { slug: "email-intelligence-api-d9801f",                                  path: "/verify",                body: { email: "test@example.com" } },
];

const results = { pass: [], fail: [], error: [] };
console.log(`Running full x402 execution test on ${tests.length} APIs...\n`);

for (const test of tests) {
  const url = `${PROXY}/${test.slug}${test.path}`;
  const method = test.method || "POST";
  const start = Date.now();
  try {
    const fetchOptions = {
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (method !== "GET" && test.body) {
      fetchOptions.body = JSON.stringify(test.body);
    }
    const res = await fetch402(url, fetchOptions);
    const ms = Date.now() - start;
    let data = {};
    try { data = await res.json(); } catch {}
    const success = res.status >= 200 && res.status < 300 && data.success !== false;
    if (success) {
      results.pass.push({ slug: test.slug, ms });
      console.log(`✅ ${test.slug.padEnd(65)} ${res.status}  ${ms}ms`);
    } else {
      const err = data.error || data.message || data.details || JSON.stringify(data).slice(0, 100);
      results.fail.push({ slug: test.slug, status: res.status, error: err });
      console.log(`❌ ${test.slug.padEnd(65)} ${res.status}  ${JSON.stringify(err).slice(0, 80)}`);
    }
  } catch (e) {
    results.error.push({ slug: test.slug, error: e.message });
    console.log(`💀 ${test.slug.padEnd(65)} ERR  ${e.message.slice(0, 60)}`);
  }
}

console.log("\n=== FINAL SUMMARY ===");
console.log(`✅ Passing: ${results.pass.length}`);
console.log(`❌ Failing: ${results.fail.length}`);
console.log(`💀 Errors:  ${results.error.length}`);
if (results.fail.length) {
  console.log("\nFailed:");
  results.fail.forEach(f => console.log(`  ❌ ${f.slug} (${f.status}) — ${JSON.stringify(f.error).slice(0, 100)}`));
}
if (results.error.length) {
  console.log("\nErrors:");
  results.error.forEach(f => console.log(`  💀 ${f.slug} — ${f.error.slice(0, 80)}`));
}
