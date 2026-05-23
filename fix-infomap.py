import re
import json

with open('src/index.ts', 'r') as f:
    content = f.read()

# Find and remove the entire infoMap block — we don't need it
# Instead we'll serve /info by delegating to each router's GET /
# which already returns name/info/health

# Remove infoMap declaration
content = re.sub(
    r'\nconst infoMap: Record<string, object> = \{.*?\};\n',
    '\n',
    content,
    flags=re.DOTALL
)

# Replace the infoMap route handler with a simple delegation
content = content.replace(
    """app.get('/:slug/info', (req, res, next) => {
  const info = infoMap[req.params.slug];
  if (info) return res.json(info);
  next();
});""",
    """app.get('/:slug/info', (req, res, next) => {
  const router = routerMap[req.params.slug];
  if (router) {
    // Delegate to the router's own GET / handler
    req.url = '/info';
    return router(req, res, next);
  }
  next();
});"""
)

with open('src/index.ts', 'w') as f:
    f.write(content)

print(f"✅ Fixed. Lines: {len(content.splitlines())}")
