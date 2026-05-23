import { Router, Request, Response } from 'express';
import { logger } from '../logger';

const router = Router();
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

router.get('/', (_req, res) => {
  res.json({
    name: ' API',
    info: '/market-signal-v2/info',
    openapi: '/market-signal-v2/openapi.json',
    health: 'ok'
  });
});
const MODEL = 'anthropic/claude-sonnet-4-5';

async function callClaude(prompt: string, maxTokens = 1200): Promise<Record<string, unknown>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!response.ok) throw new Error(`OpenRouter error: ${response.status}`);
  const data = await response.json() as { choices: { message: { content: string } }[] };
  try {
    const raw = data.choices[0].message.content ?? '{}';
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch { return { raw: data.choices[0].message.content }; }
}

// ── POST /analyze ─────────────────────────────────────────────────────────────
router.post('/analyze', async (req: Request, res: Response) => {
  const { input, context } = req.body;
  if (!input) { res.status(400).json({ error: 'Provide input' }); return; }
  const start = Date.now();
  try {
    const data = await callClaude(`You are an expert market-signal-v2 analysis engine. Analyze the input and return ONLY a valid JSON object with relevant structured fields.
${context ? `Context: ${context}` : ''}
Input: ${JSON.stringify(input)}
Return only the JSON object:`);
    res.json({ endpoint: 'analyze', data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'analyze', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /analyze-market-signal-v2 (one-call workflow) ─────────────────────────────────
router.post('/analyze-market-signal-v2', async (req: Request, res: Response) => {
  const { input, context } = req.body;
  if (!input) { res.status(400).json({ error: 'Provide input' }); return; }
  const start = Date.now();
  try {
    const data = await callClaude(`You are a complete market-signal-v2 intelligence engine. Perform a full analysis and return ONLY a valid JSON object with ALL relevant fields including:
- summary: string
- confidence: number (0-1)
- risk_level: string (high|medium|low)
- key_findings: array of strings
- recommended_action: string
- execute: boolean (should agent proceed?)
- blocking_flags: array of strings
- next_api: string
- next_endpoint: string
${context ? `Context: ${context}` : ''}
Input: ${JSON.stringify(input)}
Return only the JSON object:`, 2000) as Record<string, unknown>;
    res.json({
      endpoint: 'analyze-market-signal-v2',
      execution_ready: data.execute === true,
      next_api: data.next_api ?? 'autopilot',
      next_endpoint: data.next_endpoint ?? '/should-execute',
      data,
      metadata: { latency_ms: Date.now() - start, estimated_cost: 0.008, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'analyze-market-signal-v2', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /execution-gate ──────────────────────────────────────────────────────
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { input, context } = req.body;
  if (!input) { res.status(400).json({ error: 'Provide input' }); return; }
  const start = Date.now();
  try {
    const data = await callClaude(`You are an autonomous agent execution gate for market-signal-v2. Determine whether the agent should proceed and return ONLY a valid JSON object with these keys:
- execute: boolean
- confidence: number (0-1)
- risk_level: string (high|medium|low)
- blocking_flags: array of strings
- recommended_action: string
- next_api: string
- next_endpoint: string
${context ? `Context: ${context}` : ''}
Input: ${JSON.stringify(input)}
Return only the JSON object:`) as Record<string, unknown>;
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
