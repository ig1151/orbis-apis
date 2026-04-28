#!/bin/bash

TOKEN=$GITHUB_TOKEN
BASE="https://raw.githubusercontent.com/ig1151"
ROUTES_DIR="src/routes"

REPOS=(
  "action-api"
  "agent-memory-api"
  "agent-workflow-api"
  "ai-output-safety-api"
  "autopilot-api"
  "browser-task-api"
  "company-research-api"
  "crypto-agent-sdk"
  "crypto-news-impact-api"
  "dev-utilities-api"
  "document-intelligence-api"
  "email-validation-api"
  "extraction-api"
  "identity-intelligence-api"
  "image-to-content-api"
  "ip-intelligence-api"
  "lead-discovery-api"
  "lead-enrichment-api"
  "lead-quality-api"
  "market-intelligence-api"
  "market-signal-api"
  "market-trigger-api"
  "market-webhook-api"
  "onchain-signal-api"
  "phone-validation-api"
  "portfolio-rebalance-api"
  "search-extract-api"
  "stablecoin-yield-api"
  "strategy-execution-api"
  "token-trust-api"
  "trust-api"
  "Unified-Decision-API"
  "user-risk-api"
  "wallet-intelligence-api"
  "website-monitor-api"
)

for REPO in "${REPOS[@]}"; do
  echo "📦 Migrating $REPO..."
  SLUG=$(echo "$REPO" | tr '[:upper:]' '[:lower:]')
  DIR="$ROUTES_DIR/$SLUG"
  rm -rf "$DIR"
  mkdir -p "$DIR"

  # Get only blob (file) paths, not trees (directories)
  FILES=$(curl -s -H "Authorization: token $TOKEN" \
    "https://api.github.com/repos/ig1151/$REPO/git/trees/main?recursive=1" \
    | python3 -c "
import sys, json
data = json.load(sys.stdin)
for item in data.get('tree', []):
    if item['type'] == 'blob' and item['path'].startswith('src/'):
        print(item['path'])
")

  if [ -z "$FILES" ]; then
    echo "  ⚠️  No src files found for $REPO — skipping"
    continue
  fi

  for FILE in $FILES; do
    FILENAME=$(basename "$FILE")
    SUBDIR=$(dirname "$FILE" | sed 's|^src/||' | sed 's|^src$||')
    if [ -n "$SUBDIR" ]; then
      DEST="$DIR/$SUBDIR"
    else
      DEST="$DIR"
    fi
    mkdir -p "$DEST"
    curl -s -H "Authorization: token $TOKEN" \
      "$BASE/$REPO/main/$FILE" \
      -o "$DEST/$FILENAME"
    echo "  ✅ $FILE → $DEST/$FILENAME"
  done
done

echo ""
echo "🎉 Migration complete!"
