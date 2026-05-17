import fetch from "node-fetch";

const slugs = [
  // Original batch
  "action", "agent-identity", "agent-memory", "agent-skills", "agent-workflow", "ai-output-safety",
  "alpha-signal", "autopilot", "browser-task", "company-research", "contract-analyzer",
  "cross-chain-bridge", "crypto-alerts", "crypto-narrative", "crypto-news-impact", "decision-scorer",
  "defi-position-monitor", "defi-risk", "derivatives", "derivatives-intelligence", "dev-utilities",
  "document-intelligence", "email-validation", "ens-resolver", "extraction", "funding-rate",
  "gas-optimizer", "identity-intelligence", "image-gen", "image-to-content", "ip-intelligence",
  "lead-discovery", "lead-enrichment", "lead-quality", "liquidation-feed", "market-correlation",
  "market-intelligence", "market-signal", "market-stress", "market-trigger", "market-webhook",
  "meta-strategy", "nft-metadata", "onchain-news", "onchain-signal", "phone-validation",
  "portfolio-rebalance", "prediction-market", "product-data", "search-extract", "social-sentiment",
  "stablecoin-yield", "strategy-execution", "strategy-signal", "text-extractor", "token-price-feed",
  "token-screener", "token-trust", "token-unlock", "tokenomics", "trust", "tx-simulator",
  "unified-decision", "user-risk", "wallet", "wallet-intelligence", "wallet-portfolio",
  "wallet-reputation", "web-researcher", "web-scraper", "website-monitor", "yield-farming",
  // Batch 1 (restaurant-search → email-parser)
  "restaurant-search", "maps-places", "event-search", "sports-scores", "betting-odds",
  "social-profile-lookup", "twitter-post-lookup", "youtube-metadata", "tiktok-metadata",
  "podcast-search", "transcript-extraction", "audio-transcription", "text-summarizer",
  "language-detection", "translation", "sentiment", "entity-extraction", "content-moderation",
  "pii-detection", "email-parser",
  // Batch 2 (invoice-parser → meme-caption)
  "invoice-parser", "receipt-parser", "contract-clause", "legal-citation", "table-extraction",
  "signature-detection", "document-classification", "pdf-generator", "github-issue-search",
  "json-schema-validator", "api-health-check", "ssl-certificate", "dns-lookup", "cve-lookup",
  "npm-package-risk", "image-resize", "background-removal", "color-palette", "short-link",
  "meme-caption",
  // Additional APIs found in routes
  "address-risk", "address-validation", "agent-eval", "agent-observability", "agent-payments",
  "agent-web-data-extraction", "amazon-product", "ats-keyword", "autonomous-negotiation",
  "browser-automation", "calendar-holiday", "calendar-scheduling", "career-optimization",
  "cold-outreach", "company-enrichment", "competitor-monitor", "compliance", "computer-use",
  "context-compression", "corporate-actions", "crm-update", "crypto-price", "crypto-trigger",
  "currency-formatting", "data-connector", "deep-research", "defi-position-risk",
  "domain-intelligence", "due-diligence", "earnings-analyzer", "economic-calendar",
  "email-finder", "email-intelligence", "enterprise-retrieval", "fact-verification", "favicon",
  "financial-news-monitor", "flight-status", "fx-rates", "geocoding", "github-repo-stats",
  "hotel-price", "image-ocr", "image-resize", "intelligence-extraction", "ip-geolocation",
  "job-posting-search", "knowledge-graph", "lead-scoring", "legal-contract-risk",
  "linkedin-profile", "local-business", "logo-finder", "market-data", "meeting-analyzer",
  "multi-agent", "news-search", "openapi-validator", "outreach-execution", "package-tracking",
  "pdf-extraction", "portfolio-risk", "price-monitor", "productdata", "proposal-generation",
  "qa-testing", "qr-barcode", "real-time-monitor", "reddit-intelligence", "reputation-intelligence",
  "resume", "resume-parser", "risk-event-forecast", "sales-intelligence", "sec-filing-intelligence",
  "serp-intelligence", "shipping-rate", "shopify-analyzer", "smart-contract-risk",
  "social-intelligence", "stock-quote", "supply-chain-risk", "tax-rate", "text-generation",
  "timezone", "unit-conversion", "url-screenshot-diff", "vendor-ranking", "voice-intelligence",
  "weather", "web-navigation", "web-page-extractor", "website-change-monitor",
  "website-screenshot", "workflow-orchestrator", "youtube-intelligence",
];
const BASE = "https://orbis-apis.onrender.com";

const results = { pass: [], fail: [] };

for (const slug of slugs) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE}/${slug}`, { signal: AbortSignal.timeout(10000) });
    const ms = Date.now() - start;
    if (res.ok) {
      results.pass.push({ slug, status: res.status, ms });
      console.log(`✅ ${slug.padEnd(35)} ${res.status}  ${ms}ms`);
    } else {
      results.fail.push({ slug, status: res.status, ms });
      console.log(`❌ ${slug.padEnd(35)} ${res.status}  ${ms}ms`);
    }
  } catch (e) {
    const ms = Date.now() - start;
    results.fail.push({ slug, status: "TIMEOUT/ERR", ms, error: e.message });
    console.log(`💀 ${slug.padEnd(35)} ERR    ${e.message}`);
  }
}

console.log("\n=== SUMMARY ===");
console.log(`✅ Passing: ${results.pass.length}`);
console.log(`❌ Failing: ${results.fail.length}`);
if (results.fail.length) {
  console.log("\nFailed APIs:");
  results.fail.forEach(f => console.log(`  - ${f.slug} (${f.status})`));
}
