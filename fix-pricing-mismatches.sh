#!/bin/bash
# Fix x402 pricing mismatches by updating listings to remove the High Volume tier.
# Orbis has a bug where it uses one tier's price for the 402 response and another
# for validation. Stripping to a single Pay Per Call tier eliminates the ambiguity.
#
# Usage: ORBIS_API_KEY=your_key bash fix-pricing-mismatches.sh

API_KEY=${ORBIS_API_KEY:-""}
BASE_URL="https://api.orbisapi.com"

if [ -z "$API_KEY" ]; then
  echo "Error: ORBIS_API_KEY is not set"
  echo "Usage: ORBIS_API_KEY=your_key bash fix-pricing-mismatches.sh"
  exit 1
fi

patch_listing() {
  local ID="$1"
  local FILE="$2"
  local NAME="$3"

  echo "Patching: $NAME (ID: $ID)..."

  RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
    "$BASE_URL/listings/$ID" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d @"$FILE")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | head -n -1)

  if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
    echo "  ✅ OK ($HTTP_CODE)"
  else
    # Fallback: try POST (some Orbis versions use POST for updates too)
    echo "  PUT failed ($HTTP_CODE), trying POST..."
    RESPONSE2=$(curl -s -w "\n%{http_code}" -X POST \
      "$BASE_URL/listings" \
      -H "Authorization: Bearer $API_KEY" \
      -H "Content-Type: application/json" \
      -d @"$FILE")
    HTTP_CODE2=$(echo "$RESPONSE2" | tail -1)
    BODY2=$(echo "$RESPONSE2" | head -n -1)
    if [ "$HTTP_CODE2" -ge 200 ] && [ "$HTTP_CODE2" -lt 300 ]; then
      echo "  ✅ POST OK ($HTTP_CODE2)"
      echo "$BODY2" | python3 -c "import json,sys; d=json.load(sys.stdin); print('  Slug:', d.get('slug','n/a'))" 2>/dev/null
    else
      echo "  ❌ FAILED ($HTTP_CODE2): $(echo $BODY2 | head -c 200)"
    fi
  fi
}

# ── Generate single-item listing files for each affected API ──────────────────
python3 << 'PYEOF'
import json

def extract_and_fix(source_file, api_name, out_file):
    d = json.load(open(source_file))
    items = d if isinstance(d, list) else [d]
    for item in items:
        if item.get('name') == api_name:
            item['tiers'] = [t for t in item.get('tiers', []) if t.get('name') != 'High Volume']
            with open(out_file, 'w') as f:
                json.dump(item, f, indent=2)
            return True
    return False

# 6-crypto batch
for fname, name in [
    ('fear-greed-listing.json', 'Fear & Greed Index API'),
    ('top-movers-listing.json', 'Top Movers API'),
    ('stablecoin-depeg-listing.json', 'Stablecoin Depeg Risk API'),
]:
    d = json.load(open(fname))
    item = d[0] if isinstance(d, list) else d
    item['tiers'] = [t for t in item.get('tiers', []) if t.get('name') != 'High Volume']
    out = fname.replace('.json', '-patch.json')
    with open(out, 'w') as f:
        json.dump(item, f, indent=2)

# Tier 1
for name in ['Smart Money Flow API', 'Meme Coin Intelligence API', 'Market Dominance API']:
    extract_and_fix('tier1-crypto-listings-upload.json', name, f"{name.lower().replace(' ', '-')}-patch.json")

# Tier 2
for name in ['Borrowing Rates API', 'Honeypot Scanner API']:
    extract_and_fix('tier2-crypto-listings-upload.json', name, f"{name.lower().replace(' ', '-')}-patch.json")

# Tier 6 NFT Sniper — create listing with single Pay Per Call tier
sniper = {
    "name": "NFT Sniper Alert API",
    "shortDescription": "Detect below-floor NFT listings and instant flip opportunities with urgency scoring",
    "description": "High-frequency NFT sniper intelligence API for traders, alpha groups, and autonomous NFT execution agents. Detect below-floor listings, rarity-adjusted discounts, instant flip opportunities, urgency levels, capital requirements, and real-time marketplace inefficiencies across OpenSea, Blur, and X2Y2. Optimized for x402 micropayments, Coinbase Bazaar, and agent-native execution workflows.",
    "category": "crypto",
    "baseUrl": "https://orbis-apis.onrender.com/nft-sniper-alert",
    "websiteUrl": "https://orbis-apis.onrender.com",
    "docsUrl": "https://orbis-apis.onrender.com/nft-sniper-alert/openapi.json",
    "openApiSpecUrl": "https://orbis-apis.onrender.com/nft-sniper-alert/openapi.json",
    "logoUrl": "https://orbis-apis.onrender.com/assets/nft-sniper-alert.png",
    "tags": ["nft", "sniper-alert", "below-floor", "flip-opportunities", "x402", "coinbase-bazaar"],
    "tiers": [
        {"name": "Free", "isFree": True, "requestsPerDay": 10, "requestsPerMonth": 300},
        {"name": "Pay Per Call", "isFree": False, "pricingType": "per_call", "pricePerCall": 0.008,
         "endpointPricing": [
             {"method": "GET", "pathPattern": "/listings", "pricePerCallUsdc": 0.008, "description": "Detect below-floor NFT listings"},
             {"method": "GET", "pathPattern": "/watchlist", "pricePerCallUsdc": 0.006, "description": "Monitor watchlist for sniper opportunities"},
             {"method": "GET", "pathPattern": "/lookup", "pricePerCallUsdc": 0.01, "description": "ONE-CALL sniper intelligence for a specific token"}
         ], "requestsPerDay": 50000, "requestsPerMonth": 1500000}
    ],
    "endpoints": [
        {"method": "GET", "path": "/listings", "description": "Detect below-floor NFT listings with urgency scoring"},
        {"method": "GET", "path": "/watchlist", "description": "Monitor watchlist collections for sniper opportunities"},
        {"method": "GET", "path": "/lookup", "description": "ONE-CALL sniper intelligence for a specific token"}
    ]
}
with open('nft-sniper-alert-patch.json', 'w') as f:
    json.dump(sniper, f, indent=2)

# Tier 6 NFT Volume Heatmap
heatmap = {
    "name": "NFT Volume Heatmap API",
    "shortDescription": "NFT trading volume heatmaps, volatility analysis, and optimal entry timing by day and hour",
    "description": "NFT market timing API for trading agents, dashboards, and NFT analytics systems. Analyze collection-level and market-wide NFT volume trends, volatility, liquidity shifts, best entry windows, and optimal trading periods across major NFT marketplaces. Optimized for x402 micropayments, Coinbase Bazaar, and agent-native execution workflows.",
    "category": "crypto",
    "baseUrl": "https://orbis-apis.onrender.com/nft-volume-heatmap",
    "websiteUrl": "https://orbis-apis.onrender.com",
    "docsUrl": "https://orbis-apis.onrender.com/nft-volume-heatmap/openapi.json",
    "openApiSpecUrl": "https://orbis-apis.onrender.com/nft-volume-heatmap/openapi.json",
    "logoUrl": "https://orbis-apis.onrender.com/assets/nft-volume-heatmap.png",
    "tags": ["nft", "volume-heatmap", "market-timing", "volatility", "x402", "coinbase-bazaar"],
    "tiers": [
        {"name": "Free", "isFree": True, "requestsPerDay": 10, "requestsPerMonth": 300},
        {"name": "Pay Per Call", "isFree": False, "pricingType": "per_call", "pricePerCall": 0.005,
         "endpointPricing": [
             {"method": "GET", "pathPattern": "/collection", "pricePerCallUsdc": 0.005, "description": "Collection volume heatmap by day/hour"},
             {"method": "GET", "pathPattern": "/market", "pricePerCallUsdc": 0.004, "description": "Market-wide volume heatmap"},
             {"method": "GET", "pathPattern": "/lookup", "pricePerCallUsdc": 0.006, "description": "ONE-CALL volume intelligence with entry timing"}
         ], "requestsPerDay": 50000, "requestsPerMonth": 1500000}
    ],
    "endpoints": [
        {"method": "GET", "path": "/collection", "description": "Volume heatmap for a specific NFT collection"},
        {"method": "GET", "path": "/market", "description": "Market-wide NFT volume heatmap"},
        {"method": "GET", "path": "/lookup", "description": "ONE-CALL volume intelligence with entry timing"}
    ]
}
with open('nft-volume-heatmap-patch.json', 'w') as f:
    json.dump(heatmap, f, indent=2)

print("All patch files created.")
PYEOF

echo ""
echo "Patching listings via Orbis API..."
echo ""

# Listing IDs from Orbis marketplace (fetched 2026-05-28)
patch_listing "bbb26749-0c1c-4d34-806b-dd67e21e0e5c" "fear-greed-listing-patch.json"     "Fear & Greed Index API"
patch_listing "8ddca3ba-2bdf-4106-9997-c70c16f653a6" "top-movers-listing-patch.json"     "Top Movers API"
patch_listing "00993bff-3b86-47f4-9d5d-45efb9e621ad" "stablecoin-depeg-listing-patch.json" "Stablecoin Depeg Risk API"
patch_listing "1234c020-d356-4a3f-bbdd-fc0777d8bae1" "smart-money-flow-api-patch.json"    "Smart Money Flow API"
patch_listing "2d43ac2f-7262-4921-8ef9-5915418d41c2" "meme-coin-intelligence-api-patch.json" "Meme Coin Intelligence API"
patch_listing "048dbd5d-7dd6-4c12-9d56-58f7e1180340" "market-dominance-api-patch.json"    "Market Dominance API"
patch_listing "0989838a-beeb-468a-88d2-7e741772efca" "borrowing-rates-api-patch.json"     "Borrowing Rates API"
patch_listing "9439d280-b190-42a6-a43a-b462be7f5194" "honeypot-scanner-api-patch.json"    "Honeypot Scanner API"
patch_listing "a5817b72-c0fd-4474-a527-6e3a34054ff7" "nft-sniper-alert-patch.json"        "NFT Sniper Alert API"
patch_listing "484b75e0-9485-42c7-9483-cb90d1d7ac1a" "nft-volume-heatmap-patch.json"      "NFT Volume Heatmap API"

echo ""
echo "Done. Re-run x402 tests in ~60s for cache to clear."
