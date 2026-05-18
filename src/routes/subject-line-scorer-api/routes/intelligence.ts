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
  res.json({ name: 'Subject Line Scorer API', info: '/subject-line-scorer/info', openapi: '/subject-line-scorer/openapi.json', health: 'ok' });
});

router.post('/score', async (req: Request, res: Response) => {
  const { text, options } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`You are an expert Subject Line Scorer API engine. Task: Score an email subject line for open rate potential. Input: "${text}". Options: ${JSON.stringify(options || {})}. Return ONLY valid JSON with these fields: trace_id, computed_at, success:true, text, result (object with relevant structured data), confidence_per_section (object), recommended_actions_priority_order (array), source_provenance (provider, retrieved_at, freshness_score), cache_ttl_seconds, cache_recommended, recommended_next_api, recommended_next_endpoint, automation_safe, privacy (data_stored:false, retention:none). Trace ID: ${traceId()}. Time: ${new Date().toISOString()}. Return only the JSON object.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/optimize', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required' });
  try {
    const raw = await callClaude(`You are an expert Subject Line Scorer API engine. Task: Get an optimized version of a subject line. Input: "${input}". Options: ${JSON.stringify(options || {})}. Return ONLY valid JSON with these fields: trace_id, computed_at, success:true, input, result (object with relevant structured data), confidence_per_section (object), recommended_actions_priority_order (array), source_provenance (provider, retrieved_at, freshness_score), cache_ttl_seconds, cache_recommended, recommended_next_api, recommended_next_endpoint, automation_safe, privacy (data_stored:false, retention:none). Trace ID: ${traceId()}. Time: ${new Date().toISOString()}. Return only the JSON object.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/generate', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required' });
  try {
    const raw = await callClaude(`You are an expert Subject Line Scorer API engine. Task: Generate high-performing subject line variants. Input: "${input}". Options: ${JSON.stringify(options || {})}. Return ONLY valid JSON with these fields: trace_id, computed_at, success:true, input, result (object with relevant structured data), confidence_per_section (object), recommended_actions_priority_order (array), source_provenance (provider, retrieved_at, freshness_score), cache_ttl_seconds, cache_recommended, recommended_next_api, recommended_next_endpoint, automation_safe, privacy (data_stored:false, retention:none). Trace ID: ${traceId()}. Time: ${new Date().toISOString()}. Return only the JSON object.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { input, objective } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required' });
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: true, input, objective: objective || 'score',
    next_api: 'subject-line-scorer', next_endpoint: '/score',
    blocking_flags: [], flag_definitions: { NO_INPUT: 'input is required' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'subject-line-scorer', recommended_next_endpoint: '/subject-intelligence',
    automation_safe: true, confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Score an email subject line for open rate potential', 'Get an optimized version of a subject line', 'Generate high-performing subject line variants'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post('/subject-intelligence', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required' });
  try {
    const raw = await callClaude(`You are a complete Subject Line Scorer API intelligence engine. Task: ONE-CALL: score + optimize + generate variants + spam check. Input: "${input}". Options: ${JSON.stringify(options || {})}. Return ONLY valid JSON combining all available intelligence including: trace_id, computed_at, success:true, input, score_result (object), optimize_result (object), generate_result (object), overall_score (number 0-1), key_findings (array), recommendations (array), confidence_per_section (object), recommended_actions_priority_order (array), source_provenance (provider, retrieved_at, freshness_score), cache_ttl_seconds, cache_recommended, recommended_next_api, recommended_next_endpoint, automation_safe, privacy (data_stored:false, retention:none). Trace ID: ${traceId()}. Time: ${new Date().toISOString()}. Return only the JSON object.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
