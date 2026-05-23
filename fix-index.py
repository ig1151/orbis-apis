import re

with open('src/index.ts', 'r') as f:
    content = f.read()

lines = content.split('\n')

# ── 1. Collect all import lines ───────────────────────────────────────────────
import_lines = [l for l in lines if l.startswith('import ')]

# ── 2. Extract bootstrap block (lines 124–355 roughly) ───────────────────────
# Find everything between the last import and first app.use() route
bootstrap_start = next(i for i,l in enumerate(lines) if 'const app = express()' in l)
# Grab from const app to just before first route registration
bootstrap_block = []
for i in range(bootstrap_start, len(lines)):
    l = lines[i]
    # Stop when we hit the first route app.use that isn't middleware
    if re.match(r"app\.use\('/[a-z]", l) or re.match(r"app\.get\('/[a-z]", l):
        break
    bootstrap_block.append(l)

# ── 3. Extract the 404 handler and listen call ────────────────────────────────
tail_block = []
in_tail = False
for l in lines:
    if 'app.use((_req' in l or 'app.listen' in l:
        in_tail = True
    if in_tail:
        tail_block.append(l)

# ── 4. Extract all route registrations ───────────────────────────────────────
# Pattern: groups of (app.use openapi) + (app.use router) + (app.get info)
route_pattern = re.compile(
    r"app\.use\('(/[\w-]+)/openapi\.json'[^)]+\);\s*\n"
    r"app\.use\('(/[\w-]+)'[^)]+\);\s*\n"
    r"app\.get\('(/[\w-]+)/info'[^;]+;\s*",
    re.MULTILINE
)

# Find all unique route slugs and their router variable names
use_pattern = re.compile(r"app\.use\('/([\w-]+)',\s*(\w+)\);")
openapi_pattern = re.compile(r"app\.use\('/([\w-]+)/openapi\.json',\s*(\w+)\);")
info_pattern = re.compile(r"app\.get\('/([\w-]+)/info',")

slugs_seen = []
router_map = {}  # slug -> {router, openapi}
openapi_map = {}

for m in use_pattern.finditer(content):
    slug, var = m.group(1), m.group(2)
    if slug not in ('api', ) and slug not in router_map:
        router_map[slug] = var

for m in openapi_pattern.finditer(content):
    slug, var = m.group(1), m.group(2)
    openapi_map[slug] = var

# Also handle the unified-ai special case
unified_pattern = re.compile(r"app\.use\('/api/unified-ai',\s*(\w+)\);")
unified_matches = unified_pattern.findall(content)

print(f"Found {len(router_map)} routes")
print(f"Found {len(openapi_map)} openapi routes")

# ── 5. Extract info JSON for each route ───────────────────────────────────────
info_json_pattern = re.compile(r"app\.get\('/([\w-]+)/info',\s*\(_req,\s*res\)\s*=>\s*res\.json\((\{.+?\})\)\);", re.DOTALL)
info_map = {}
for m in info_json_pattern.finditer(content):
    info_map[m.group(1)] = m.group(2)

# ── 6. Build new index.ts ─────────────────────────────────────────────────────
out = []

# All imports (deduplicated)
seen_imports = set()
for l in import_lines:
    if l not in seen_imports:
        out.append(l)
        seen_imports.add(l)

out.append('')
out.append('// ─────────────────────────────────────────────────────────────────')
out.append('// Bootstrap')
out.append('// ─────────────────────────────────────────────────────────────────')
out.extend(bootstrap_block)

out.append('')
out.append('// ─────────────────────────────────────────────────────────────────')
out.append('// O(1) route lookup map — replaces 906 sequential app.use() calls')
out.append('// ─────────────────────────────────────────────────────────────────')
out.append('const routerMap: Record<string, import("express").Router> = {')
for slug, var in router_map.items():
    out.append(f"  '{slug}': {var},")
out.append('};')

out.append('')
out.append('const openapiMap: Record<string, import("express").Router> = {')
for slug, var in openapi_map.items():
    out.append(f"  '{slug}': {var},")
out.append('};')

out.append('''
const infoMap: Record<string, object> = {''')
for slug, json_str in info_map.items():
    out.append(f"  '{slug}': {json_str},")
out.append('};')

out.append('''
// Route dispatcher — O(1) lookup instead of O(906) chain walk
app.use('/:slug/openapi.json', (req, res, next) => {
  const router = openapiMap[req.params.slug];
  if (router) return router(req, res, next);
  next();
});

app.get('/:slug/info', (req, res, next) => {
  const info = infoMap[req.params.slug];
  if (info) return res.json(info);
  next();
});

app.use('/:slug', (req, res, next) => {
  const router = routerMap[req.params.slug];
  if (router) return router(req, res, next);
  next();
});
''')

# Special cases
if unified_matches:
    out.append('// Unified AI special route')
    out.append("app.use('/api/unified-ai', unified_ai_docs);")
    out.append("app.use('/api/unified-ai', unified_ai_router);")

out.append('')
out.extend(tail_block)

new_content = '\n'.join(out)
with open('src/index.ts', 'w') as f:
    f.write(new_content)

print(f"✅ Done! New index.ts has {len(new_content.split(chr(10)))} lines")
print(f"   (was 5408 lines, now ~{len(out)} lines)")
