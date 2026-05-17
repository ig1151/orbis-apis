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
  # Batch 1 failures
  "maps-places-listing.json"
  "sports-scores-listing.json"
  "twitter-post-lookup-listing.json"
  "sentiment-listing.json"
  "entity-extraction-listing.json"
  # Batch 3 failures
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
