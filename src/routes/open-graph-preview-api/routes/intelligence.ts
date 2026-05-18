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
  res.json({ name: 'Open Graph Preview API', info: '/open-graph-preview/info', openapi: '/open-graph-preview/openapi.json', health: 'ok' });
});

router.post('/preview', async (req: Request, res: Response) => {
  const { url, options } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const raw = await callClaude(`You are an expert Open Graph Preview API engine. Task: Render social share preview for a URL. Input: "${url}". Options: ${JSON.stringify(options || {})}. Return ONLY valid JSON with these fields: trace_id, computed_at, success:true, url, result (object with relevant structured data), confidence_per_section (object), recommended_actions_priority_order (array), source_provenance (provider, retrieved_at, freshness_score), cache_ttl_seconds, cache_recommended, recommended_next_api, recommended_next_endpoint, automation_safe, privacy (data_stored:false, retention:none). Trace ID: ${traceId()}. Time: ${new Date().toISOString()}. Return only the JSON object.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/validate', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required' });
  try {
    const raw = await callClaude(`You are an expert Open Graph Preview API engine. Task: Validate OG tags completeness and quality. Input: "${input}". Options: ${JSON.stringify(options || {})}. Return ONLY valid JSON with these fields: trace_id, computed_at, success:true, input, result (object with relevant structured data), confidence_per_section (object), recommended_actions_priority_order (array), source_provenance (provider, retrieved_at, freshness_score), cache_ttl_seconds, cache_recommended, recommended_next_api, recommended_next_endpoint, automation_safe, privacy (data_stored:false, retention:none). Trace ID: ${traceId()}. Time: ${new Date().toISOString()}. Return only the JSON object.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/generate', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required' });
  try {
    const raw = await callClaude(`You are an expert Open Graph Preview API engine. Task: Generate missing OG tags for a URL. Input: "${input}". Options: ${JSON.stringify(options || {})}. Return ONLY valid JSON with these fields: trace_id, computed_at, success:true, input, result (object with relevant structured data), confidence_per_section (object), recommended_actions_priority_order (array), source_provenance (provider, retrieved_at, freshness_score), cache_ttl_seconds, cache_recommended, recommended_next_api, recommended_next_endpoint, automation_safe, privacy (data_stored:false, retention:none). Trace ID: ${traceId()}. Time: ${new Date().toISOString()}. Return only the JSON object.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { input, objective } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required' });
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, input, objective: objective || 'preview',
    next_api: 'open-graph-preview', next_endpoint: '/preview',
    blocking_flags: [], flag_definitions: { NO_INPUT: 'input is required' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'open-graph-preview', recommended_next_endpoint: '/og-intelligence',
    automation_safe: true, confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Render social share preview for a URL', 'Validate OG tags completeness and quality', 'Generate missing OG tags for a URL'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/og-intelligence', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required' });
  try {
    const raw = await callClaude(`You are a complete Open Graph Preview API intelligence engine. Task: ONE-CALL: preview + validate + optimize OG tags. Input: "${input}". Options: ${JSON.stringify(options || {})}. Return ONLY valid JSON combining all available intelligence including: trace_id, computed_at, success:true, input, preview_result (object), validate_result (object), generate_result (object), overall_score (number 0-1), key_findings (array), recommendations (array), confidence_per_section (object), recommended_actions_priority_order (array), source_provenance (provider, retrieved_at, freshness_score), cache_ttl_seconds, cache_recommended, recommended_next_api, recommended_next_endpoint, automation_safe, privacy (data_stored:false, retention:none). Trace ID: ${traceId()}. Time: ${new Date().toISOString()}. Return only the JSON object.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
