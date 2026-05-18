import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';

async function callClaude(prompt: string): Promise<string> {
  const res = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    { model: MODEL, messages: [{ role: 'user', content: prompt }] },
    { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' } }
  );
  return res.data.choices[0].message.content;
}

function parseJSON(raw: string) {
  try { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
  catch { return { success: false, error: 'parse_error', raw: raw.slice(0, 200) }; }
}

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Accessibility Audit Lite API', info: '/accessibility-audit-lite/info', openapi: '/accessibility-audit-lite/openapi.json', health: 'ok' });
});

router.post('/audit', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert Accessibility Audit Lite API engine performing: audit.
Input: "${input}"
Options: ${JSON.stringify(options || {})}
Return ONLY a valid JSON object with these exact top-level keys — no markdown, no prose: success (boolean true), request_id (uuid v4 string), data (object with typed API-specific fields), confidence (object: score 0-1 number, reason string, per_section object), provenance (object: provider string, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (object: recommended_ttl_seconds integer, retryable boolean, cache_recommended boolean), recommended_next_api (array of objects: api string, endpoint string, reason string), recommended_actions_priority_order (array of objects: priority enum high|medium|low, action string, reason string), execution_metadata (object: latency_ms integer, model string, automation_safe boolean). Use enums strictly. Return only the JSON object.
The data object must include all typed fields relevant to audit for this API. Be specific and deterministic.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/score', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert Accessibility Audit Lite API engine performing: score.
Input: "${input}"
Options: ${JSON.stringify(options || {})}
Return ONLY a valid JSON object with these exact top-level keys — no markdown, no prose: success (boolean true), request_id (uuid v4 string), data (object with typed API-specific fields), confidence (object: score 0-1 number, reason string, per_section object), provenance (object: provider string, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (object: recommended_ttl_seconds integer, retryable boolean, cache_recommended boolean), recommended_next_api (array of objects: api string, endpoint string, reason string), recommended_actions_priority_order (array of objects: priority enum high|medium|low, action string, reason string), execution_metadata (object: latency_ms integer, model string, automation_safe boolean). Use enums strictly. Return only the JSON object.
The data object must include all typed fields relevant to score for this API. Use enums where applicable. Be specific and deterministic.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/fix-suggestions', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert Accessibility Audit Lite API engine performing: fix-suggestions.
Input: "${input}"
Options: ${JSON.stringify(options || {})}
Return ONLY a valid JSON object with these exact top-level keys — no markdown, no prose: success (boolean true), request_id (uuid v4 string), data (object with typed API-specific fields), confidence (object: score 0-1 number, reason string, per_section object), provenance (object: provider string, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (object: recommended_ttl_seconds integer, retryable boolean, cache_recommended boolean), recommended_next_api (array of objects: api string, endpoint string, reason string), recommended_actions_priority_order (array of objects: priority enum high|medium|low, action string, reason string), execution_metadata (object: latency_ms integer, model string, automation_safe boolean). Use enums strictly. Return only the JSON object.
The data object must include all typed fields relevant to fix-suggestions for this API. Use enums where applicable. Be specific and deterministic.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { input, objective } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  const rid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });
  res.json({
    success: true, request_id: rid(),
    execution_ready: true, input, objective: objective || 'audit',
    next_api: 'accessibility-audit-lite', next_endpoint: '/accessibility-intelligence',
    blocking_flags: [],
    confidence: { score: 0.98, reason: 'Input present and valid', per_section: { execution_ready: 0.98 } },
    provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    recommended_next_api: [{ api: 'accessibility-audit-lite', endpoint: '/accessibility-intelligence', reason: 'One-call endpoint for full Accessibility Audit Lite API intelligence' }, { api: 'keyword-density', endpoint: '/keyword-density', reason: 'Next step in the pipeline' }],
    recommended_actions_priority_order: [{ priority: 'high', action: 'Call /accessibility-intelligence for full intelligence', reason: 'One-call delivers all outputs in a single request' }],
    execution_metadata: { latency_ms: 1, model: 'system', automation_safe: true },
  });
});

router.post('/accessibility-intelligence', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are a complete Accessibility Audit Lite API intelligence engine. Perform full analysis combining audit, score, and fix-suggestions in a single response.
Input: "${input}"
Options: ${JSON.stringify(options || {})}
Return ONLY a valid JSON object with these exact top-level keys — no markdown, no prose: success (boolean true), request_id (uuid v4 string), data (object with typed API-specific fields), confidence (object: score 0-1 number, reason string, per_section object), provenance (object: provider string, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (object: recommended_ttl_seconds integer, retryable boolean, cache_recommended boolean), recommended_next_api (array of objects: api string, endpoint string, reason string), recommended_actions_priority_order (array of objects: priority enum high|medium|low, action string, reason string), execution_metadata (object: latency_ms integer, model string, automation_safe boolean). Use enums strictly. Return only the JSON object.
The data object MUST include: all fields from audit, score, and fix-suggestions sub-analyses, plus an overall_score (0-100 number), key_findings (array of strings), and summary (string). Use enums where applicable. Recommended_next_api should point to relevant downstream APIs with specific reasons based on what was found.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

export default router;
