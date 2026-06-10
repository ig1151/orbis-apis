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
  res.json({ name: 'Toxicity Detection API', info: '/toxicity-detection/info', openapi: '/toxicity-detection/openapi.json', health: 'ok' });
});

router.post('/detect', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert Toxicity Detection API engine performing: detect.
Input: "${input}"
Options: ${JSON.stringify(options || {})}
Return ONLY valid JSON: success, request_id, data (text string, is_toxic boolean, toxicity_score number 0-1, toxicity_level enum none|low|medium|high|severe, categories object with keys toxic boolean, severe_toxic boolean, obscene boolean, threat boolean, insult boolean, identity_hate boolean, hate_speech boolean, flagged_phrases array of strings, safe_for_work boolean, action_recommended enum allow|review|block), confidence (score 0-1, reason, per_section), provenance (provider, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (recommended_ttl_seconds, retryable, cache_recommended), recommended_next_api (array: api, endpoint, reason), recommended_actions_priority_order (array: priority high|medium|low, action, reason), execution_metadata (latency_ms, model, automation_safe). No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { inputs, options } = req.body;
  if (!inputs || !Array.isArray(inputs)) return res.status(400).json({ error: 'inputs array is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert Toxicity Detection API engine performing: batch detect.
Inputs: ${JSON.stringify(inputs)}
Options: ${JSON.stringify(options || {})}
Return ONLY valid JSON: success, request_id, data (results array of objects each with text string, is_toxic boolean, toxicity_score number 0-1, toxicity_level enum none|low|medium|high|severe, action_recommended enum allow|review|block, total_count integer, toxic_count integer, safe_count integer, review_count integer), confidence (score 0-1, reason, per_section), provenance (provider, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (recommended_ttl_seconds, retryable, cache_recommended), recommended_next_api (array: api, endpoint, reason), recommended_actions_priority_order (array: priority high|medium|low, action, reason), execution_metadata (latency_ms, model, automation_safe). No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/execution-gate', (_req: Request, res: Response) => {
  const { input, objective } = _req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  res.json({
    success: true, request_id: rid(),
    execution_ready: true, input, objective: objective || 'analyze',
    next_api: 'toxicity-detection', next_endpoint: '/toxicity-intelligence',
    blocking_flags: [],
    confidence: { score: 0.98, reason: 'Input present and valid', per_section: { execution_ready: 0.98 } },
    provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    recommended_next_api: [{ api: 'toxicity-detection', endpoint: '/toxicity-intelligence', reason: 'Full Toxicity Detection API intelligence in one call' }],
    recommended_actions_priority_order: [{ priority: 'high', action: 'Call /toxicity-intelligence', reason: 'Single-request full analysis' }],
    execution_metadata: { latency_ms: 1, model: 'system', automation_safe: true },
  });
});

router.post('/toxicity-intelligence', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are a complete Toxicity Detection API intelligence engine combining all sub-endpoints.
Input: "${input}"
Options: ${JSON.stringify(options || {})}
Return ONLY valid JSON: success, request_id, data (detect sub-object, overall_score integer 0-100, key_findings array of strings, summary string), confidence, provenance, cache, recommended_next_api, recommended_actions_priority_order, execution_metadata. No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

export default router;
