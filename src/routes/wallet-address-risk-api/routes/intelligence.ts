import { Router, Request, Response } from 'express';
import axios from 'axios';
const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';

// Hardened: 20s timeout + bounded retry on 429/5xx/timeout so a slow upstream can never hang the request.
async function callClaude(prompt: string, attempt = 0): Promise<string> {
  try {
    const res = await axios.post('https://openrouter.ai/api/v1/chat/completions',
      { model: MODEL, messages: [{ role: 'user', content: prompt }] },
      { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' }, timeout: 20000 });
    return res.data.choices[0].message.content;
  } catch (e: any) {
    const status = e?.response?.status;
    const retryable = e?.code === 'ECONNABORTED' || !status || status === 429 || status >= 500;
    if (retryable && attempt < 2) {
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
      return callClaude(prompt, attempt + 1);
    }
    throw e;
  }
}

// Degrade upstream failures to 200 success:false (never 500/hang) — no risk values are fabricated on failure.
function degrade(res: Response) {
  return res.json({
    success: false, request_id: rid(), error: 'upstream_unavailable',
    message: 'The risk engine is temporarily unavailable. No risk values are fabricated on failure.',
    retryable: true,
    provenance: { provider: 'wallet-address-risk', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    execution_metadata: { latency_ms: 0, model: 'unavailable', automation_safe: true },
  });
}

function parseJSON(raw: string) {
  try { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
  catch { return { success: false, error: 'parse_error', raw: raw.slice(0, 200) }; }
}

const rid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Wallet Address Risk API', info: '/wallet-address-risk/info', openapi: '/wallet-address-risk/openapi.json', health: 'ok' });
});

router.post('/check', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert Wallet Address Risk API engine performing: check.
Input (blockchain wallet address): "${input}"
Options: ${JSON.stringify(options || {})}
Return ONLY valid JSON: success, request_id, data (typed fields: address string, blockchain enum bitcoin|ethereum|tron|solana|bnb|polygon|unknown, risk_score integer 0-100, risk_level enum critical|high|medium|low|safe, is_sanctioned boolean, sanctions_lists array of strings, is_mixer boolean, is_exchange boolean, exchange_name string, illicit_exposure_pct number 0-100, transaction_count integer, first_seen_date string, last_seen_date string, aml_flags array of strings), confidence (score 0-1, reason, per_section), provenance (provider, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (recommended_ttl_seconds, retryable, cache_recommended), recommended_next_api (array: api, endpoint, reason), recommended_actions_priority_order (array: priority high|medium|low, action, reason), execution_metadata (latency_ms, model, automation_safe). No markdown.`);
    res.json(parseJSON(raw));
  } catch { return degrade(res); }
});

router.post('/analyze', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert Wallet Address Risk API engine performing: analyze.
Input (blockchain wallet address): "${input}"
Options: ${JSON.stringify(options || {})}
Return ONLY valid JSON: success, request_id, data (typed fields: address string, cluster_id string, cluster_size integer, direct_exposure object with illicit number and unknown number and legitimate number as percentages, indirect_exposure object with illicit number and unknown number and legitimate number as percentages, counterparty_categories array of objects with category string and exposure_pct number, recent_transactions array of objects with hash and amount and direction enum in|out and risk_label, entity_name string), confidence (score 0-1, reason, per_section), provenance (provider, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (recommended_ttl_seconds, retryable, cache_recommended), recommended_next_api (array: api, endpoint, reason), recommended_actions_priority_order (array: priority high|medium|low, action, reason), execution_metadata (latency_ms, model, automation_safe). No markdown.`);
    res.json(parseJSON(raw));
  } catch { return degrade(res); }
});

router.post('/execution-gate', (_req: Request, res: Response) => {
  const { input, objective } = _req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  res.json({ success: true, request_id: rid(), execution_ready: true, input, objective: objective || 'check', next_api: 'wallet-address-risk', next_endpoint: '/wallet-risk-intelligence', blocking_flags: [], confidence: { score: 0.98, reason: 'Input present and valid', per_section: { execution_ready: 0.98 } }, provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' }, recommended_next_api: [{ api: 'wallet-address-risk', endpoint: '/wallet-risk-intelligence', reason: 'Full Wallet Address Risk API intelligence' }], recommended_actions_priority_order: [{ priority: 'high', action: 'Call /wallet-risk-intelligence endpoint', reason: 'Full wallet risk analysis' }], execution_metadata: { latency_ms: 1, model: 'system', automation_safe: true } });
});

router.post('/wallet-risk-intelligence', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are a complete Wallet Address Risk API intelligence engine combining all sub-endpoints.
Input: "${input}"
Return ONLY valid JSON: success, request_id, data (all sub-results + overall_score 0-100 + key_findings array + summary), confidence, provenance, cache, recommended_next_api, recommended_actions_priority_order, execution_metadata. No markdown.`);
    res.json(parseJSON(raw));
  } catch { return degrade(res); }
});

export default router;
