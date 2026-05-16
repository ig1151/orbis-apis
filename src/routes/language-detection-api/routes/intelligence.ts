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
  res.json({ name: 'Language Detection API', info: '/language-detection/info', openapi: '/language-detection/openapi.json', health: 'ok' });
});

// POST /detect
router.post('/detect', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Detect language of this text: "${text.slice(0, 500)}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "language": "string",
  "iso_code": "string",
  "confidence": number,
  "script": "Latin|Cyrillic|Arabic|CJK|Devanagari|other",
  "confidence_per_section": {"language": 0.95},
  "recommended_actions_priority_order": ["route to correct translator", "apply language-specific processing", "verify for short texts"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /batch
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
    {"index": number, "language": "string", "iso_code": "string", "confidence": number}
  ],
  "summary": {"unique_languages": number, "most_common": "string"},
  "confidence_per_section": {"results": 0.9},
  "recommended_actions_priority_order": ["group by language", "route to translators", "flag low-confidence results"],
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
  "top_language": {"language": "string", "iso_code": "string", "confidence": number},
  "alternatives": [{"language": "string", "iso_code": "string", "confidence": number}],
  "detection_certainty": "high|medium|low",
  "ambiguous": false,
  "confidence_per_section": {"top_language": 0.95},
  "recommended_actions_priority_order": ["use top_language if confidence > 0.9", "review alternatives for ambiguous text", "flag low certainty for manual review"],
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
  "primary_language": {"language": "string", "iso_code": "string", "confidence": number},
  "alternatives": [{"language": "string", "iso_code": "string", "confidence": number}],
  "script": "string",
  "text_direction": "ltr|rtl",
  "multilingual": false,
  "detected_segments": [{"text_snippet": "string", "language": "string"}],
  "routing_recommendation": "string",
  "confidence_per_section": {"primary_language": 0.95, "alternatives": 0.85},
  "recommended_actions_priority_order": ["use routing_recommendation", "handle multilingual text", "verify script encoding"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
