#!/bin/bash
# Upload the Crypto Risk & Execution Suite (11 APIs) to Orbis, one listing at a time.
# Usage: ORBIS_API_KEY=your_key bash upload-crypto-risk-suite.sh

if [ -z "$ORBIS_API_KEY" ]; then
  echo "Error: ORBIS_API_KEY not set"
  echo "Usage: ORBIS_API_KEY=your_key bash upload-crypto-risk-suite.sh"
  exit 1
fi

INPUT="crypto-risk-suite-orbis-upload.json"

if [ ! -f "$INPUT" ]; then
  echo "Error: $INPUT not found"
  exit 1
fi

echo "Uploading 11 Crypto Risk & Execution Suite listings from $INPUT..."

python3 - <<'PYEOF'
import json, subprocess, os

api_key = os.environ["ORBIS_API_KEY"]
data = json.load(open("crypto-risk-suite-orbis-upload.json"))

ok = 0
fail = 0
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
        ok += 1
        slug = ""
        try:
            d = json.loads(body)
            d = d[0] if isinstance(d, list) else d
            slug = d.get("slug", "")
        except Exception:
            pass
        print(f"  ✅ {name} (HTTP {http_code}) {('slug=' + slug) if slug else ''}")
    else:
        fail += 1
        print(f"  ❌ {name} (HTTP {http_code}): {body[:200]}")

print(f"\nDone. {ok} uploaded, {fail} failed.")
PYEOF
