#!/bin/bash

# Upload 6 Tier 1 crypto API listings to Orbis
# Usage: ORBIS_API_KEY=your_key bash upload-tier1-crypto.sh

API_KEY=${ORBIS_API_KEY:-""}
BASE_URL="https://api.orbisapi.com"

if [ -z "$API_KEY" ]; then
  echo "Error: ORBIS_API_KEY is not set"
  echo "Usage: ORBIS_API_KEY=your_key bash upload-tier1-crypto.sh"
  exit 1
fi

LISTINGS=(
  "whale-wallet-tracker-listing.json"
  "smart-money-flow-listing.json"
  "meme-coin-intelligence-listing.json"
  "cross-exchange-arbitrage-listing.json"
  "market-dominance-listing.json"
  "token-holder-distribution-listing.json"
)

PASS=0
FAIL=0

for file in "${LISTINGS[@]}"; do
  if [ ! -f "$file" ]; then
    echo "⚠️  File not found: $file (skipping)"
    continue
  fi

  name=$(python3 -c "import json; d=json.load(open('$file')); print(d[0]['name'])" 2>/dev/null || echo "$file")
  response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/listings" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d @"$file")

  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | head -1)

  if [[ "$http_code" -ge 200 && "$http_code" -lt 300 ]]; then
    echo "✅ $name ($http_code)"
    PASS=$((PASS + 1))
  else
    echo "❌ $name ($http_code) — $body"
    FAIL=$((FAIL + 1))
  fi
done

echo ""
echo "=== DONE ==="
echo "✅ Uploaded: $PASS"
echo "❌ Failed:   $FAIL"
