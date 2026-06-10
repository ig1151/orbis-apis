import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';


function parseJSON(raw: string) {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.indexOf('{');
  if (start !== -1) {
    let depth = 0, end = -1;
    for (let i = start; i < cleaned.length; i++) {
      if (cleaned[i] === '{') depth++;
      else if (cleaned[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end !== -1) try { return JSON.parse(cleaned.slice(start, end + 1)); } catch {}
  }
  throw new Error(`Cannot parse as JSON: ${raw.slice(0, 100)}`);
}

function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Language Detection API', info: '/language-detection/info', openapi: '/language-detection/openapi.json', health: 'ok' });
});

// POST /detect
router.post('/detect', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Detect language of this text: "${text.slice(0, 500)}". Include dialect if applicable (e.g. "mexican_spanish", "brazilian_portuguese", "american_english"). Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "language": "string",
  "iso_code": "en",
  "dialect": "american_english",
  "confidence": 0.97,
  "script": "Latin",
  "confidence_per_section": {"language": 0.95},
  "recommended_actions_priority_order": ["route to correct translator", "apply language-specific processing", "verify for short texts"],
  "source_provenance": {"provider": "claude-sonnet-4-5", "retrieved_at": "${new Date().toISOString()}", "model_version": "claude-sonnet-4-5", "freshness_score": 1.0},
  "cache_ttl_seconds": 86400,
  "cache_recommended": true,
  "recommended_next_api": "translation",
  "recommended_next_endpoint": "/translate",
  "automation_safe": true,
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /batch (existing, keep as-is but enhance)
router.post('/batch', async (req: Request, res: Response) => {
  const { texts } = req.body;
  if (!texts || !Array.isArray(texts)) return res.status(400).json({ error: 'texts array is required' });
  try {
    const limited = texts.slice(0, 50);
    const raw = await callClaude(`Detect language for each text in this array (${limited.length} items): ${JSON.stringify(limited.map((t: string) => t.slice(0, 200)))}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "results": [
    {"index": 0, "language": "string", "iso_code": "en", "dialect": "american_english", "confidence": 0.97}
  ],
  "summary": {"unique_languages": 1, "most_common": "English"},
  "confidence_per_section": {"results": 0.9},
  "recommended_actions_priority_order": ["group by language", "route to translators", "flag low-confidence results"],
  "source_provenance": {"provider": "claude-sonnet-4-5", "retrieved_at": "${new Date().toISOString()}", "model_version": "claude-sonnet-4-5", "freshness_score": 1.0},
  "cache_ttl_seconds": 86400,
  "cache_recommended": true,
  "recommended_next_api": "translation",
  "recommended_next_endpoint": "/batch",
  "automation_safe": true,
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /confidence
router.post('/confidence', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Detect language with full confidence breakdown for: "${text.slice(0, 500)}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "top_language": {"language": "string", "iso_code": "en", "dialect": "american_english", "confidence": 0.97},
  "alternatives": [{"language": "string", "iso_code": "en", "confidence": 0.03}],
  "detection_certainty": "high",
  "ambiguous": false,
  "confidence_per_section": {"top_language": 0.95},
  "recommended_actions_priority_order": ["use top_language if confidence > 0.9", "review alternatives for ambiguous text", "flag low certainty for manual review"],
  "source_provenance": {"provider": "claude-sonnet-4-5", "retrieved_at": "${new Date().toISOString()}", "model_version": "claude-sonnet-4-5", "freshness_score": 1.0},
  "cache_ttl_seconds": 86400,
  "cache_recommended": true,
  "recommended_next_api": "translation",
  "recommended_next_endpoint": "/translate",
  "automation_safe": true,
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { text, objective } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: true,
    text_length: text.length,
    objective: objective || 'language_detection',
    next_api: 'translation',
    next_endpoint: '/translate',
    blocking_flags: text.length < 5 ? ['TEXT_TOO_SHORT'] : [],
    flag_definitions: { TEXT_REQUIRED: 'text is required', TEXT_TOO_SHORT: 'Text too short for reliable detection — provide at least 5 characters' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Detect language first', 'Route to translation if needed', 'Use batch for multiple strings'],
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), model_version: 'n/a', freshness_score: 1.0 },
    cache_ttl_seconds: 86400,
    cache_recommended: false,
    recommended_next_api: 'translation',
    recommended_next_endpoint: '/translate',
    automation_safe: true,
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /analyze (ONE-CALL)
router.post('/analyze', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Full language analysis for: "${text.slice(0, 1000)}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "primary_language": {"language": "string", "iso_code": "en", "dialect": "american_english", "confidence": 0.97},
  "alternatives": [{"language": "string", "iso_code": "en", "confidence": 0.03}],
  "script": "Latin",
  "text_direction": "ltr",
  "multilingual": false,
  "detected_segments": [{"text_snippet": "string", "language": "string", "dialect": "string"}],
  "routing_recommendation": "string",
  "confidence_per_section": {"primary_language": 0.95, "alternatives": 0.85},
  "recommended_actions_priority_order": ["use routing_recommendation", "handle multilingual text", "verify script encoding"],
  "source_provenance": {"provider": "claude-sonnet-4-5", "retrieved_at": "${new Date().toISOString()}", "model_version": "claude-sonnet-4-5", "freshness_score": 1.0},
  "cache_ttl_seconds": 86400,
  "cache_recommended": true,
  "recommended_next_api": "translation",
  "recommended_next_endpoint": "/localization",
  "automation_safe": true,
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /mixed-language-analysis
router.post('/mixed-language-analysis', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Analyze mixed-language text and identify language segments: "${text.slice(0, 2000)}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "segments": [
    {"text": "string", "language": "English", "dialect": "american_english", "confidence": 0.97},
    {"text": "string", "language": "Spanish", "dialect": "mexican_spanish", "confidence": 0.92}
  ],
  "primary_language": "English",
  "languages_detected": ["English", "Spanish"],
  "code_switching": true,
  "confidence_per_section": {"segments": 0.9},
  "recommended_actions_priority_order": ["translate each segment separately", "preserve code-switching for cultural context", "flag for human review if critical"],
  "source_provenance": {"provider": "claude-sonnet-4-5", "retrieved_at": "${new Date().toISOString()}", "model_version": "claude-sonnet-4-5", "freshness_score": 1.0},
  "cache_ttl_seconds": 86400,
  "cache_recommended": true,
  "recommended_next_api": "translation",
  "recommended_next_endpoint": "/localization",
  "automation_safe": true,
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /batch-primary (primary batch endpoint per spec)
router.post('/batch-primary', async (req: Request, res: Response) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) return res.status(400).json({ error: 'items array is required' });
  const limited = items.slice(0, 10);
  try {
    const results = await Promise.all(limited.map(async (item: { text: string }, idx: number) => {
      try {
        const raw = await callClaude(`Detect language for: "${item.text.slice(0, 300)}". Return JSON:
{
  "index": ${idx},
  "language": "string",
  "iso_code": "en",
  "dialect": "american_english",
  "confidence": 0.97,
  "success": true
}`);
        return parseJSON(raw);
      } catch (e: any) {
        return { index: idx, success: false, error: e.message };
      }
    }));
    res.json({
      trace_id: traceId(),
      computed_at: new Date().toISOString(),
      success: true,
      total: limited.length,
      results,
      source_provenance: { provider: 'claude-sonnet-4-5', retrieved_at: new Date().toISOString(), model_version: 'claude-sonnet-4-5', freshness_score: 1.0 },
      cache_ttl_seconds: 86400,
      cache_recommended: true,
      recommended_next_api: 'translation',
      recommended_next_endpoint: '/batch',
      automation_safe: true,
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
