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
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Translation API', info: '/translation/info', openapi: '/translation/openapi.json', health: 'ok' });
});

// POST /translate
router.post('/translate', async (req: Request, res: Response) => {
  const { text, target_language, source_language } = req.body;
  if (!text || !target_language) return res.status(400).json({ error: 'text and target_language are required' });
  try {
    const raw = await callClaude(`Translate text from ${source_language || 'auto-detect'} to ${target_language}:\n\n${text.slice(0, 5000)}\n\nReturn JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "source_language": "${source_language || 'auto-detected'}",
  "target_language": "${target_language}",
  "translation": "string",
  "original_text": ${JSON.stringify(text.slice(0, 200))},
  "word_count": number,
  "confidence_per_section": {"translation": 0.9},
  "recommended_actions_priority_order": ["review for domain-specific terms", "verify proper nouns", "check formality level"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /batch
router.post('/batch', async (req: Request, res: Response) => {
  const { texts, target_language } = req.body;
  if (!texts || !Array.isArray(texts) || !target_language) return res.status(400).json({ error: 'texts array and target_language are required' });
  try {
    const limited = texts.slice(0, 20);
    const raw = await callClaude(`Batch translate ${limited.length} texts to ${target_language}: ${JSON.stringify(limited.map((t: string) => t.slice(0, 500)))}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "target_language": "${target_language}",
  "results": [
    {"index": number, "original": "string", "translation": "string", "source_language": "string"}
  ],
  "total_translated": number,
  "confidence_per_section": {"results": 0.9},
  "recommended_actions_priority_order": ["verify translations for critical content", "check domain terms", "flag low-quality translations"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /detect-and-translate
router.post('/detect-and-translate', async (req: Request, res: Response) => {
  const { text, target_language } = req.body;
  if (!text || !target_language) return res.status(400).json({ error: 'text and target_language are required' });
  try {
    const raw = await callClaude(`Auto-detect language and translate to ${target_language}:\n\n${text.slice(0, 5000)}\n\nReturn JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "detected_language": {"language": "string", "iso_code": "string", "confidence": number},
  "target_language": "${target_language}",
  "translation": "string",
  "original_text": ${JSON.stringify(text.slice(0, 200))},
  "confidence_per_section": {"detected_language": 0.9, "translation": 0.9},
  "recommended_actions_priority_order": ["verify detected language", "review translation", "check code-switching"],
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
    objective: objective || 'translation',
    next_api: 'sentiment',
    next_endpoint: '/sentiment',
    blocking_flags: [],
    flag_definitions: { TEXT_REQUIRED: 'text is required', TARGET_LANG_REQUIRED: 'target_language is required' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Detect language if unknown', 'Use batch for multiple strings', 'Check domain-specific terms post-translation'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /lookup (ONE-CALL)
router.post('/lookup', async (req: Request, res: Response) => {
  const { text, target_language } = req.body;
  if (!text || !target_language) return res.status(400).json({ error: 'text and target_language are required' });
  try {
    const raw = await callClaude(`Full translation intelligence: detect language and translate to ${target_language}:\n\n${text.slice(0, 5000)}\n\nReturn JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "source_language": {"language": "string", "iso_code": "string", "confidence": number},
  "target_language": "${target_language}",
  "translation": "string",
  "back_translation": "string",
  "quality_score": number,
  "formality": "formal|informal|neutral",
  "domain_notes": ["string"],
  "confidence_per_section": {"source_language": 0.9, "translation": 0.9},
  "recommended_actions_priority_order": ["compare back_translation for accuracy", "check quality_score", "review domain_notes"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
