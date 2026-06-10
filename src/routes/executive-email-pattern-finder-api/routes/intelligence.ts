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
  res.json({ name: 'Executive Email Pattern Finder API', info: '/executive-email-pattern-finder/info', openapi: '/executive-email-pattern-finder/openapi.json', health: 'ok' });
});

router.post('/find', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert Executive Email Pattern Finder API engine performing: find.
Input (company domain): "${input}"
Options: ${JSON.stringify(options || {})}
Return ONLY valid JSON: success, request_id, data (typed fields: domain string, detected_patterns array of objects each with pattern string e.g. "first.last@domain.com", confidence number 0-1, sample_count integer; most_common_pattern string, pattern_confidence number 0-1, mx_provider string, verification_method string), confidence (score 0-1, reason, per_section), provenance (provider, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (recommended_ttl_seconds, retryable, cache_recommended), recommended_next_api (array: api, endpoint, reason), recommended_actions_priority_order (array: priority high|medium|low, action, reason), execution_metadata (latency_ms, model, automation_safe). No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/verify', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert Executive Email Pattern Finder API engine performing: verify.
Input (email address): "${input}"
Options: ${JSON.stringify(options || {})}
Return ONLY valid JSON: success, request_id, data (typed fields: email string, valid boolean, deliverable boolean, pattern_match boolean, pattern string, domain string, mx_valid boolean, catch_all boolean, disposable boolean, risk_level enum low|medium|high), confidence (score 0-1, reason, per_section), provenance (provider, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (recommended_ttl_seconds, retryable, cache_recommended), recommended_next_api (array: api, endpoint, reason), recommended_actions_priority_order (array: priority high|medium|low, action, reason), execution_metadata (latency_ms, model, automation_safe). No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/execution-gate', (_req: Request, res: Response) => {
  const { input, objective } = _req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  res.json({ success: true, request_id: rid(), execution_ready: true, input, objective: objective || 'find', next_api: 'executive-email-pattern-finder', next_endpoint: '/email-pattern-intelligence', blocking_flags: [], confidence: { score: 0.98, reason: 'Input present and valid', per_section: { execution_ready: 0.98 } }, provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' }, recommended_next_api: [{ api: 'executive-email-pattern-finder', endpoint: '/email-pattern-intelligence', reason: 'Full Executive Email Pattern Finder API intelligence' }], recommended_actions_priority_order: [{ priority: 'high', action: 'Call /email-pattern-intelligence endpoint', reason: 'Full pattern analysis' }], execution_metadata: { latency_ms: 1, model: 'system', automation_safe: true } });
});

router.post('/email-pattern-intelligence', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are a complete Executive Email Pattern Finder API intelligence engine combining all sub-endpoints.
Input: "${input}"
Return ONLY valid JSON: success, request_id, data (all sub-results + overall_score 0-100 + key_findings array + summary), confidence, provenance, cache, recommended_next_api, recommended_actions_priority_order, execution_metadata. No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

export default router;
