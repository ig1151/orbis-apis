#!/bin/bash

TOKEN=$GITHUB_TOKEN
BASE="https://raw.githubusercontent.com/ig1151"
ROUTES_DIR="src/routes"

REPOS=(
  "strategy-signal-api"
  "prediction-market-api"
  "funding-rate-api"
  "gas-optimizer-api"
  "token-screener-api"
  "market-stress-api"
  "meta-strategy-api"
  "token-unlock-api"
  "agent-identity-api"
  "crypto-narrative-api"
  "defi-risk-api"
  "crypto-alerts-api"
  "agent-skills-api"
  "defi-position-monitor-api"
  "wallet-portfolio-api"
  "liquidation-feed-api"
)

for REPO in "${REPOS[@]}"; do
  echo "📦 Migrating $REPO..."
  SLUG=$(echo "$REPO" | tr '[:upper:]' '[:lower:]')
  DIR="$ROUTES_DIR/$SLUG"
  rm -rf "$DIR"
  mkdir -p "$DIR"

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

# Handle nested repos
for REPO in cross-chain-bridge-api derivatives-api market-correlation-api yield-farming-api derivatives-intelligence-api tokenomics-api; do
  echo "📦 Migrating $REPO (nested)..."
  SLUG=$(echo "$REPO" | tr '[:upper:]' '[:lower:]')
  DIR="$ROUTES_DIR/$SLUG"
  rm -rf "$DIR"
  mkdir -p "$DIR"

  FILES=$(curl -s -H "Authorization: token $TOKEN" \
    "https://api.github.com/repos/ig1151/$REPO/git/trees/main?recursive=1" \
    | python3 -c "
import sys, json
data = json.load(sys.stdin)
for item in data.get('tree', []):
    if item['type'] == 'blob' and item['path'].startswith('$REPO/src/'):
        print(item['path'])
")

  for FILE in $FILES; do
    FILENAME=$(basename "$FILE")
    SUBDIR=$(dirname "$FILE" | sed "s|^$REPO/src/||" | sed "s|^$REPO/src$||")
    if [ -n "$SUBDIR" ] && [ "$SUBDIR" != "$FILE" ]; then
      DEST="$DIR/$SUBDIR"
    else
      DEST="$DIR"
    fi
    mkdir -p "$DEST"
    curl -s -H "Authorization: token $TOKEN" \
      "https://raw.githubusercontent.com/ig1151/$REPO/main/$FILE" \
      -o "$DEST/$FILENAME"
    echo "  ✅ $FILE → $DEST/$FILENAME"
  done
done

echo "🎉 Migration complete!"
