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
  res.json({ name: 'CDN Detector API', info: '/cdn-detector/info', openapi: '/cdn-detector/openapi.json', health: 'ok' });
});

router.post('/detect', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert CDN Detector API engine performing: detect.
Input: "${input}"
Options: ${JSON.stringify(options || {})}
Return ONLY a valid JSON object with these exact top-level keys — no markdown, no prose: success (boolean true), request_id (uuid v4 string), data (object with: url string, cdn_detected boolean, cdn_provider string|null, cdn_provider_normalized enum cloudflare|fastly|akamai|cloudfront|azure_cdn|google_cloud_cdn|bunny_net|keycdn|stackpath|sucuri|incapsula|maxcdn|unknown|none, detection_signals array of strings, cname_chain array of strings, server_header string|null, cdn_headers array of objects each with name string, value string, is_cdn_specific boolean), confidence (object: score 0-1, reason string, per_section object), provenance (object: provider string, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (object: recommended_ttl_seconds integer, retryable boolean, cache_recommended boolean), recommended_next_api (array of objects: api string, endpoint string, reason string), recommended_actions_priority_order (array of objects: priority enum high|medium|low, action string, reason string), execution_metadata (object: latency_ms integer, model string, automation_safe boolean). Return only the JSON object.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/analyze', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert CDN Detector API engine performing: analyze.
Input: "${input}"
Options: ${JSON.stringify(options || {})}
Return ONLY a valid JSON object with these exact top-level keys — no markdown, no prose: success (boolean true), request_id (uuid v4 string), data (object with: url string, cdn_tier enum enterprise|professional|basic|none, performance_impact enum very_high|high|medium|low|unknown, security_features array of strings, geographic_coverage enum global|regional|limited|unknown, estimated_cost_tier enum enterprise|mid_market|startup|free|unknown, cdn_advantages array of strings, cdn_limitations array of strings), confidence (object: score 0-1, reason string, per_section object), provenance (object: provider string, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (object: recommended_ttl_seconds integer, retryable boolean, cache_recommended boolean), recommended_next_api (array of objects: api string, endpoint string, reason string), recommended_actions_priority_order (array of objects: priority enum high|medium|low, action string, reason string), execution_metadata (object: latency_ms integer, model string, automation_safe boolean). Return only the JSON object.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/execution-gate', (_req: Request, res: Response) => {
  const { input, objective } = _req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  res.json({
    success: true, request_id: rid(),
    execution_ready: true, input, objective: objective || 'detect',
    next_api: 'cdn-detector', next_endpoint: '/cdn-intelligence',
    blocking_flags: [],
    confidence: { score: 0.98, reason: 'Input present and valid', per_section: { execution_ready: 0.98 } },
    provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    recommended_next_api: [{ api: 'cdn-detector', endpoint: '/cdn-intelligence', reason: 'One-call endpoint for full CDN Detector API intelligence' }],
    recommended_actions_priority_order: [{ priority: 'high', action: 'Call /cdn-intelligence for full intelligence', reason: 'Single-request full analysis combining detect and analyze' }],
    execution_metadata: { latency_ms: 1, model: 'system', automation_safe: true },
  });
});

router.post('/cdn-intelligence', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are a complete CDN Detector API intelligence engine. Combine detect and analyze into one comprehensive CDN intelligence response.
Input: "${input}"
Options: ${JSON.stringify(options || {})}
Return ONLY a valid JSON object with these exact top-level keys — no markdown, no prose: success (boolean true), request_id (uuid v4 string), data (object including: detect sub-object, analyze sub-object, overall_score integer 0-100, key_findings array of strings, summary string), confidence (object: score 0-1, reason string, per_section object), provenance (object: provider string, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (object: recommended_ttl_seconds integer, retryable boolean, cache_recommended boolean), recommended_next_api (array of objects: api string, endpoint string, reason string), recommended_actions_priority_order (array of objects: priority enum high|medium|low, action string, reason string), execution_metadata (object: latency_ms integer, model string, automation_safe boolean). Return only the JSON object.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

export default router;
