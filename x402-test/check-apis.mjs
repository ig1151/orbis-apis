import fetch from "node-fetch";

const slugs = ["action", "agent-identity", "agent-memory", "agent-skills", "agent-workflow", "ai-output-safety", "alpha-signal", "autopilot", "browser-task", "company-research", "contract-analyzer", "cross-chain-bridge", "crypto-alerts", "crypto-narrative", "crypto-news-impact", "decision-scorer", "defi-position-monitor", "defi-risk", "derivatives", "derivatives-intelligence", "dev-utilities", "document-intelligence", "email-validation", "ens-resolver", "extraction", "funding-rate", "gas-optimizer", "identity-intelligence", "image-gen", "image-to-content", "ip-intelligence", "lead-discovery", "lead-enrichment", "lead-quality", "liquidation-feed", "market-correlation", "market-intelligence", "market-signal", "market-stress", "market-trigger", "market-webhook", "meta-strategy", "nft-metadata", "onchain-news", "onchain-signal", "phone-validation", "portfolio-rebalance", "prediction-market", "product-data", "search-extract", "social-sentiment", "stablecoin-yield", "strategy-execution", "strategy-signal", "text-extractor", "token-price-feed", "token-screener", "token-trust", "token-unlock", "tokenomics", "trust", "tx-simulator", "unified-decision", "user-risk", "wallet", "wallet-intelligence", "wallet-portfolio", "wallet-reputation", "web-researcher", "web-scraper", "website-monitor", "yield-farming"];
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
