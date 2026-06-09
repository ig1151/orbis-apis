#!/bin/bash

# Usage: ORBIS_API_KEY=your_key bash upload-relist.sh
# Uploads the 7 relisted APIs: 4 with fixed baseUrl (502) + 3 with reset x402 payment config (402)

API_KEY=${ORBIS_API_KEY:-""}
BASE_URL="https://api.orbisapi.com"

if [ -z "$API_KEY" ]; then
  echo "Error: ORBIS_API_KEY is not set"
  echo "Usage: ORBIS_API_KEY=your_key bash upload-relist.sh"
  exit 1
fi

LISTINGS=(
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
echo "Done. Re-run x402 tests after upload to verify."
