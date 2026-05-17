import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { createWalletClient, http } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) throw new Error("PRIVATE_KEY env var is required. Set it before running.");

const account = privateKeyToAccount(privateKey);
const walletClient = createWalletClient({ account, chain: base, transport: http() });
const signer = { address: account.address, signTypedData: (msg) => walletClient.signTypedData(msg) };
const schemeClient = new ExactEvmScheme(signer);
const client = x402Client.fromConfig({ schemes: [{ network: "eip155:8453", client: schemeClient }] });
const fetch402 = wrapFetchWithPayment(fetch, client);

const PROXY    = "https://orbisapi.com/proxy";
const WALLET   = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const CONTRACT = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // USDC

const tests = [
  // ── Agent Infrastructure ──────────────────────────────────────────────────
  { slug: "agent-action-execution-api-7df4bf",                               path: "/execute",                        body: { action_type: "research", parameters: { query: "test" } } },
  { slug: "agent-identity-trust-api-6276af",                                 path: "/generate",                       body: { label: "test-agent" } },
  { slug: "agent-memory-api-717b41",                                         path: "/store",                          body: { content: "This is a test memory entry for validation purposes." } },
  { slug: "agent-skills-api-bb73e2",                                         path: "/match",                          body: { request: "research a company" } },
  { slug: "agent-workflow-api-28ee73",                                       path: "/workflow/start",                 body: { goal: "research competitors in the AI market", context: {} } },
  { slug: "ai-output-safety-api-1237d8",                                     path: "/check",                          body: { text: "This is a test output for safety validation." } },
  { slug: "agent-trading-signal-opportunity-detection-api-9d3ca1",          path: "/scan-signals",                   body: { symbols: ["BTC"] } },
  { slug: "agent-execution-orchestration-engine-a36284",                     path: "/next-action",                    body: { context: "trading", state: {} } },
  { slug: "agent-company-intelligence-due-diligence-api-a705d7",            path: "/profile-company",                body: { company: "Anthropic" } },
  { slug: "agent-smart-contract-risk-due-diligence-api-c4549e",             path: "/scan-contract",                  body: { address: CONTRACT } },
  { slug: "agent-cross-chain-execution-bridge-intelligence-api-700529",     path: "/compare-routes",                 body: { fromChain: "ethereum", toChain: "base", fromToken: "USDC", toToken: "USDC", amount: "100" } },
  { slug: "agent-crypto-trigger-market-alert-api-cafda3",                   path: "/create-trigger",                 body: { symbol: "BTC", condition_type: "price_above", threshold: 100000 } },
  { slug: "agent-defi-position-risk-liquidation-defense-api-7e96e6",        path: "/scan-position",                  body: { wallet: WALLET, protocol: "aave", chain: "ethereum" } },
  { slug: "agent-web-data-extraction-intelligence-api-1bb908",              path: "/scrape",                         body: { url: "https://example.com" } },
  { slug: "agent-product-data-extraction-commerce-intelligence-api-dd156a", path: "/extract-product",                body: { url: "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html" } },
  { slug: "browser-task-execution-api-d8c3ef",                              path: "/run",                            body: { goal: "Summarize homepage", task_type: "visit_and_summarize", url: "https://example.com" } },
  { slug: "agent-intelligence-extraction-monitoring-api-bc70d5",            path: "/extract/invoice",                body: { text: "Invoice #123, $500 from Acme Corp" } },
  { slug: "agent-career-optimization-application-intelligence-api-c46067",  path: "/analyze-resume",                 body: { resume_text: "John Smith, Software Engineer with 5 years experience in Python and JavaScript." } },
  { slug: "agent-location-intelligence-geocoding-api-8de502",               path: "/geocode",                        body: { address: "1600 Pennsylvania Ave NW, Washington DC" } },
  { slug: "agent-phone-intelligence-contact-verification-api-84ccf1",       path: "/score-phone",                    body: { phone: "+14155552671" } },
  { slug: "agent-pdf-extraction-api-fead7d",                                path: "/extract-invoice",                body: { text: "Invoice #123, $500 from Acme Corp, due 2026-06-01" } },
  { slug: "agent-market-signal-portfolio-intelligence-api-4cbef1",          path: "/score-ticker",                   body: { ticker: "AAPL" } },
  { slug: "compliance-api-7f55eb",                                           path: "/kyc-check",                      body: { entity_id: "test-001", entity_type: "individual", name: "John Smith" } },
  { slug: "browser-automation-api-6f80d2",                                   path: "/open",                           body: { url: "https://example.com", session_id: "test-session" } },
  { slug: "agent-payments-api-79969e",                                       path: "/create-wallet",                  body: { agent_id: "test-agent-001", label: "test wallet", wallet_type: "hot" } },

  // ── Crypto & DeFi ─────────────────────────────────────────────────────────
  { slug: "market-signal-api-c2fb7d",                                        path: "/batch",                          body: { assets: ["BTC", "ETH"] } },
  { slug: "market-trigger-api-a89c73",                                       path: "/create",                         body: { asset: "BTC", conditions: { min_confidence: 0.7 }, context: { market_signal: { signal: "buy" } } } },
  { slug: "market-webhook-api-5f24af",                                       path: "/",                               body: { url: "https://example.com/webhook", event_type: "market_signal", conditions: { asset: "BTC", min_confidence: 0.7 } } },
  { slug: "on-chain-signal-api-f818fd",                                      path: "/analyze",                        body: { address: WALLET, chain: "ethereum" } },
  { slug: "portfolio-rebalance-api-1f24c6",                                  path: "/rebalance",                      body: { portfolio: [{ asset: "BTC", value: 50000 }, { asset: "ETH", value: 50000 }], strategy: "equal_weight", risk_tolerance: "medium" } },
  { slug: "strategy-execution-api-4fb84c",                                   path: "/execute",                        body: { strategy: "trend_following", risk_tolerance: "medium", portfolio: [{ asset: "BTC", value: 10000, weight: 0.6 }, { asset: "ETH", value: 6667, weight: 0.4 }] } },
  { slug: "trust-api-2eaca2",                                                path: "/score",                          body: { wallet_address: WALLET } },
  { slug: "unified-decision-api-77cdc8",                                     path: "/",                               body: { portfolio: [{ asset: "BTC", value: 50000 }, { asset: "ETH", value: 50000 }], risk_tolerance: "medium" } },
  { slug: "user-risk-api-593da1",                                            path: "/assess",                         body: { ip: "8.8.8.8" } },
  { slug: "wallet-intelligence-api-446f3b",                                  path: "/analyze",                        body: { address: WALLET } },
  { slug: "decision-scorer-api-59e365",                                      path: "/score",                          body: { decision: "Buy BTC at current price", context: "market is bullish" } },
  { slug: "market-correlation-api-50ede4",                                   path: "/correlation",                    body: { asset: "BTC", window: "30d" } },
  { slug: "yield-farming-api-69fdc7",                                        path: "/opportunities",                  method: "GET" },
  { slug: "tokenomics-api-f2c5e2",                                           path: "/tokenomics",                     body: { token: "bitcoin" } },
  { slug: "strategy-signal-api-bf4c0d",                                      path: "/?symbol=BTC",                   method: "GET" },
  { slug: "derivatives-intelligence-api-547431",                             path: "/intelligence",                   body: { asset: "BTC" } },
  { slug: "token-trust-api-873580",                                          path: "/check",                          body: { contract: CONTRACT, chain: "ethereum" } },
  { slug: "crypto-news-impact-api-24b79e",                                   path: "/analyze",                        body: { asset: "BTC", articles: [{ title: "Bitcoin reaches all-time high as institutional investors pour in." }] } },
  { slug: "derivatives-api-cbffd5",                                          path: "/options/summary/BTC",           method: "GET" },
  { slug: "liquidation-feed-api-468e93",                                     path: "/v1/liquidations/recent",        method: "GET" },
  { slug: "market-stress-api-1a9368",                                        path: "/v1/stress",                     method: "GET" },
  { slug: "onchain-news-api-591f86",                                         path: "/news",                           body: { token: "BTC" } },
  { slug: "token-price-feed-api-94e8e4",                                     path: "/price",                          body: { coinId: "bitcoin" } },
  { slug: "wallet-reputation-api-473b01",                                    path: "/score",                          body: { address: WALLET } },
  { slug: "tx-simulator-api-f79c52",                                         path: `/simulate?from=${WALLET}&to=0x742d35Cc6634C0532925a3b844Bc454e4438f44e&value=1000000000000000`, method: "GET" },
  { slug: "wallet-api-5f3267",                                               path: `/balance/${WALLET}`,             method: "GET" },
  { slug: "wallet-balance-api-814f7d",                                       path: `/balance/${WALLET}`,             method: "GET" },
  { slug: "nft-metadata-api-0c88fb",                                         path: "/token/0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D/1", method: "GET" },
  { slug: "ens-resolver-api-e6922d",                                         path: "/resolve?ens=vitalik.eth",       method: "GET" },
  { slug: "funding-rate-api-f2559c",                                         path: "/rates/now",                     method: "GET" },
  { slug: "gas-optimizer-api-4f7b83",                                        path: "/now",                           method: "GET" },
  { slug: "alpha-signal-api-1f8d92",                                         path: "/scan-signals",                   body: { symbols: ["BTC", "ETH"] } },
  { slug: "market-snapshot-api-3dc5d1",                                      path: "/quote?symbol=AAPL",             method: "GET" },
  { slug: "stablecoin-yield-api-ca182f",                                     path: "/rates",                          method: "GET" },
  { slug: "token-screener-api-344276",                                       path: "/movers",                         method: "GET" },
  { slug: "wallet-portfolio-api-414e10",                                     path: "/snapshot",                       body: { address: WALLET } },
  { slug: "token-unlock-api-f1f131",                                         path: "/upcoming",                       method: "GET" },
  { slug: "prediction-market-api-4181e0",                                    path: "/trending",                       method: "GET" },
  { slug: "crypto-narrative-api-51cb0e",                                     path: "/trending",                       method: "GET" },
  { slug: "meta-strategy-api-2a9c66",                                        path: "/scan",                           body: { symbols: "BTC,ETH", risk_tolerance: "medium" } },
  { slug: "social-sentiment-api-e6aca7",                                     path: "/crypto-sentiment/BTC",           method: "GET" },
  { slug: "smart-contract-risk-api-82fd41",                                  path: "/compare",                        body: { contract_a: CONTRACT, contract_b: "0x6B175474E89094C44Da98b954EedeAC495271d0F", chain: "ethereum" } },
  { slug: "defi-risk-api-0dff29",                                            path: "/assess",                         body: { protocol: "aave", chain: "ethereum" } },

  // ── Identity & Security ───────────────────────────────────────────────────
  { slug: "identity-intelligence-api-9b4029",                                path: "/",                               body: { email: "test@example.com" } },
  { slug: "ip-intelligence-api-840be3",                                      path: "/?ip=8.8.8.8",                   method: "GET" },

  // ── Data, Leads & Sales ───────────────────────────────────────────────────
  { slug: "lead-discovery-api-7b18d1",                                       path: "/leads/find",                     body: { query: "SaaS companies in San Francisco" } },
  { slug: "lead-enrichment-api-96fa77",                                      path: "/",                               body: { domain: "anthropic.com" } },
  { slug: "lead-quality-api-9a7ace",                                         path: "/score",                          body: { email: "test@example.com" } },
  { slug: "lead-scoring-api-a6e440",                                         path: "/score-lead",                     body: { company_name: "Acme Corp", industry: "SaaS", company_size: "50-200", revenue: "$5M-$20M" } },
  { slug: "cold-outreach-api-9f54f6",                                        path: "/execution-gate",                 body: { email_score: 75, spam_risk: "low", prospect_status: "active", has_email: true, do_not_contact: false } },
  { slug: "competitor-monitor-api-354088",                                   path: "/analyze-competitor",             body: { competitor_name: "OpenAI", industry: "AI", your_company: "Anthropic" } },
  { slug: "local-business-api-ff8abd",                                       path: "/analyze-business",               body: { business_name: "Downtown Coffee", location: "New York", category: "cafe" } },
  { slug: "serp-intelligence-api-f0fe1e",                                    path: "/analyze-serp",                   body: { keyword: "AI tools", location: "US" } },
  { slug: "shopify-analyzer-api-21a5d3",                                     path: "/analyze-store",                  body: { store_url: "https://allbirds.com" } },
  { slug: "meeting-analyzer-api-c51ed8",                                     path: "/extract-action-items",           body: { transcript: "Alice: We need to finish the report by Friday. Bob: I will handle the data section. Alice: Great. Let us reconvene Monday." } },
  { slug: "crm-update-api-958cdd",                                           path: "/create-contact",                 body: { name: "John Smith", email: "john@acme.com", company: "Acme Corp" } },
  { slug: "calendar-scheduling-api-067755",                                  path: "/find-slots",                     body: { attendees: ["alice@example.com", "bob@example.com"], duration_minutes: 30, date_range: { start: "2026-05-12", end: "2026-05-16" }, timezone: "America/New_York" } },
  { slug: "workflow-orchestrator-api-d76499",                                path: "/execution-gate",                 body: { workflow_context: "lead-to-deal", intended_workflow: "sales automation", resource_constraints: {} } },

  // ── AI Tools & Research ───────────────────────────────────────────────────
  { slug: "document-intelligence-api-046f6c",                                path: "/",                               body: { document: "SW52b2ljZSAjMTIzLCAkNTAwIGZyb20gQWNtZSBDb3Jw" } },
  { slug: "image-generation-intelligence-api-811894",                        path: "/keys/generate",                  body: { label: "test" } },
  { slug: "image-to-content-api-3f51f9",                                     path: "/workflow/start",                 body: { goal: "analyze image" } },
  { slug: "image-to-content-api-5c7f80",                                     path: "/workflow/start",                 body: { goal: "analyze image" } },
  { slug: "youtube-intelligence-api-8907c0",                                 path: "/summarize",                      body: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" } },
  { slug: "deep-research-api-9bc015",                                        path: "/extract-facts",                  body: { content: "Artificial intelligence will transform industries by 2026 through automation and advanced reasoning." } },
  { slug: "website-monitor-api-26349a",                                      path: "/",                               body: { url: "https://example.com" } },
  { slug: "web-researcher-api-ce3632",                                       path: "/research",                       body: { query: "latest AI developments in 2026" } },
  { slug: "market-intelligence-api-5a2e4e",                                  path: "/",                               body: { asset: "BTC" } },
  { slug: "intelligence-extraction-api-c60b09",                              path: "/extract",                        body: { text: "Bitcoin price surges to record high as institutional demand grows" } },
  { slug: "career-optimization-api-ce63e8",                                  path: "/score-resume",                   body: { resume_text: "John Smith, Software Engineer with 5 years experience in Python and JavaScript." } },
  { slug: "text-generation-api-3b0db8",                                      path: "/generate",                       body: { prompt: "Explain AI in one sentence." } },

  // ── Developer Utilities ───────────────────────────────────────────────────
  { slug: "dev-utilities-api-63a676",                                        path: "/summarize",                      body: { text: "This is a test sentence that is long enough to meet the minimum character requirement for summarization." } },

  // ── Agent Intelligence (new) ──────────────────────────────────────────────
  { slug: "social-intelligence-api-460543",                                  path: "/analyze-post",                   body: { post_content: "Just launched our AI product — faster than anything on the market!", platform: "twitter" } },
  { slug: "data-connector-api-064a62",                                       path: "/transform",                      body: { data: [{ first_name: "John", last_name: "Doe", arr: "12000" }], from_format: "crm_export", to_format: "salesforce_lead" } },
  { slug: "voice-intelligence-api-15a4dd",                                   path: "/analyze-transcript",             body: { transcript: "Sales rep: Are you interested in our enterprise plan? Customer: Maybe, what does it include?", call_type: "sales" } },
  { slug: "agent-evaluation-api-cf25b2",                                     path: "/benchmark",                      body: { agent_response: "Our enterprise plan includes unlimited seats, SSO, and 24/7 support.", task: "Answer a question about enterprise pricing", expected_behavior: "Mention key features and pricing tiers clearly", domain: "sales" } },
  { slug: "proposal-generation-api-b7091f",                                  path: "/generate-proposal",              body: { client_name: "Acme Corp", problem_statement: "Manual lead qualification takes 3 hours per rep daily", solution_description: "AI-powered lead scoring integrated with Salesforce" } },
  { slug: "outreach-execution-api-c668dc",                                   path: "/compose-message",                body: { recipient: { name: "Jane Smith", title: "VP Engineering", company: "TechCorp" }, message_type: "cold_email", purpose: "book a demo for our AI observability platform" } },
  { slug: "outreach-execution-api-a0b76f",                                   path: "/personalize",                    body: { recipient: { name: "Jane Smith", title: "VP Engineering", company: "TechCorp" }, template: "Hi {{name}}, wanted to reach out about AI automation.", purpose: "book a demo" } },
  { slug: "real-time-monitor-api-97398b",                                    path: "/anomaly-detect",                 body: { metrics: [{ name: "api_latency_ms", values: [120, 115, 130, 125, 890, 940, 128] }], sensitivity: "high" } },
  { slug: "computer-use-api-a39b9e",                                         path: "/analyze-screen",                 body: { screen_description: "Chrome browser showing a Salesforce lead list with 200 records", objective: "export all leads to CSV", app_context: "Salesforce CRM" } },
  { slug: "enterprise-retrieval-api-7f11e8",                                 path: "/search",                         body: { query: "Q4 2024 revenue performance", sources: ["confluence", "notion", "slack"] } },
  { slug: "multi-agent-coordination-api-f33d92",                             path: "/create-team",                    body: { team_name: "research-team", goal: "analyze competitor pricing", agents: [{ role: "researcher", capability: "web_search" }] } },
  { slug: "agent-observability-telemetry-api-2bdbf9",                        path: "/log-tool-call",                  body: { agent_id: "agent-001", tool_name: "web_search", input: { query: "stripe pricing" }, output: { results: 5 }, latency_ms: 320 } },
  { slug: "web-navigation-api-12f37e",                                       path: "/navigate",                       body: { url: "https://stripe.com/pricing", goal: "extract all pricing tiers and features" } },

  // ── Finance & Validation ──────────────────────────────────────────────────
  { slug: "email-validation-api-204701",                                     path: "/validate",                       body: { email: "test@example.com" } },
  { slug: "email-intelligence-api-d9801f",                                   path: "/verify",                         body: { email: "test@example.com" } },

  // ── Batch 1: Local / Travel / Media / Social / NLP ───────────────────────
  { slug: "restaurant-search-api-312f73",                                    path: "/search",                         body: { query: "sushi near downtown", location: "San Francisco, CA" } },
  { slug: "maps-places-api-e15b12",                                          path: "/search",                         body: { query: "coffee shops", location: "New York, NY" } },
  { slug: "event-search-api-9796d2",                                         path: "/search",                         body: { query: "tech conferences", location: "San Francisco, CA", date_range: "next_month" } },
  { slug: "sports-scores-api-854b8a",                                        path: "/live",                           body: { sport: "basketball", league: "NBA" } },
  { slug: "betting-odds-api-853b79",                                         path: "/odds",                           body: { sport: "basketball", event: "NBA Finals" } },
  { slug: "social-profile-lookup-api-ada0ce",                                path: "/lookup",                         body: { username: "elonmusk", platform: "twitter" } },
  { slug: "x-twitter-post-lookup-api-cc55f3",                                path: "/lookup",                         body: { post_id: "1234567890" } },
  { slug: "youtube-metadata-api-43b4d7",                                     path: "/video",                          body: { video_id: "dQw4w9WgXcQ" } },
  { slug: "tiktok-metadata-api-f36611",                                      path: "/video",                          body: { video_url: "https://www.tiktok.com/@example/video/123" } },
  { slug: "podcast-search-api-087a82",                                       path: "/search",                         body: { query: "AI artificial intelligence", limit: 5 } },
  { slug: "transcript-extraction-api-4c908d",                                path: "/extract",                        body: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", type: "youtube" } },
  { slug: "audio-transcription-api-7042e6",                                  path: "/transcribe",                     body: { audio_url: "https://example.com/sample.mp3", language: "en" } },
  { slug: "text-summarizer-api-8d455d",                                      path: "/summarize",                      body: { text: "Artificial intelligence is transforming industries worldwide by automating complex tasks.", length: "short" } },
  { slug: "language-detection-api-626721",                                   path: "/detect",                         body: { text: "Bonjour le monde, comment ça va?" } },
  { slug: "translation-api-d267e9",                                          path: "/translate",                      body: { text: "Hello, how are you?", target_language: "es" } },
  { slug: "sentiment-api-53dcab",                                            path: "/analyze",                        body: { text: "This product is absolutely amazing and exceeded all my expectations!" } },
  { slug: "entity-extraction-api-d5f53c",                                    path: "/extract",                        body: { text: "Elon Musk founded Tesla and SpaceX in California." } },
  { slug: "content-moderation-api-4fa8a6",                                   path: "/moderate",                       body: { text: "This is a sample text to check for inappropriate content." } },
  { slug: "pii-detection-api-f4ee8c",                                        path: "/detect",                         body: { text: "My name is John Smith and my email is john@example.com, SSN: 123-45-6789" } },
  { slug: "email-parser-api-3e422e",                                         path: "/parse",                          body: { email_text: "From: sender@example.com\nSubject: Meeting Tomorrow\nHi, let's meet at 3pm tomorrow." } },

  // ── Batch 2: Document / OCR / Developer / Utility ─────────────────────────
  { slug: "invoice-parser-api-77d5eb",                                       path: "/parse",                          body: { invoice_text: "Invoice #1234\nDate: 2025-01-15\nVendor: Acme Corp\nItem: Consulting Services $500.00\nTotal: $500.00" } },
  { slug: "receipt-parser-api-b48d4f",                                       path: "/parse",                          body: { receipt_text: "Starbucks\n01/15/2025 10:30 AM\nCafe Latte $6.50\nTax $0.52\nTotal $7.02" } },
  { slug: "contract-clause-extractor-api-babbdf",                            path: "/extract",                        body: { contract_text: "This Agreement shall terminate upon 30 days written notice. Neither party shall be liable for indirect or consequential damages." } },
  { slug: "legal-citation-parser-api-ee4ab2",                                path: "/parse",                          body: { citation_text: "See Smith v. Jones, 123 F.3d 456 (9th Cir. 2001)." } },
  { slug: "table-extraction-api-c11d5f",                                     path: "/extract",                        body: { document_text: "Name | Age | City\nJohn Smith | 30 | New York\nJane Doe | 25 | Los Angeles" } },
  { slug: "signature-detection-api-28abe7",                                  path: "/detect",                         body: { document_text: "This contract is signed by John Smith on January 15, 2025. [Signature: John Smith] [Date: 01/15/2025]" } },
  { slug: "document-classification-api-21d443",                              path: "/classify",                       body: { document_text: "Invoice #1234\nDate: 2025-01-15\nBill To: Acme Corp\nServices Rendered: Software Development\nTotal Due: $1,500.00" } },
  { slug: "pdf-generator-api-c80ff2",                                        path: "/generate",                       body: { title: "Quarterly Report", content: "Q1 2025 results show strong growth.", template: "business" } },
  { slug: "github-issue-search-api-d52cef",                                  path: "/search",                         body: { repo: "microsoft/vscode", query: "performance bug", state: "open" } },
  { slug: "json-schema-validator-api-2cb52a",                                path: "/validate",                       body: { json_data: '{"name":"test","age":30}', schema: { type: "object", required: ["name"], properties: { name: { type: "string" } } } } },
  { slug: "api-health-check-api-f2b27d",                                     path: "/check",                          body: { url: "https://api.github.com", method: "GET" } },
  { slug: "ssl-certificate-api-903aa0",                                      path: "/check",                          body: { hostname: "github.com" } },
  { slug: "dns-lookup-api-9aa16a",                                           path: "/lookup",                         body: { domain: "google.com", record_type: "A" } },
  { slug: "cve-lookup-api-f4b2de",                                           path: "/lookup",                         body: { cve_id: "CVE-2021-44228" } },
  { slug: "npm-package-risk-api-a9d854",                                     path: "/analyze",                        body: { package_name: "lodash", version: "latest" } },
  { slug: "image-resize-api-8dbce2",                                         path: "/resize",                         body: { image_url: "https://example.com/photo.jpg", width: 800, height: 600 } },
  { slug: "background-removal-api-4291ed",                                   path: "/remove",                         body: { image_url: "https://example.com/portrait.jpg" } },
  { slug: "color-palette-api-540529",                                        path: "/extract",                        body: { image_url: "https://example.com/artwork.jpg", count: 5 } },
  { slug: "short-link-api-71380a",                                           path: "/shorten",                        body: { url: "https://www.example.com/very/long/url/that/needs/shortening" } },
  { slug: "meme-caption-generator-api-1a2c5f",                               path: "/generate",                       body: { topic: "working from home", tone: "humorous", audience: "tech workers" } },

  // ── Batch 3: Finance / Intelligence / Risk / Sales / Dev ──────────────────
  { slug: "legal-contract-risk-api-fa4750",                                  path: "/analyze",                        body: { contract_text: "This Agreement shall terminate upon 30 days written notice. The Contractor is liable for all damages arising from negligence." } },
  { slug: "context-compression-api-46c95b",                                  path: "/compress",                       body: { content: "This is a long transcript from a sales call that needs to be compressed into a shorter summary while retaining the key points and action items discussed by the team.", content_type: "transcript" } },
  { slug: "fact-verification-api-fb64cd",                                    path: "/verify",                         body: { content: "The Earth orbits the Sun at an average distance of 93 million miles.", content_type: "ai_output" } },
  { slug: "earnings-analyzer-api-322c11",                                    path: "/analyze",                        body: { earnings_text: "Apple Inc Q1 2025 Results: Revenue $119.6B up 5% YoY. EPS $2.18 beating consensus of $2.09. iPhone revenue $69.1B. Services revenue $26.3B up 14%.", ticker: "AAPL", fiscal_period: "Q1 2025" } },
  { slug: "portfolio-risk-api-4cdcbe",                                       path: "/score",                          body: { holdings: [{ ticker: "AAPL", weight: 0.3 }, { ticker: "BTC", weight: 0.7 }] } },
  { slug: "financial-news-monitor-api-5d4a1f",                               path: "/analyze",                        body: { ticker: "AAPL" } },
  { slug: "vendor-ranking-api-0aaa50",                                       path: "/rank",                           body: { vendors: ["AWS", "GCP", "Azure"], criteria: ["cost", "reliability"] } },
  { slug: "reddit-intelligence-api-43b968",                                  path: "/analyze",                        body: { subreddit: "technology", query: "AI" } },
  { slug: "autonomous-negotiation-api-77346a",                               path: "/counteroffer",                   body: { initial_offer: 100000, target: 85000, context: "software license" } },
  { slug: "address-risk-api-296f15",                                         path: "/score",                          body: { address: WALLET } },
  { slug: "company-enrichment-api-9daab8",                                   path: "/enrich",                         body: { company: "OpenAI", domain: "openai.com" } },
  { slug: "risk-event-forecast-api-1cb246",                                  path: "/forecast",                       body: { company: "Tesla", asset: "TSLA" } },
  { slug: "reputation-intelligence-api-34db35",                              path: "/score",                          body: { brand: "Tesla", ticker: "TSLA" } },
  { slug: "job-posting-search-api-bff64b",                                   path: "/search",                         body: { title: "Software Engineer", skills: ["Python", "AI", "Machine Learning"], location: "San Francisco" } },
  { slug: "qa-testing-api-9f659f",                                           path: "/generate",                       body: { workflow: "user login flow", spec: "User enters email and password, clicks login, sees dashboard" } },
  { slug: "openapi-validator-api-427e3e",                                    path: "/validate",                       body: { spec_url: "https://orbis-apis.onrender.com/wallet/openapi.json" } },
  { slug: "linkedin-profile-api-ddb819",                                     path: "/analyze",                        body: { linkedin_url: "https://www.linkedin.com/in/example" } },
  { slug: "knowledge-graph-api-bd4d52",                                      path: "/extract",                        body: { text: "Elon Musk founded Tesla in 2003 and SpaceX in 2002. Tesla is based in Austin, Texas." } },
  { slug: "github-repo-stats-api-e697c1",                                    path: "/analyze",                        body: { repo: "microsoft/vscode" } },
  { slug: "image-ocr-api-491c11",                                            path: "/extract",                        body: { image_url: "https://example.com/invoice.jpg" } },
  { slug: "email-finder-api-fa5c01",                                         path: "/find",                           body: { first_name: "John", last_name: "Smith", company: "OpenAI", domain: "openai.com" } },
  { slug: "economic-calendar-api-b05e61",                                    path: "/events",                         body: { country: "US", days_ahead: 7 } },
  { slug: "due-diligence-api-2db2d6",                                        path: "/assess",                         body: { company: "Stripe", domain: "stripe.com" } },
  { slug: "corporate-actions-api-2565fb",                                    path: "/splits",                         body: { company: "Apple Inc" } },
  { slug: "website-screenshot-api-b7b558",                                   path: "/capture",                        body: { url: "https://stripe.com" } },
  { slug: "stock-quote-api-59d5c7",                                          path: "/quote",                          body: { ticker: "AAPL" } },
  { slug: "supply-chain-risk-api-01e56f",                                    path: "/assess",                         body: { company: "Apple Inc", industry: "consumer electronics" } },
  { slug: "sec-filing-intelligence-api-2ee3bf",                              path: "/analyze",                        body: { filing_text: "Apple Inc 10-K Annual Report 2024. Net sales $391.0B. Operating income $123.2B. Research and development $29.9B. Cash and equivalents $29.9B. Risk factors include supply chain concentration in Asia, foreign currency fluctuations, and competitive pressures in smartphone market." } },
  { slug: "sales-intelligence-api-8b43ec",                                   path: "/qualify",                        body: { company: "Acme Corp", contact: "Jane Smith", title: "VP Engineering", budget: 50000 } },
];

const results = { pass: [], fail: [], error: [] };
console.log(`Wallet: ${account.address}`);
console.log(`Running x402 test on ${tests.length} APIs...\n`);

for (const test of tests) {
  const url = `${PROXY}/${test.slug}${test.path}`;
  const method = test.method || "POST";
  const start = Date.now();
  try {
    const fetchOptions = { method, headers: { "Content-Type": "application/json" } };
    if (method !== "GET" && test.body) fetchOptions.body = JSON.stringify(test.body);
    const res = await fetch402(url, fetchOptions);
    const ms = Date.now() - start;
    let data = {};
    try { data = await res.json(); } catch {}
    const success = res.status >= 200 && res.status < 300 && data.success !== false;
    if (success) {
      results.pass.push({ slug: test.slug, ms });
      console.log(`✅ ${test.slug.padEnd(72)} ${res.status}  ${ms}ms`);
    } else {
      const err = data.error || data.message || data.details || JSON.stringify(data).slice(0, 100);
      results.fail.push({ slug: test.slug, status: res.status, error: err });
      console.log(`❌ ${test.slug.padEnd(72)} ${res.status}  ${JSON.stringify(err).slice(0, 80)}`);
    }
  } catch (e) {
    results.error.push({ slug: test.slug, error: e.message });
    console.log(`💀 ${test.slug.padEnd(72)} ERR  ${e.message.slice(0, 60)}`);
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
