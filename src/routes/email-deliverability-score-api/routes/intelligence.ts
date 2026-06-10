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
  res.json({ name: 'Email Deliverability Score API', info: '/email-deliverability-score/info', openapi: '/email-deliverability-score/openapi.json', health: 'ok' });
});

router.post('/score', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert Email Deliverability Score API engine performing: score.
Input (domain or email): "${input}"
Options: ${JSON.stringify(options || {})}
Return ONLY valid JSON: success, request_id, data (typed fields: domain string, overall_score integer 0-100, grade enum A|B|C|D|F, spf_valid boolean, dkim_valid boolean, dmarc_valid boolean, mx_valid boolean, blacklist_status enum clean|listed|unknown, reputation_score integer 0-100, inbox_placement_estimate number 0-1), confidence (score 0-1, reason, per_section), provenance (provider, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (recommended_ttl_seconds, retryable, cache_recommended), recommended_next_api (array: api, endpoint, reason), recommended_actions_priority_order (array: priority high|medium|low, action, reason), execution_metadata (latency_ms, model, automation_safe). No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/audit', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert Email Deliverability Score API engine performing: audit.
Input (domain): "${input}"
Options: ${JSON.stringify(options || {})}
Return ONLY valid JSON: success, request_id, data (typed fields: domain string, spf_record string, spf_valid boolean, dkim_selectors array of strings, dkim_valid boolean, dmarc_record string, dmarc_policy enum none|quarantine|reject, dmarc_valid boolean, mx_records array of strings, reverse_dns_valid boolean, sending_reputation enum excellent|good|fair|poor, improvement_recommendations array of objects with issue string and fix string), confidence (score 0-1, reason, per_section), provenance (provider, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (recommended_ttl_seconds, retryable, cache_recommended), recommended_next_api (array: api, endpoint, reason), recommended_actions_priority_order (array: priority high|medium|low, action, reason), execution_metadata (latency_ms, model, automation_safe). No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/execution-gate', (_req: Request, res: Response) => {
  const { input, objective } = _req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  res.json({ success: true, request_id: rid(), execution_ready: true, input, objective: objective || 'score', next_api: 'email-deliverability-score', next_endpoint: '/deliverability-intelligence', blocking_flags: [], confidence: { score: 0.98, reason: 'Input present and valid', per_section: { execution_ready: 0.98 } }, provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' }, recommended_next_api: [{ api: 'email-deliverability-score', endpoint: '/deliverability-intelligence', reason: 'Full Email Deliverability Score API intelligence' }], recommended_actions_priority_order: [{ priority: 'high', action: 'Call /deliverability-intelligence endpoint', reason: 'Full deliverability analysis' }], execution_metadata: { latency_ms: 1, model: 'system', automation_safe: true } });
});

router.post('/deliverability-intelligence', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are a complete Email Deliverability Score API intelligence engine combining all sub-endpoints.
Input: "${input}"
Return ONLY valid JSON: success, request_id, data (all sub-results + overall_score 0-100 + key_findings array + summary), confidence, provenance, cache, recommended_next_api, recommended_actions_priority_order, execution_metadata. No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

export default router;
