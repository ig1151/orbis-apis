#!/bin/bash
set -e

if [ -z "$ORBIS_API_KEY" ]; then
  echo "Error: ORBIS_API_KEY not set"
  exit 1
fi

python3 - <<'EOF'
import json, subprocess, sys

with open('tier5-crypto-listings-upload.json') as f:
    listings = json.load(f)

for listing in listings:
    name = listing['name']
    print(f"Uploading: {name}")
    result = subprocess.run([
        'curl', '-s', '-w', '\n%{http_code}',
        '-X', 'POST',
        'https://api.orbisapi.com/v1/listings',
        '-H', 'Content-Type: application/json',
        '-H', f'Authorization: Bearer {__import__("os").environ["ORBIS_API_KEY"]}',
        '-d', json.dumps(listing)
    ], capture_output=True, text=True)
    lines = result.stdout.strip().split('\n')
    status = lines[-1]
    body = '\n'.join(lines[:-1])
    if status.startswith('2'):
        print(f"  OK ({status})")
    else:
        print(f"  FAILED ({status}): {body}")
        sys.exit(1)

print("All Tier 5 listings uploaded successfully.")
EOF
