#!/bin/bash
# Delist 5 stale/superseded Group-C listings whose backing routes return 404.
# Each has a live replacement (or functional equivalent) already on the marketplace.
#
# Usage: ORBIS_API_KEY=your_key bash delist-group-c.sh
#
# NOTE: This performs a hard DELETE /listings/{id}. If your API prefers a
# reversible deactivate, swap the verb for: PATCH /listings/{id} {"isActive":false}

API_KEY=${ORBIS_API_KEY:-""}
BASE_URL="https://api.orbisapi.com"

if [ -z "$API_KEY" ]; then
  echo "Error: ORBIS_API_KEY is not set"
  echo "Usage: ORBIS_API_KEY=your_key bash delist-group-c.sh"
  exit 1
fi

# id | slug | name | replacement
LISTINGS=(
  "e84b1f5d-36fb-49ea-9967-019dd3671527|canonical-url-636389|Canonical URL API|canonical-url-checker (live)"
  "2ab08389-c4b1-478d-8794-7b46f1660165|redirect-chain-6daa61|Redirect Chain API|redirect-chain-analyzer (live)"
  "927c02c8-d1e5-4d3c-a5a7-45e6886d6f1a|email-syntax-cleaner-1a1ab1|Email Syntax Cleaner API|email-syntax-validator (live)"
  "4dcf397e-8f15-43ec-9a97-ccb6b5ed9675|url-expander-6cd4ea|URL Expander API|redirect-chain-analyzer / short-link (functional)"
  "304f9bac-2e4f-42e9-bd47-1ca19f9a6b60|brand-color-extractor-22f0c3|Brand Color Extractor API|color-palette (functional)"
)

for ROW in "${LISTINGS[@]}"; do
  IFS='|' read -r ID SLUG NAME REPLACEMENT <<< "$ROW"
  echo "Delisting: $NAME ($SLUG)  ->  replaced by $REPLACEMENT"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE \
    "$BASE_URL/listings/$ID" \
    -H "Authorization: Bearer $API_KEY")
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | head -n -1)
  if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
    echo "  OK ($HTTP_CODE) — delisted"
  elif [ "$HTTP_CODE" = "404" ]; then
    echo "  ALREADY GONE ($HTTP_CODE)"
  else
    echo "  FAILED ($HTTP_CODE): $(echo "$BODY" | head -c 200)"
  fi
done

echo ""
echo "Done. Re-run x402-test/agent-callable-check.mjs to confirm they no longer appear."
