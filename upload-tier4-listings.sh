#!/bin/bash
# Upload Tier 4 Arbitrage Suite API listings to Orbis (8 APIs)
# Usage: ORBIS_API_KEY=your_key bash upload-tier4-listings.sh

if [ -z "$ORBIS_API_KEY" ]; then
  echo "Error: ORBIS_API_KEY not set"
  exit 1
fi

INPUT="tier4-crypto-listings-upload.json"

echo "Uploading 8 Tier 4 Arbitrage Suite API listings from $INPUT..."
echo ""

python3 - <<'PYEOF'
import json, subprocess, sys, os

api_key = os.environ["ORBIS_API_KEY"]
data = json.load(open("tier4-crypto-listings-upload.json"))

passed = 0
failed = 0

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
        passed += 1
    else:
        print(f"  ❌ {name} (HTTP {http_code}): {body[:200]}")
        failed += 1

print("")
print("=== DONE ===")
print(f"✅ Uploaded: {passed}")
print(f"❌ Failed:   {failed}")
PYEOF
