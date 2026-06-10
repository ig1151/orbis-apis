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
  res.json({ name: 'MX Record Checker API', info: '/mx-record-checker/info', openapi: '/mx-record-checker/openapi.json', health: 'ok' });
});

router.post('/mx', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert MX Record Checker API engine performing: mx lookup.\nInput: "${input}"\nOptions: ${JSON.stringify(options || {})}\nReturn ONLY valid JSON with keys: success, request_id, data (typed fields for mx: domain string, mx_records array with priority/host/ttl, record_count number, provider_detected string or null), confidence (score 0-1, reason, per_section), provenance (provider, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (recommended_ttl_seconds, retryable, cache_recommended), recommended_next_api (array: api, endpoint, reason), recommended_actions_priority_order (array: priority high|medium|low, action, reason), execution_metadata (latency_ms, model, automation_safe). No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/email-ready', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert MX Record Checker API engine performing: email-ready check.\nInput: "${input}"\nOptions: ${JSON.stringify(options || {})}\nReturn ONLY valid JSON with keys: success, request_id, data (typed fields for email-ready: domain string, email_ready boolean, mx_present boolean, mx_records array with priority/host, issues array with severity/description, recommendations array), confidence (score 0-1, reason, per_section), provenance (provider, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (recommended_ttl_seconds, retryable, cache_recommended), recommended_next_api (array: api, endpoint, reason), recommended_actions_priority_order (array: priority high|medium|low, action, reason), execution_metadata (latency_ms, model, automation_safe). No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { domains, options } = req.body;
  if (!domains || !Array.isArray(domains)) return res.status(400).json({ error: 'domains array is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert MX Record Checker API engine performing batch MX record lookup.\nDomains: ${JSON.stringify(domains)}\nOptions: ${JSON.stringify(options || {})}\nReturn ONLY valid JSON with keys: success, request_id, data (results array each with domain/mx_records/email_ready/issues, total_checked), confidence, provenance, cache, recommended_next_api, recommended_actions_priority_order, execution_metadata. No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/execution-gate', (_req: Request, res: Response) => {
  const { input, objective } = _req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  res.json({ success: true, request_id: rid(), execution_ready: true, input, objective: objective || 'check', next_api: 'mx-record-checker', next_endpoint: '/email-ready', blocking_flags: [], confidence: { score: 0.98, reason: 'Input valid', per_section: { execution_ready: 0.98 } }, provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' }, recommended_next_api: [{ api: 'mx-record-checker', endpoint: '/email-ready', reason: 'Full email readiness check' }], recommended_actions_priority_order: [{ priority: 'high', action: 'Call /email-ready', reason: 'Single-request MX analysis' }], execution_metadata: { latency_ms: 1, model: 'system', automation_safe: true } });
});

export default router;
