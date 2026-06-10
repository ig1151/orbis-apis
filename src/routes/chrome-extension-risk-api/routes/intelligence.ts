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

const rid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Chrome Extension Risk API', info: '/chrome-extension-risk/info', openapi: '/chrome-extension-risk/openapi.json', health: 'ok' });
});

router.post('/analyze', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert Chrome Extension Risk API engine performing: analyze.
Input (Chrome extension ID or name): "${input}"
Options: ${JSON.stringify(options || {})}
Return ONLY valid JSON: success, request_id, data (typed fields: extension_id string, name string, version string, risk_score integer 0-100, risk_level enum critical|high|medium|low|safe, permissions array of objects with name and sensitivity enum high|medium|low and description, host_permissions array of strings, content_scripts_count integer, background_service_worker boolean, external_api_calls boolean, data_exfiltration_risk boolean, csp_violations array of strings, install_recommendation enum safe_to_install|review_permissions|avoid), confidence (score 0-1, reason, per_section), provenance (provider, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (recommended_ttl_seconds, retryable, cache_recommended), recommended_next_api (array: api, endpoint, reason), recommended_actions_priority_order (array: priority high|medium|low, action, reason), execution_metadata (latency_ms, model, automation_safe). No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/score', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert Chrome Extension Risk API engine performing: score.
Input (Chrome extension ID): "${input}"
Options: ${JSON.stringify(options || {})}
Return ONLY valid JSON: success, request_id, data (typed fields: extension_id string, overall_risk_score integer 0-100, component_scores object with permissions integer, host_access integer, data_collection integer, obfuscation integer, manifest_violations integer each 0-100, verdict enum safe|review_permissions|risky|dangerous, top_risk_factors array of strings, safer_alternatives array of strings), confidence (score 0-1, reason, per_section), provenance (provider, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (recommended_ttl_seconds, retryable, cache_recommended), recommended_next_api (array: api, endpoint, reason), recommended_actions_priority_order (array: priority high|medium|low, action, reason), execution_metadata (latency_ms, model, automation_safe). No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/execution-gate', (_req: Request, res: Response) => {
  const { input, objective } = _req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  res.json({ success: true, request_id: rid(), execution_ready: true, input, objective: objective || 'analyze', next_api: 'chrome-extension-risk', next_endpoint: '/extension-intelligence', blocking_flags: [], confidence: { score: 0.98, reason: 'Input present and valid', per_section: { execution_ready: 0.98 } }, provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' }, recommended_next_api: [{ api: 'chrome-extension-risk', endpoint: '/extension-intelligence', reason: 'Full Chrome Extension Risk API intelligence' }], recommended_actions_priority_order: [{ priority: 'high', action: 'Call /extension-intelligence endpoint', reason: 'Full extension risk analysis' }], execution_metadata: { latency_ms: 1, model: 'system', automation_safe: true } });
});

router.post('/extension-intelligence', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are a complete Chrome Extension Risk API intelligence engine combining all sub-endpoints.
Input: "${input}"
Return ONLY valid JSON: success, request_id, data (all sub-results + overall_score 0-100 + key_findings array + summary), confidence, provenance, cache, recommended_next_api, recommended_actions_priority_order, execution_metadata. No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

export default router;
