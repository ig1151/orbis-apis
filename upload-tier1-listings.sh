#!/bin/bash
# Upload Tier 1 crypto API listings to Orbis (one at a time from the combined file)
# Usage: ORBIS_API_KEY=your_key bash upload-tier1-listings.sh

if [ -z "$ORBIS_API_KEY" ]; then
  echo "Error: ORBIS_API_KEY not set"
  exit 1
fi

ORBIS_URL="https://api.orbisapi.com/v1/listings"
INPUT="tier1-crypto-listings-upload.json"

echo "Splitting and uploading 6 Tier 1 listings from $INPUT..."

python3 - <<'PYEOF'
import json, subprocess, sys, os

api_key = os.environ["ORBIS_API_KEY"]
data = json.load(open("tier1-crypto-listings-upload.json"))

for api in data:
    name = api["name"]
    payload = json.dumps([api])
    result = subprocess.run(
        ["curl", "-s", "-w", "\n%{http_code}", "-X", "POST",
         "https://api.orbisapi.com/v1/listings",
         "-H", f"Authorization: Bearer {api_key}",
         "-H", "Content-Type: application/json",
         "-d", payload],
        capture_output=True, text=True
    )
    lines = result.stdout.strip().split("\n")
    http_code = lines[-1]
    body = "\n".join(lines[:-1])
    if http_code.startswith("2"):
        print(f"  ✅ {name} (HTTP {http_code})")
    else:
        print(f"  ❌ {name} (HTTP {http_code}): {body[:200]}")

PYEOF
