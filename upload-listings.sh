#!/bin/bash

# Usage: ORBIS_API_KEY=your_key bash upload-listings.sh

API_KEY=${ORBIS_API_KEY:-""}
BASE_URL="https://api.orbisapi.com"

if [ -z "$API_KEY" ]; then
  echo "Error: ORBIS_API_KEY is not set"
  echo "Usage: ORBIS_API_KEY=your_key bash upload-listings.sh"
  exit 1
fi

LISTINGS=(
  # ── Re-listing: 404 failures from x402 test runs ──────────────────────────
  "maps-places-listing.json"
  "sports-scores-listing.json"
  "twitter-post-lookup-listing.json"
  "sentiment-listing.json"
  "entity-extraction-listing.json"
  "legal-contract-risk-listing.json"
  "portfolio-risk-listing.json"
  "financial-news-monitor-listing.json"
  "vendor-ranking-listing.json"
  "reddit-intelligence-listing.json"
  "autonomous-negotiation-listing.json"
  "address-risk-listing.json"
  "reputation-intelligence-listing.json"
  "qa-testing-listing.json"
  "linkedin-profile-listing.json"
  "economic-calendar-listing.json"
  "due-diligence-listing.json"
  "sales-intelligence-listing.json"
  # ── Batch 7: 77 new APIs ───────────────────────────────────────────────────
  # Cat 1 — Website Infrastructure
  "http-header-inspector-listing.json"
  "cookie-scanner-listing.json"
  "csp-analyzer-listing.json"
  "redirect-chain-analyzer-listing.json"
  "canonical-url-checker-listing.json"
  "broken-link-checker-listing.json"
  "robots-txt-parser-listing.json"
  "domain-age-listing.json"
  "domain-availability-listing.json"
  "mx-record-checker-listing.json"
  "spf-dkim-dmarc-checker-listing.json"
  "sitemap-parser-listing.json"
  "hreflang-validator-listing.json"
  "website-tech-stack-detector-listing.json"
  "cdn-detector-listing.json"
  "hosting-provider-detector-listing.json"
  "whois-lite-listing.json"
  # Cat 2 — SEO
  "internal-link-analyzer-listing.json"
  "external-link-auditor-listing.json"
  "page-title-optimizer-listing.json"
  "schema-org-extractor-listing.json"
  "faq-schema-validator-listing.json"
  "breadcrumb-validator-listing.json"
  "sitemap-health-score-listing.json"
  "indexability-checker-listing.json"
  "mobile-seo-audit-listing.json"
  "core-web-vitals-lite-listing.json"
  "duplicate-content-detector-listing.json"
  "url-structure-scorer-listing.json"
  "featured-snippet-predictor-listing.json"
  "ctr-prediction-listing.json"
  # Cat 3 — AI Content
  "text-simplifier-listing.json"
  "tone-analyzer-listing.json"
  "toxicity-detection-listing.json"
  "prompt-injection-detector-listing.json"
  "hallucination-risk-lite-listing.json"
  "citation-extractor-listing.json"
  "citation-formatter-listing.json"
  "bullet-point-extractor-listing.json"
  "key-phrase-extractor-listing.json"
  "faq-generator-listing.json"
  "title-generator-listing.json"
  # Cat 4 — Social/Marketing
  "ad-copy-variant-generator-listing.json"
  "hook-generator-listing.json"
  "youtube-title-optimizer-listing.json"
  "linkedin-post-optimizer-listing.json"
  "tiktok-caption-optimizer-listing.json"
  "thumbnail-text-scorer-listing.json"
  "brand-voice-checker-listing.json"
  # Cat 5 — Email/Identity
  "email-syntax-validator-listing.json"
  "disposable-email-detector-listing.json"
  "email-reputation-listing.json"
  "company-domain-finder-listing.json"
  "executive-email-pattern-finder-listing.json"
  "email-deliverability-score-listing.json"
  "mailbox-provider-detector-listing.json"
  "contact-card-extractor-listing.json"
  "meeting-invite-parser-listing.json"
  "signature-block-parser-listing.json"
  # Cat 6 — Security/Risk
  "url-risk-lite-listing.json"
  "domain-reputation-listing.json"
  "phishing-keyword-detector-listing.json"
  "apk-risk-lite-listing.json"
  "chrome-extension-risk-listing.json"
  "wallet-address-risk-listing.json"
  "smart-contract-metadata-listing.json"
  "smart-contract-abi-lookup-listing.json"
  "transaction-decoder-listing.json"
  # Cat 7 — DevOps/Agent
  "api-schema-validator-listing.json"
  "openapi-diff-checker-listing.json"
  "webhook-payload-inspector-listing.json"
  "rate-limit-estimator-listing.json"
  "retry-strategy-recommender-listing.json"
  "cache-ttl-recommender-listing.json"
  "mcp-compatibility-validator-listing.json"
  "agent-workflow-validator-listing.json"
  "orchestration-dependency-mapper-listing.json"
  # ── Gap APIs: registered but not yet listed on Orbis ─────────────────────
  "address-validation-listing.json"
  "amazon-product-listing.json"
  "ats-keyword-listing.json"
  "calendar-holiday-listing.json"
  "crypto-price-listing.json"
  "currency-formatting-listing.json"
  "defi-position-risk-listing.json"
  "domain-intelligence-listing.json"
  "favicon-listing.json"
  "flight-status-listing.json"
  "fx-rates-listing.json"
  "hotel-price-listing.json"
  "ip-geolocation-listing.json"
  "logo-finder-listing.json"
  "news-search-listing.json"
  "package-tracking-listing.json"
  "price-monitor-listing.json"
  "qr-barcode-listing.json"
  "resume-parser-listing.json"
  "shipping-rate-listing.json"
  "tax-rate-listing.json"
  "text-extractor-listing.json"
  "timezone-listing.json"
  "unified-ai-completion-listing.json"
  "unit-conversion-listing.json"
  "url-screenshot-diff-listing.json"
  "web-page-extractor-listing.json"
  "website-change-monitor-listing.json"
  # ── Relist: fix 502 baseUrl + 402 payment config ──────────────────────────
  "ai-output-safety-listing.json"
  "token-trust-listing.json"
  "lead-enrichment-listing.json"
  "search-extract-listing.json"
  "robots-txt-parser-listing.json"
  "ip-geolocation-listing.json"
  "wallet-balance-api-listing.json"
)

for FILE in "${LISTINGS[@]}"; do
  NAME=$(python3 -c "import json,sys; d=json.load(open('$FILE')); print((d[0] if isinstance(d,list) else d)['name'])")
  echo "Uploading: $NAME ($FILE)..."

  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "$BASE_URL/listings" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d @"$FILE")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | head -n -1)

  if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
    echo "  OK ($HTTP_CODE)"
    echo "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print('  ID:', d.get('id','n/a'), '| Slug:', d.get('slug','n/a'))" 2>/dev/null
  else
    echo "  FAILED ($HTTP_CODE): $BODY"
  fi
done

echo ""
echo "Done."
