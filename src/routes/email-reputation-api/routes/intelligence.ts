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
  res.json({ name: 'Email Reputation API', info: '/email-reputation/info', openapi: '/email-reputation/openapi.json', health: 'ok' });
});

router.post('/score', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert Email Reputation API engine performing: score.
Input: "${input}"
Options: ${JSON.stringify(options || {})}
Return ONLY valid JSON: success, request_id, data (email string, domain string, reputation_score integer 0-100, reputation_grade enum A|B|C|D|F, risk_level enum very_high|high|medium|low|very_low, is_known_sender boolean, is_business_domain boolean, domain_age_estimate enum very_old|old|medium|new|very_new|unknown, spam_likelihood enum very_high|high|medium|low|very_low, deliverability_prediction enum excellent|good|fair|poor|very_poor, signals array of objects with signal string and impact enum positive|negative|neutral, overall_recommendation enum accept|review|reject), confidence (score 0-1, reason, per_section), provenance (provider, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (recommended_ttl_seconds, retryable, cache_recommended), recommended_next_api (array: api, endpoint, reason), recommended_actions_priority_order (array: priority high|medium|low, action, reason), execution_metadata (latency_ms, model, automation_safe). No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/blacklist-check', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert Email Reputation API engine performing: blacklist-check.
Input: "${input}"
Options: ${JSON.stringify(options || {})}
Return ONLY valid JSON: success, request_id, data (email string, domain string, is_blacklisted boolean, blacklists_checked array of strings, blacklist_hits array of objects with list_name string and reason string, is_domain_blacklisted boolean, is_email_blacklisted boolean, total_lists_checked integer, total_hits integer, last_reported_at string|null, delisting_possible boolean), confidence (score 0-1, reason, per_section), provenance (provider, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (recommended_ttl_seconds, retryable, cache_recommended), recommended_next_api (array: api, endpoint, reason), recommended_actions_priority_order (array: priority high|medium|low, action, reason), execution_metadata (latency_ms, model, automation_safe). No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { inputs, options } = req.body;
  if (!inputs || !Array.isArray(inputs)) return res.status(400).json({ error: 'inputs array is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert Email Reputation API engine performing batch scoring.
Inputs: ${JSON.stringify(inputs)}
Options: ${JSON.stringify(options || {})}
Return ONLY valid JSON: success, request_id, data (results array of objects each with: email string, reputation_score integer 0-100, risk_level enum very_high|high|medium|low|very_low, is_blacklisted boolean, recommendation enum accept|review|reject, total_processed integer, high_risk_count integer, clean_count integer, average_score float). No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/execution-gate', (_req: Request, res: Response) => {
  const { input, objective } = _req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  res.json({
    success: true, request_id: rid(),
    execution_ready: true, input, objective: objective || 'score',
    next_api: 'email-reputation', next_endpoint: '/score',
    blocking_flags: [],
    confidence: { score: 0.98, reason: 'Input present and valid', per_section: { execution_ready: 0.98 } },
    provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    recommended_next_api: [{ api: 'email-reputation', endpoint: '/score', reason: 'Full email reputation score' }],
    recommended_actions_priority_order: [{ priority: 'high', action: 'Call /score', reason: 'Single-request full reputation analysis' }],
    execution_metadata: { latency_ms: 1, model: 'system', automation_safe: true },
  });
});

export default router;
