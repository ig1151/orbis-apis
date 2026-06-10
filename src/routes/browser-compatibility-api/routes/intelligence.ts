import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';


function parseJSON(raw: string) {
  try { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
  catch { return { success: false, error: 'parse_error', raw: raw.slice(0, 200) }; }
}

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Browser Compatibility API', info: '/browser-compatibility/info', openapi: '/browser-compatibility/openapi.json', health: 'ok' });
});

router.post('/check', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert Browser Compatibility API engine performing: check.
Input: "${input}"
Options: ${JSON.stringify(options || {})}
Return ONLY a valid JSON object with these exact top-level keys — no markdown, no prose: success (boolean true), request_id (uuid v4 string), data (object with typed API-specific fields), confidence (object: score 0-1 number, reason string, per_section object), provenance (object: provider string, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (object: recommended_ttl_seconds integer, retryable boolean, cache_recommended boolean), recommended_next_api (array of objects: api string, endpoint string, reason string), recommended_actions_priority_order (array of objects: priority enum high|medium|low, action string, reason string), execution_metadata (object: latency_ms integer, model string, automation_safe boolean). Use enums strictly. Return only the JSON object.
The data object must include all typed fields relevant to check for this API. Be specific and deterministic.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/polyfills', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert Browser Compatibility API engine performing: polyfills.
Input: "${input}"
Options: ${JSON.stringify(options || {})}
Return ONLY a valid JSON object with these exact top-level keys — no markdown, no prose: success (boolean true), request_id (uuid v4 string), data (object with typed API-specific fields), confidence (object: score 0-1 number, reason string, per_section object), provenance (object: provider string, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (object: recommended_ttl_seconds integer, retryable boolean, cache_recommended boolean), recommended_next_api (array of objects: api string, endpoint string, reason string), recommended_actions_priority_order (array of objects: priority enum high|medium|low, action string, reason string), execution_metadata (object: latency_ms integer, model string, automation_safe boolean). Use enums strictly. Return only the JSON object.
The data object must include all typed fields relevant to polyfills for this API. Use enums where applicable. Be specific and deterministic.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/report', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert Browser Compatibility API engine performing: report.
Input: "${input}"
Options: ${JSON.stringify(options || {})}
Return ONLY a valid JSON object with these exact top-level keys — no markdown, no prose: success (boolean true), request_id (uuid v4 string), data (object with typed API-specific fields), confidence (object: score 0-1 number, reason string, per_section object), provenance (object: provider string, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (object: recommended_ttl_seconds integer, retryable boolean, cache_recommended boolean), recommended_next_api (array of objects: api string, endpoint string, reason string), recommended_actions_priority_order (array of objects: priority enum high|medium|low, action string, reason string), execution_metadata (object: latency_ms integer, model string, automation_safe boolean). Use enums strictly. Return only the JSON object.
The data object must include all typed fields relevant to report for this API. Use enums where applicable. Be specific and deterministic.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { input, objective } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  const rid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });
  res.json({
    success: true, request_id: rid(),
    execution_ready: true, input, objective: objective || 'check',
    next_api: 'browser-compatibility', next_endpoint: '/compat-intelligence',
    blocking_flags: [],
    confidence: { score: 0.98, reason: 'Input present and valid', per_section: { execution_ready: 0.98 } },
    provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    recommended_next_api: [{ api: 'browser-compatibility', endpoint: '/compat-intelligence', reason: 'One-call endpoint for full Browser Compatibility API intelligence' }, { api: 'dns-propagation', endpoint: '/dns-propagation', reason: 'Next step in the pipeline' }],
    recommended_actions_priority_order: [{ priority: 'high', action: 'Call /compat-intelligence for full intelligence', reason: 'One-call delivers all outputs in a single request' }],
    execution_metadata: { latency_ms: 1, model: 'system', automation_safe: true },
  });
});

router.post('/compat-intelligence', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are a complete Browser Compatibility API intelligence engine. Perform full analysis combining check, polyfills, and report in a single response.
Input: "${input}"
Options: ${JSON.stringify(options || {})}
Return ONLY a valid JSON object with these exact top-level keys — no markdown, no prose: success (boolean true), request_id (uuid v4 string), data (object with typed API-specific fields), confidence (object: score 0-1 number, reason string, per_section object), provenance (object: provider string, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (object: recommended_ttl_seconds integer, retryable boolean, cache_recommended boolean), recommended_next_api (array of objects: api string, endpoint string, reason string), recommended_actions_priority_order (array of objects: priority enum high|medium|low, action string, reason string), execution_metadata (object: latency_ms integer, model string, automation_safe boolean). Use enums strictly. Return only the JSON object.
The data object MUST include: all fields from check, polyfills, and report sub-analyses, plus an overall_score (0-100 number), key_findings (array of strings), and summary (string). Use enums where applicable. Recommended_next_api should point to relevant downstream APIs with specific reasons based on what was found.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

export default router;
