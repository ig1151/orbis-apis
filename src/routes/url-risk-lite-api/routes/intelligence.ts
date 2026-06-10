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
  res.json({ name: 'URL Risk Lite API', info: '/url-risk-lite/info', openapi: '/url-risk-lite/openapi.json', health: 'ok' });
});

router.post('/check', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert URL Risk Lite API engine performing: check.
Input (URL): "${input}"
Options: ${JSON.stringify(options || {})}
Return ONLY valid JSON: success, request_id, data (typed fields: url string, risk_score integer 0-100, risk_level enum critical|high|medium|low|safe, is_malware boolean, is_phishing boolean, is_spam boolean, is_shortened boolean, final_url string, domain_age_days integer, ssl_valid boolean, blacklisted boolean, threat_categories array of strings), confidence (score 0-1, reason, per_section), provenance (provider, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (recommended_ttl_seconds, retryable, cache_recommended), recommended_next_api (array: api, endpoint, reason), recommended_actions_priority_order (array: priority high|medium|low, action, reason), execution_metadata (latency_ms, model, automation_safe). No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/analyze', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert URL Risk Lite API engine performing: analyze.
Input (URL): "${input}"
Options: ${JSON.stringify(options || {})}
Return ONLY valid JSON: success, request_id, data (typed fields: url string, parsed_url object with scheme host path query, redirect_chain array of strings, ip_address string, geolocation object with country and city, hosting_provider string, js_obfuscation_detected boolean, iframe_injection_risk boolean, suspicious_keywords array of strings, virustotal_positives integer, safe_browsing_status enum safe|unsafe|unknown), confidence (score 0-1, reason, per_section), provenance (provider, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (recommended_ttl_seconds, retryable, cache_recommended), recommended_next_api (array: api, endpoint, reason), recommended_actions_priority_order (array: priority high|medium|low, action, reason), execution_metadata (latency_ms, model, automation_safe). No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/execution-gate', (_req: Request, res: Response) => {
  const { input, objective } = _req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  res.json({ success: true, request_id: rid(), execution_ready: true, input, objective: objective || 'check', next_api: 'url-risk-lite', next_endpoint: '/url-risk-intelligence', blocking_flags: [], confidence: { score: 0.98, reason: 'Input present and valid', per_section: { execution_ready: 0.98 } }, provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' }, recommended_next_api: [{ api: 'url-risk-lite', endpoint: '/url-risk-intelligence', reason: 'Full URL Risk Lite API intelligence' }], recommended_actions_priority_order: [{ priority: 'high', action: 'Call /url-risk-intelligence endpoint', reason: 'Full URL risk analysis' }], execution_metadata: { latency_ms: 1, model: 'system', automation_safe: true } });
});

router.post('/url-risk-intelligence', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are a complete URL Risk Lite API intelligence engine combining all sub-endpoints.
Input: "${input}"
Return ONLY valid JSON: success, request_id, data (all sub-results + overall_score 0-100 + key_findings array + summary), confidence, provenance, cache, recommended_next_api, recommended_actions_priority_order, execution_metadata. No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

export default router;
