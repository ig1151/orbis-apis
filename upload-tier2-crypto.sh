#!/bin/bash
# Upload Tier 2 crypto API listings to Orbis
# Usage: ORBIS_API_KEY=your_key bash upload-tier2-crypto.sh

if [ -z "$ORBIS_API_KEY" ]; then
  echo "Error: ORBIS_API_KEY not set"
  exit 1
fi

ORBIS_URL="https://api.orbisapi.com/v1/listings"

upload() {
  local name="$1"
  local file="$2"
  echo "Uploading $name..."
  response=$(curl -s -w "\n%{http_code}" -X POST "$ORBIS_URL" \
    -H "Authorization: Bearer $ORBIS_API_KEY" \
    -H "Content-Type: application/json" \
    -d @"$file")
  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | head -1)
  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo "  ✅ $name uploaded (HTTP $http_code)"
  else
    echo "  ❌ $name failed (HTTP $http_code): $body"
  fi
}

upload "Lending Rates API" "lending-rates-listing.json"
upload "Borrowing Rates API" "borrowing-rates-listing.json"
upload "TVL Analytics API" "tvl-analytics-listing.json"
upload "Honeypot Scanner API" "honeypot-scanner-listing.json"
upload "NFT Collection Analytics API" "nft-collection-analytics-listing.json"
upload "AI Trade Confidence API" "ai-trade-confidence-listing.json"

echo ""
echo "Done uploading Tier 2 crypto APIs."
