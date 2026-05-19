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

const rid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Page Title Optimizer API', info: '/page-title-optimizer/info', openapi: '/page-title-optimizer/openapi.json', health: 'ok' });
});

router.post('/analyze', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert Page Title Optimizer API engine performing: analyze.
Input: "${input}"
Options: ${JSON.stringify(options || {})}
Return ONLY a valid JSON object with these exact top-level keys — no markdown, no prose: success (boolean true), request_id (uuid v4 string), data (object with: title string, character_count integer, word_count integer, pixel_width_estimate integer, is_truncated_in_serp boolean, has_brand_name boolean, has_primary_keyword boolean, keyword_position enum beginning|middle|end|not_present, sentiment enum positive|neutral|negative, issues array of strings, score integer 0-100, length_status enum too_short|optimal|too_long), confidence (object: score 0-1, reason string, per_section object), provenance (object: provider string, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (object: recommended_ttl_seconds integer, retryable boolean, cache_recommended boolean), recommended_next_api (array of objects: api string, endpoint string, reason string), recommended_actions_priority_order (array of objects: priority enum high|medium|low, action string, reason string), execution_metadata (object: latency_ms integer, model string, automation_safe boolean). Return only the JSON object.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/optimize', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert Page Title Optimizer API engine performing: optimize.
Input: "${input}"
Options: ${JSON.stringify(options || {})}
Return ONLY a valid JSON object with these exact top-level keys — no markdown, no prose: success (boolean true), request_id (uuid v4 string), data (object with: original_title string, optimized_titles array of objects each with title string, character_count integer, improvement_score integer 0-100, rationale string, focus_keyword string|null, optimization_strategy enum keyword_front|brand_addition|length_fix|clarity_improvement|power_word_addition, changes_made array of strings), confidence (object: score 0-1, reason string, per_section object), provenance (object: provider string, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (object: recommended_ttl_seconds integer, retryable boolean, cache_recommended boolean), recommended_next_api (array of objects: api string, endpoint string, reason string), recommended_actions_priority_order (array of objects: priority enum high|medium|low, action string, reason string), execution_metadata (object: latency_ms integer, model string, automation_safe boolean). Return only the JSON object.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/execution-gate', (_req: Request, res: Response) => {
  const { input, objective } = _req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  res.json({
    success: true, request_id: rid(),
    execution_ready: true, input, objective: objective || 'analyze',
    next_api: 'page-title-optimizer', next_endpoint: '/title-intelligence',
    blocking_flags: [],
    confidence: { score: 0.98, reason: 'Input present and valid', per_section: { execution_ready: 0.98 } },
    provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    recommended_next_api: [{ api: 'page-title-optimizer', endpoint: '/title-intelligence', reason: 'One-call endpoint for full Page Title Optimizer API intelligence' }],
    recommended_actions_priority_order: [{ priority: 'high', action: 'Call /title-intelligence for full intelligence', reason: 'Single-request full analysis combining analyze and optimize' }],
    execution_metadata: { latency_ms: 1, model: 'system', automation_safe: true },
  });
});

router.post('/title-intelligence', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are a complete Page Title Optimizer API intelligence engine. Combine analyze and optimize into one comprehensive page title intelligence response.
Input: "${input}"
Options: ${JSON.stringify(options || {})}
Return ONLY a valid JSON object with these exact top-level keys — no markdown, no prose: success (boolean true), request_id (uuid v4 string), data (object including: analyze sub-object, optimize sub-object, overall_score integer 0-100, key_findings array of strings, summary string), confidence (object: score 0-1, reason string, per_section object), provenance (object: provider string, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (object: recommended_ttl_seconds integer, retryable boolean, cache_recommended boolean), recommended_next_api (array of objects: api string, endpoint string, reason string), recommended_actions_priority_order (array of objects: priority enum high|medium|low, action string, reason string), execution_metadata (object: latency_ms integer, model string, automation_safe boolean). Return only the JSON object.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

export default router;
