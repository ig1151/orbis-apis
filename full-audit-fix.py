import re

with open('src/index.ts', 'r') as f:
    content = f.read()

# ── Fix 1: Deduplicate routerMap entries ──────────────────────────────────────
# Find the routerMap block
router_map_match = re.search(r'const routerMap[^=]+=\s*\{(.+?)\};', content, re.DOTALL)
openapi_map_match = re.search(r'const openapiMap[^=]+=\s*\{(.+?)\};', content, re.DOTALL)

def dedup_map(block):
    entries = re.findall(r"  '([\w-]+)':\s*(\w+),", block)
    seen = {}
    for slug, var in entries:
        if slug not in seen:
            seen[slug] = var
    return '\n'.join(f"  '{slug}': {var}," for slug, var in seen.items())

if router_map_match:
    deduped = dedup_map(router_map_match.group(1))
    content = content[:router_map_match.start(1)] + '\n' + deduped + '\n' + content[router_map_match.end(1):]
    print(f"✅ Deduped routerMap")

# Re-parse after first replacement
with open('src/index.ts', 'w') as f:
    f.write(content)

with open('src/index.ts', 'r') as f:
    content = f.read()

openapi_map_match = re.search(r'const openapiMap[^=]+=\s*\{(.+?)\};', content, re.DOTALL)
if openapi_map_match:
    deduped = dedup_map(openapi_map_match.group(1))
    content = content[:openapi_map_match.start(1)] + '\n' + deduped + '\n' + content[openapi_map_match.end(1):]
    print(f"✅ Deduped openapiMap")

with open('src/index.ts', 'w') as f:
    f.write(content)

print("✅ Done deduplication")
