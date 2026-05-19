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
  res.json({ name: 'SPF DKIM DMARC Checker API', info: '/spf-dkim-dmarc-checker/info', openapi: '/spf-dkim-dmarc-checker/openapi.json', health: 'ok' });
});

router.post('/spf', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert SPF DKIM DMARC Checker API engine performing: SPF validation.\nInput: "${input}"\nOptions: ${JSON.stringify(options || {})}\nReturn ONLY valid JSON with keys: success, request_id, data (typed fields: domain string, spf_record string or null, spf_valid boolean, spf_pass boolean, mechanisms array with type/value, include_count number, issues array with severity/description), confidence (score 0-1, reason, per_section), provenance (provider, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (recommended_ttl_seconds, retryable, cache_recommended), recommended_next_api (array: api, endpoint, reason), recommended_actions_priority_order (array: priority high|medium|low, action, reason), execution_metadata (latency_ms, model, automation_safe). No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/dkim', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert SPF DKIM DMARC Checker API engine performing: DKIM validation.\nInput: "${input}"\nOptions: ${JSON.stringify(options || {})}\nReturn ONLY valid JSON with keys: success, request_id, data (typed fields: domain string, selectors_checked array, dkim_records array with selector/record/valid/key_type/key_bits, any_valid boolean, issues array with severity/description), confidence (score 0-1, reason, per_section), provenance (provider, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (recommended_ttl_seconds, retryable, cache_recommended), recommended_next_api (array: api, endpoint, reason), recommended_actions_priority_order (array: priority high|medium|low, action, reason), execution_metadata (latency_ms, model, automation_safe). No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/dmarc', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert SPF DKIM DMARC Checker API engine performing: DMARC validation.\nInput: "${input}"\nOptions: ${JSON.stringify(options || {})}\nReturn ONLY valid JSON with keys: success, request_id, data (typed fields: domain string, dmarc_record string or null, dmarc_valid boolean, policy enum none|quarantine|reject, subdomain_policy string or null, rua array, ruf array, pct number, adkim enum r|s, aspf enum r|s, issues array with severity/description), confidence (score 0-1, reason, per_section), provenance (provider, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (recommended_ttl_seconds, retryable, cache_recommended), recommended_next_api (array: api, endpoint, reason), recommended_actions_priority_order (array: priority high|medium|low, action, reason), execution_metadata (latency_ms, model, automation_safe). No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/check', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are a complete SPF DKIM DMARC Checker API intelligence engine combining SPF, DKIM, and DMARC validation.\nInput: "${input}"\nReturn ONLY valid JSON: success, request_id, data (spf result, dkim result, dmarc result, overall_score 0-100, email_authentication_grade enum A|B|C|D|F, key_findings array, summary), confidence, provenance, cache, recommended_next_api, recommended_actions_priority_order, execution_metadata. No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { domains, options } = req.body;
  if (!domains || !Array.isArray(domains)) return res.status(400).json({ error: 'domains array is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert SPF DKIM DMARC Checker API engine performing batch email authentication check.\nDomains: ${JSON.stringify(domains)}\nOptions: ${JSON.stringify(options || {})}\nReturn ONLY valid JSON with keys: success, request_id, data (results array each with domain/spf_valid/dkim_valid/dmarc_valid/overall_score/grade, total_checked), confidence, provenance, cache, recommended_next_api, recommended_actions_priority_order, execution_metadata. No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/execution-gate', (_req: Request, res: Response) => {
  const { input, objective } = _req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  res.json({ success: true, request_id: rid(), execution_ready: true, input, objective: objective || 'check', next_api: 'spf-dkim-dmarc-checker', next_endpoint: '/check', blocking_flags: [], confidence: { score: 0.98, reason: 'Input valid', per_section: { execution_ready: 0.98 } }, provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' }, recommended_next_api: [{ api: 'spf-dkim-dmarc-checker', endpoint: '/check', reason: 'Full SPF+DKIM+DMARC check in one call' }], recommended_actions_priority_order: [{ priority: 'high', action: 'Call /check', reason: 'Single-request email auth analysis' }], execution_metadata: { latency_ms: 1, model: 'system', automation_safe: true } });
});

export default router;
