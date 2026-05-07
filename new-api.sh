#!/bin/bash
# Usage: ./new-api.sh <api-name> "<description>"
# Example: ./new-api.sh pdf-extraction "PDF to structured JSON extraction for autonomous agents"

API_NAME=$1
DESCRIPTION=${2:-"Agent-native $1 API"}
SLUG=$(echo $API_NAME | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
CAMEL=$(echo $SLUG | sed 's/-\([a-z]\)/\U\1/g')
DIR="src/routes/${SLUG}-api"

if [ -z "$API_NAME" ]; then
  echo "Usage: ./new-api.sh <api-name> <description>"
  exit 1
fi

echo "🚀 Scaffolding $SLUG..."
mkdir -p $DIR/routes

# ── logger.ts ─────────────────────────────────────────────────────────────────
cat > $DIR/logger.ts << EOF
import pino from 'pino';
export const logger = pino({ name: '${SLUG}-api' });
EOF

# ── routes/intelligence.ts ────────────────────────────────────────────────────
cat > $DIR/routes/intelligence.ts << EOF
import { Router, Request, Response } from 'express';
import { logger } from '../logger';

const router = Router();
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4-5';

async function callClaude(prompt: string, maxTokens = 1200): Promise<Record<string, unknown>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${apiKey}\` },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!response.ok) throw new Error(\`OpenRouter error: \${response.status}\`);
  const data = await response.json() as { choices: { message: { content: string } }[] };
  try {
    const raw = data.choices[0].message.content ?? '{}';
    return JSON.parse(raw.replace(/\`\`\`json|\`\`\`/g, '').trim());
  } catch { return { raw: data.choices[0].message.content }; }
}

// ── POST /analyze ─────────────────────────────────────────────────────────────
router.post('/analyze', async (req: Request, res: Response) => {
  const { input, context } = req.body;
  if (!input) { res.status(400).json({ error: 'Provide input' }); return; }
  const start = Date.now();
  try {
    const data = await callClaude(\`You are an expert ${SLUG} analysis engine. Analyze the input and return ONLY a valid JSON object with relevant structured fields.
\${context ? \`Context: \${context}\` : ''}
Input: \${JSON.stringify(input)}
Return only the JSON object:\`);
    res.json({ endpoint: 'analyze', data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'analyze', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /execution-gate ──────────────────────────────────────────────────────
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { input, context } = req.body;
  if (!input) { res.status(400).json({ error: 'Provide input' }); return; }
  const start = Date.now();
  try {
    const data = await callClaude(\`You are an autonomous agent execution gate for ${SLUG}. Determine whether the agent should proceed and return ONLY a valid JSON object with these keys:
- execute: boolean
- confidence: number (0-1)
- risk_level: string (high|medium|low)
- blocking_flags: array of strings
- recommended_action: string
- next_api: string
- next_endpoint: string
\${context ? \`Context: \${context}\` : ''}
Input: \${JSON.stringify(input)}
Return only the JSON object:\`) as Record<string, unknown>;
    res.json({
      endpoint: 'execution-gate',
      execution_ready: data.execute === true,
      next_api: data.next_api ?? 'autopilot',
      next_endpoint: data.next_endpoint ?? '/should-execute',
      data,
      metadata: { latency_ms: Date.now() - start, estimated_cost: 0.004, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'execution-gate', err }, message);
    res.status(500).json({ error: message });
  }
});

export default router;
EOF

# ── routes/openapi.ts ─────────────────────────────────────────────────────────
cat > $DIR/routes/openapi.ts << EOF
import { Router } from 'express';
const router = Router();
router.get('/', (_req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Agent ${API_NAME} API',
      version: '1.0.0',
      description: '${DESCRIPTION}',
      'x-agent-callable': true,
      'x-monetization-grade': 'A',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/${SLUG}', description: 'Production' }],
    paths: {
      '/analyze': { post: { summary: 'Analyze input and return structured intelligence', tags: ['Intelligence'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { input: { type: 'string' }, context: { type: 'string' } }, required: ['input'] } } } }, responses: { 200: { description: 'Structured analysis result' } } } },
      '/execution-gate': { post: { summary: 'Gate autonomous agent actions', tags: ['Execution'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { input: { type: 'string' }, context: { type: 'string' } }, required: ['input'] } } } }, responses: { 200: { description: 'execution_ready, next_api, blocking_flags, metadata' } } } },
    },
  });
});
export default router;
EOF

# ── Wire into index.ts using Python (no sed multiline issues) ─────────────────
python3 << PYEOF
slug = '${SLUG}'
camel = '${CAMEL}'
api_name = '${API_NAME}'
description = '${DESCRIPTION}'

with open('src/index.ts', 'r') as f:
    content = f.read()

# Add imports at top
imports = f"import {camel}Router from './{DIR}/routes/intelligence';\nimport {camel}OpenapiRouter from './{DIR}/routes/openapi';\n"
content = imports + content

# Add routes + info before 404 handler
new_routes = f"""
// ── {api_name} ──────────────────────────────────────────────────────────────
app.use('/{slug}/openapi.json', {camel}OpenapiRouter);
app.use('/{slug}', {camel}Router);
app.get('/{slug}/info', (_req, res) => res.json({{
  name: 'Agent {api_name} API',
  slug: '{slug}',
  version: 'v1',
  status: 'agent',
  monetization_grade: 'A',
  category: 'ai-ml',
  description: '{description}',
  baseUrl: 'https://orbis-apis.onrender.com/{slug}',
  websiteUrl: 'https://orbis-apis.onrender.com',
  openapi: 'https://orbis-apis.onrender.com/{slug}/openapi.json',
  endpoints: [
    {{ method: 'POST', path: '/analyze', description: 'Analyze input and return structured intelligence.' }},
    {{ method: 'POST', path: '/execution-gate', description: 'Gate autonomous agent actions. Returns execute bool, blocking flags, next API.' }},
  ],
}}));

"""
content = content.replace("app.use((_req, res) => {\n  res.status(404)", new_routes + "app.use((_req, res) => {\n  res.status(404)")

with open('src/index.ts', 'w') as f:
    f.write(content)

print(f"✅ {slug} wired into index.ts")
PYEOF

echo ""
echo "✅ $SLUG scaffolded and wired!"
echo "📝 Now customize: $DIR/routes/intelligence.ts"
echo "🔨 Then run: npm run build && git add -A && git commit -m 'feat: add $SLUG API' && git push"
