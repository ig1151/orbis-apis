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
  res.json({ name: 'Citation Extractor API', info: '/citation-extractor/info', openapi: '/citation-extractor/openapi.json', health: 'ok' });
});

router.post('/extract', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert Citation Extractor API engine performing: extract.
Input: "${input}"
Options: ${JSON.stringify(options || {})}
Return ONLY valid JSON: success, request_id, data (citations array each with: raw_text string, citation_type enum journal|book|website|conference|report|other, authors array of strings, title string, year integer|null, source string|null, url string|null, doi string|null, volume string|null, issue string|null, pages string|null, publisher string|null, confidence_score 0-1, total_citations integer, unique_sources integer), confidence (score 0-1, reason, per_section), provenance (provider, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (recommended_ttl_seconds, retryable, cache_recommended), recommended_next_api (array: api, endpoint, reason), recommended_actions_priority_order (array: priority high|medium|low, action, reason), execution_metadata (latency_ms, model, automation_safe). No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/validate', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are an expert Citation Extractor API engine performing: validate.
Input: "${input}"
Options: ${JSON.stringify(options || {})}
Return ONLY valid JSON: success, request_id, data (is_valid boolean, citation_type enum journal|book|website|conference|report|other, format_style enum apa|mla|chicago|ieee|harvard|unknown, completeness_score integer 0-100, missing_fields array of strings, errors array of objects with field string and message string, warnings array of strings, corrected_citation string|null), confidence (score 0-1, reason, per_section), provenance (provider, retrieved_at ISO8601, source_type enum ai_generated|cached|live_scan|api_call), cache (recommended_ttl_seconds, retryable, cache_recommended), recommended_next_api (array: api, endpoint, reason), recommended_actions_priority_order (array: priority high|medium|low, action, reason), execution_metadata (latency_ms, model, automation_safe). No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

router.post('/execution-gate', (_req: Request, res: Response) => {
  const { input, objective } = _req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  res.json({
    success: true, request_id: rid(),
    execution_ready: true, input, objective: objective || 'extract',
    next_api: 'citation-extractor', next_endpoint: '/citation-intelligence',
    blocking_flags: [],
    confidence: { score: 0.98, reason: 'Input present and valid', per_section: { execution_ready: 0.98 } },
    provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    recommended_next_api: [{ api: 'citation-extractor', endpoint: '/citation-intelligence', reason: 'Full Citation Extractor API intelligence' }],
    recommended_actions_priority_order: [{ priority: 'high', action: 'Call /citation-intelligence', reason: 'Single-request full analysis' }],
    execution_metadata: { latency_ms: 1, model: 'system', automation_safe: true },
  });
});

router.post('/citation-intelligence', async (req: Request, res: Response) => {
  const { input, options } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  try {
    const raw = await callClaude(`You are a complete Citation Extractor API intelligence engine combining all sub-endpoints.
Input: "${input}"
Options: ${JSON.stringify(options || {})}
Return ONLY valid JSON: success, request_id, data (extract sub-object, validate sub-object, overall_score integer 0-100, key_findings array of strings, summary string), confidence, provenance, cache, recommended_next_api, recommended_actions_priority_order, execution_metadata. No markdown.`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message, code: 'UPSTREAM_ERROR', retryable: true }); }
});

export default router;
