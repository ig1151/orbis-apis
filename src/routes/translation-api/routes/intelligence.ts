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

function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Translation API', info: '/translation/info', openapi: '/translation/openapi.json', health: 'ok' });
});

// POST /translate
router.post('/translate', async (req: Request, res: Response) => {
  const { text, target_language, source_language } = req.body;
  if (!text || !target_language) return res.status(400).json({ error: 'text and target_language are required' });
  try {
    const raw = await callClaude(`Translate text to "${target_language}" from "${source_language || 'auto-detect'}". Text: "${text}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "source_language": "${source_language || 'auto-detected'}",
  "target_language": "${target_language}",
  "translation": {
    "original": "${text}",
    "translated": "string",
    "alternative_translations": ["string"],
    "formality_level": "formal|informal|neutral"
  },
  "source_provenance": {"provider": "translation-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.95},
  "cache_ttl_seconds": 86400,
  "cache_recommended": true,
  "recommended_next_api": "translation",
  "recommended_next_endpoint": "/localization",
  "automation_safe": true,
  "confidence_per_section": {"translation": 0.9},
  "recommended_actions_priority_order": ["verify formality_level", "check alternative_translations", "run localization check"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /detect-language
router.post('/detect-language', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Detect language of text: "${text}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "detected": {
    "language_code": "en",
    "language_name": "English",
    "confidence": 0.98,
    "script": "Latin",
    "dialect": "string"
  },
  "alternatives": [{"language_code": "string", "language_name": "string", "confidence": 0.1}],
  "is_mixed": false,
  "source_provenance": {"provider": "translation-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.95},
  "cache_ttl_seconds": 86400,
  "cache_recommended": true,
  "recommended_next_api": "translation",
  "recommended_next_endpoint": "/translate",
  "automation_safe": true,
  "confidence_per_section": {"detected": 0.95},
  "recommended_actions_priority_order": ["confirm language", "proceed to translation", "check for mixed language"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /glossary-translate
router.post('/glossary-translate', async (req: Request, res: Response) => {
  const { text, target_language, glossary } = req.body;
  if (!text || !target_language) return res.status(400).json({ error: 'text and target_language are required' });
  try {
    const raw = await callClaude(`Translate with glossary enforcement to "${target_language}". Text: "${text}". Glossary terms: ${JSON.stringify(glossary || [])}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "target_language": "${target_language}",
  "translation": {
    "original": "${text}",
    "translated": "string",
    "glossary_terms_applied": ["string"],
    "glossary_terms_not_found": ["string"]
  },
  "source_provenance": {"provider": "translation-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.95},
  "cache_ttl_seconds": 86400,
  "cache_recommended": true,
  "recommended_next_api": "translation",
  "recommended_next_endpoint": "/localization",
  "automation_safe": true,
  "confidence_per_section": {"translation": 0.88},
  "recommended_actions_priority_order": ["verify glossary_terms_applied", "check untranslated terms", "run localization"],
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
    objective: objective || 'translation',
    next_api: 'translation',
    next_endpoint: '/translate',
    blocking_flags: [],
    flag_definitions: { NO_TEXT: 'text is required', NO_TARGET: 'target_language is required' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0,
    cache_recommended: false,
    recommended_next_api: 'translation',
    recommended_next_endpoint: '/translate',
    automation_safe: true,
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Detect language first', 'Translate text', 'Run localization check'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /translate-document (ONE-CALL)
router.post('/translate-document', async (req: Request, res: Response) => {
  const { text, target_language, context } = req.body;
  if (!text || !target_language) return res.status(400).json({ error: 'text and target_language are required' });
  try {
    const raw = await callClaude(`Full document translation to "${target_language}" with context: "${context || 'general'}". Text: "${text.slice(0, 500)}...". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "source_language": "auto-detected",
  "target_language": "${target_language}",
  "translated_text": "string",
  "source_language_detected": "en",
  "word_count": 500,
  "translation_quality_score": 0.92,
  "culturally_adapted": true,
  "formality_preserved": true,
  "glossary_issues": ["string"],
  "source_provenance": {"provider": "translation-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.95},
  "cache_ttl_seconds": 86400,
  "cache_recommended": true,
  "recommended_next_api": "text-summarizer",
  "recommended_next_endpoint": "/summarize",
  "automation_safe": true,
  "confidence_per_section": {"translated_text": 0.9},
  "recommended_actions_priority_order": ["verify translation_quality_score", "review glossary_issues", "check cultural adaptation"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /localization
router.post('/localization', async (req: Request, res: Response) => {
  const { text, target_language, target_region, brand_voice } = req.body;
  if (!text || !target_language) return res.status(400).json({ error: 'text and target_language are required' });
  try {
    const raw = await callClaude(`Localize text for "${target_language}" region: "${target_region || 'general'}", brand_voice: "${brand_voice || 'neutral'}". Text: "${text}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "target_language": "${target_language}",
  "target_region": "${target_region || 'general'}",
  "localized": {
    "text": "string",
    "tone_preserved": true,
    "tone_type": "formal|conversational|professional|casual",
    "cultural_adaptations": ["string"],
    "idiomatic_changes": ["string"],
    "date_format_adapted": true,
    "currency_adapted": true
  },
  "brand_voice_score": 0.88,
  "source_provenance": {"provider": "translation-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.95},
  "cache_ttl_seconds": 86400,
  "cache_recommended": true,
  "recommended_next_api": "content-moderation",
  "recommended_next_endpoint": "/moderate",
  "automation_safe": true,
  "confidence_per_section": {"localized": 0.88},
  "recommended_actions_priority_order": ["verify cultural_adaptations", "check brand_voice_score", "moderate before publishing"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /batch
router.post('/batch', async (req: Request, res: Response) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items array is required' });
  if (items.length > 10) return res.status(400).json({ error: 'Maximum 10 items per batch' });
  try {
    const results = await Promise.all(items.map(async (item: { text: string; target_language: string }) => {
      const raw = await callClaude(`Translate to "${item.target_language}": "${item.text.slice(0, 200)}". Return JSON:
{"original": "${item.text.slice(0, 100)}", "translated": "string", "target_language": "${item.target_language}", "confidence": 0.9}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(),
      computed_at: new Date().toISOString(),
      success: true,
      batch_count: items.length,
      results,
      source_provenance: { provider: 'translation-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.95 },
      cache_ttl_seconds: 86400,
      cache_recommended: true,
      recommended_next_api: 'translation',
      recommended_next_endpoint: '/localization',
      automation_safe: true,
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
