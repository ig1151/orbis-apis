#!/bin/bash
# Fix x402 pricing mismatches — re-uploads 10 listings with correct single-tier pricing.
# Removes the High Volume tier ambiguity so 402 response and validation always agree.
#
# Usage: ORBIS_API_KEY=your_key bash fix-pricing-mismatches.sh

API_KEY=${ORBIS_API_KEY:-""}
BASE_URL="https://api.orbisapi.com"

if [ -z "$API_KEY" ]; then
  echo "Error: ORBIS_API_KEY is not set"
  echo "Usage: ORBIS_API_KEY=your_key bash fix-pricing-mismatches.sh"
  exit 1
fi

upload_listing() {
  local FILE="$1"
  local ID="$2"
  local NAME="$3"

  echo "Uploading: $NAME..."

  # Try PUT first (update existing)
  RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
    "$BASE_URL/listings/$ID" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d @"$FILE")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)

  if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
    echo "  ✅ Updated ($HTTP_CODE)"
    return
  fi

  # Fallback: POST (create / upsert)
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "$BASE_URL/listings" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d @"$FILE")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | head -n -1)

  if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
    SLUG=$(echo "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('slug','n/a'))" 2>/dev/null)
    echo "  ✅ Posted ($HTTP_CODE) — slug: $SLUG"
  else
    echo "  ❌ FAILED ($HTTP_CODE): $(echo $BODY | head -c 200)"
  fi
}

# Listing IDs from Orbis marketplace (2026-05-28)
upload_listing "fear-greed-listing.json"             "bbb26749-0c1c-4d34-806b-dd67e21e0e5c" "Fear & Greed Index API"
upload_listing "top-movers-listing.json"             "8ddca3ba-2bdf-4106-9997-c70c16f653a6" "Top Movers API"
upload_listing "smart-money-flow-listing.json"       "1234c020-d356-4a3f-bbdd-fc0777d8bae1" "Smart Money Flow API"
upload_listing "meme-coin-intelligence-listing.json" "2d43ac2f-7262-4921-8ef9-5915418d41c2" "Meme Coin Intelligence API"
upload_listing "market-dominance-listing.json"       "048dbd5d-7dd6-4c12-9d56-58f7e1180340" "Market Dominance API"
upload_listing "borrowing-rates-listing.json"        "0989838a-beeb-468a-88d2-7e741772efca" "Borrowing Rates API"
upload_listing "honeypot-scanner-listing.json"       "9439d280-b190-42a6-a43a-b462be7f5194" "Honeypot Scanner API"
upload_listing "nft-sniper-alert-listing.json"       "a5817b72-c0fd-4474-a527-6e3a34054ff7" "NFT Sniper Alert API"
upload_listing "nft-volume-heatmap-listing.json"     "484b75e0-9485-42c7-9483-cb90d1d7ac1a" "NFT Volume Heatmap API"
upload_listing "nft-arbitrage-t4-listing.json"       "0c23a86d-7db6-4c01-95f5-71688a63474b" "NFT Arbitrage API (Tier 4)"

echo ""
echo "Done. Wait ~60s for Orbis cache to clear, then re-run:"
echo "  PRIVATE_KEY=0x... node x402-test/call-tier1-6-retry.mjs"
