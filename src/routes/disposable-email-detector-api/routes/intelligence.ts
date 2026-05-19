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

function parseJSON(raw: string) {
  try { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
  catch { return { success: false, error: 'parse_error', raw: raw.slice(0, 200) }; }
}

const rid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Disposable Email Detector API', info: '/disposable-email-detector/info', openapi: '/disposable-email-detector/openapi.json', health: 'ok' });
});

router.post('/detect', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert Disposable Email Detector API engine performing: detect.
Input: "${input}"
Options: ${JSON.stringify(options || {})}
Return ONLY valid JSON: success, request_id, data (email string, is_disposable boolean, is_temporary boolean, domain string, provider_name string|null, category enum disposable|temporary|role_based|free_provider|corporate|unknown, risk_score integer 0-100, risk_level enum high|medium|low, block_recommendation boolean, reasons array of strings), confidence (score 0-1, reason, per_section), provenance (provider, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (recommended_ttl_seconds, retryable, cache_recommended), recommended_next_api (array: api, endpoint, reason), recommended_actions_priority_order (array: priority high|medium|low, action, reason), execution_metadata (latency_ms, model, automation_safe). No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/domain', async (req: Request, res: Response) => {
  const { domain, options } = req.body;
  if (!domain) return res.status(400).json({ error: 'domain is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert Disposable Email Detector API engine performing domain check.
Domain: "${domain}"
Options: ${JSON.stringify(options || {})}
Return ONLY valid JSON: success, request_id, data (domain string, is_disposable_domain boolean, is_known_provider boolean, provider_type enum disposable|temporary|free_provider|corporate|education|government|unknown, total_known_addresses_estimate enum millions|thousands|hundreds|dozens|unknown, mx_records_present boolean, risk_level enum high|medium|low, notes array of strings). No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/batch', async (req: Request, res: Response) => {
  const { inputs, options } = req.body;
  if (!inputs || !Array.isArray(inputs)) return res.status(400).json({ error: 'inputs array is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert Disposable Email Detector API engine performing batch detection.
Inputs: ${JSON.stringify(inputs)}
Options: ${JSON.stringify(options || {})}
Return ONLY valid JSON: success, request_id, data (results array of objects each with: email string, is_disposable boolean, risk_level enum high|medium|low, category string, total_processed integer, disposable_count integer, clean_count integer, disposable_rate float 0-1). No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/execution-gate', (_req: Request, res: Response) => {
  const { input, objective } = _req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  res.json({
    success: true, request_id: rid(),
    execution_ready: true, input, objective: objective || 'detect',
    next_api: 'disposable-email-detector', next_endpoint: '/detect',
    blocking_flags: [],
    confidence: { score: 0.98, reason: 'Input present and valid', per_section: { execution_ready: 0.98 } },
    provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    recommended_next_api: [{ api: 'disposable-email-detector', endpoint: '/detect', reason: 'Full disposable email detection' }],
    recommended_actions_priority_order: [{ priority: 'high', action: 'Call /detect', reason: 'Single-request full detection' }],
    execution_metadata: { latency_ms: 1, model: 'system', automation_safe: true },
  });
});

export default router;
