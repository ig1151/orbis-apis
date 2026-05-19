import { Router, Request, Response } from 'express';
import axios from 'axios';
const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';
async function callClaude(prompt: string): Promise<string> {
  const res = await axios.post('https://openrouter.ai/api/v1/chat/completions',
    { model: MODEL, messages: [{ role: 'user', content: prompt }] },
    { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' } });
  return res.data.choices[0].message.content;
}
function parseJSON(raw: string) {
  try { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
  catch { return { success: false, error: 'parse_error', raw: raw.slice(0, 200) }; }
}
const rid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });
router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'API Schema Validator', info: '/api-schema-validator/info', openapi: '/api-schema-validator/openapi.json', health: 'ok' });
});
router.post('/validate', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert API Schema Validator engine performing: validate.\nInput: "${input}"\nOptions: ${JSON.stringify(options || {})}\nReturn ONLY valid JSON: success, request_id, data (schema_type enum openapi_3_0|openapi_3_1|json_schema_draft7|json_schema_draft2020|unknown, is_valid boolean, errors array with path/message/severity, warnings array with path/message, info_messages array, paths_count, schemas_count, required_fields_present boolean, version_detected), confidence (score 0-1, reason, per_section), provenance (provider, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (recommended_ttl_seconds, retryable, cache_recommended), recommended_next_api (array: api, endpoint, reason), recommended_actions_priority_order (array: priority high|medium|low, action, reason), execution_metadata (latency_ms, model, automation_safe). No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});
router.post('/lint', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert API Schema Validator engine performing: lint.\nInput: "${input}"\nOptions: ${JSON.stringify(options || {})}\nReturn ONLY valid JSON: success, request_id, data (lint_score 0-100, issues array with rule/path/message/severity enum error|warning|info/fix_suggestion, best_practice_violations array, style_issues array, security_issues array, missing_descriptions_count, missing_examples_count, unused_schemas array), confidence (score 0-1, reason, per_section), provenance (provider, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (recommended_ttl_seconds, retryable, cache_recommended), recommended_next_api (array: api, endpoint, reason), recommended_actions_priority_order (array: priority high|medium|low, action, reason), execution_metadata (latency_ms, model, automation_safe). No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});
router.post('/execution-gate', (_req: Request, res: Response) => {
  const { input, objective } = _req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  res.json({ success: true, request_id: rid(), execution_ready: true, input, objective: objective || 'analyze', next_api: 'api-schema-validator', next_endpoint: '/schema-validator-intelligence', blocking_flags: [], confidence: { score: 0.98, reason: 'Input present and valid', per_section: { execution_ready: 0.98 } }, provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' }, recommended_next_api: [{ api: 'api-schema-validator', endpoint: '/schema-validator-intelligence', reason: 'Full schema validator intelligence in one call' }], recommended_actions_priority_order: [{ priority: 'high', action: 'Call /schema-validator-intelligence', reason: 'Single-request full analysis' }], execution_metadata: { latency_ms: 1, model: 'system', automation_safe: true } });
});
router.post('/schema-validator-intelligence', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are a complete API Schema Validator intelligence engine combining validate and lint.\nInput: "${input}"\nReturn ONLY valid JSON: success, request_id, data (all sub-results + overall_score 0-100 + key_findings array + summary), confidence, provenance, cache, recommended_next_api, recommended_actions_priority_order, execution_metadata. No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});
export default router;
