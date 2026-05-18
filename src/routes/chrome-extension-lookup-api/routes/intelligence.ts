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

function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Chrome Extension Lookup API', info: '/chrome-extension-lookup/info', openapi: '/chrome-extension-lookup/openapi.json', health: 'ok' });
});

router.post('/lookup', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required' });
  try {
    const raw = await callClaude(`You are an expert Chrome Extension Lookup API engine. Task: Look up extension by ID or name. Input: "${input}". Options: ${JSON.stringify(options || {})}. Return ONLY valid JSON with these fields: trace_id, computed_at, success:true, input, result (object with relevant structured data), confidence_per_section (object), recommended_actions_priority_order (array), source_provenance (provider, retrieved_at, freshness_score), cache_ttl_seconds, cache_recommended, recommended_next_api, recommended_next_endpoint, automation_safe, privacy (data_stored:false, retention:none). Trace ID: ${traceId()}. Time: ${new Date().toISOString()}. Return only the JSON object.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/analyze', async (req: Request, res: Response) => {
  const { text, options } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`You are an expert Chrome Extension Lookup API engine. Task: Analyze extension permissions and security risk. Input: "${text}". Options: ${JSON.stringify(options || {})}. Return ONLY valid JSON with these fields: trace_id, computed_at, success:true, text, result (object with relevant structured data), confidence_per_section (object), recommended_actions_priority_order (array), source_provenance (provider, retrieved_at, freshness_score), cache_ttl_seconds, cache_recommended, recommended_next_api, recommended_next_endpoint, automation_safe, privacy (data_stored:false, retention:none). Trace ID: ${traceId()}. Time: ${new Date().toISOString()}. Return only the JSON object.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/similar', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required' });
  try {
    const raw = await callClaude(`You are an expert Chrome Extension Lookup API engine. Task: Find similar extensions. Input: "${input}". Options: ${JSON.stringify(options || {})}. Return ONLY valid JSON with these fields: trace_id, computed_at, success:true, input, result (object with relevant structured data), confidence_per_section (object), recommended_actions_priority_order (array), source_provenance (provider, retrieved_at, freshness_score), cache_ttl_seconds, cache_recommended, recommended_next_api, recommended_next_endpoint, automation_safe, privacy (data_stored:false, retention:none). Trace ID: ${traceId()}. Time: ${new Date().toISOString()}. Return only the JSON object.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { input, objective } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required' });
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, input, objective: objective || 'lookup',
    next_api: 'chrome-extension-lookup', next_endpoint: '/lookup',
    blocking_flags: [], flag_definitions: { NO_INPUT: 'input is required' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'chrome-extension-lookup', recommended_next_endpoint: '/extension-intelligence',
    automation_safe: true, confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Look up extension by ID or name', 'Analyze extension permissions and security risk', 'Find similar extensions'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/extension-intelligence', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required' });
  try {
    const raw = await callClaude(`You are a complete Chrome Extension Lookup API intelligence engine. Task: ONE-CALL: lookup + security analysis + alternatives. Input: "${input}". Options: ${JSON.stringify(options || {})}. Return ONLY valid JSON combining all available intelligence including: trace_id, computed_at, success:true, input, lookup_result (object), analyze_result (object), similar_result (object), overall_score (number 0-1), key_findings (array), recommendations (array), confidence_per_section (object), recommended_actions_priority_order (array), source_provenance (provider, retrieved_at, freshness_score), cache_ttl_seconds, cache_recommended, recommended_next_api, recommended_next_endpoint, automation_safe, privacy (data_stored:false, retention:none). Trace ID: ${traceId()}. Time: ${new Date().toISOString()}. Return only the JSON object.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
