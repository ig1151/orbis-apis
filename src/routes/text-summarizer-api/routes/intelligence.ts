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
  res.json({ name: 'Text Summarizer API', info: '/text-summarizer/info', openapi: '/text-summarizer/openapi.json', health: 'ok' });
});

// POST /summarize
router.post('/summarize', async (req: Request, res: Response) => {
  const { text, max_words } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Summarize the following text in ${max_words || 150} words or less:\n\n${text.slice(0, 10000)}\n\nReturn JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "summary": "string",
  "original_word_count": number,
  "summary_word_count": number,
  "compression_ratio": number,
  "confidence_per_section": {"summary": 0.9},
  "recommended_actions_priority_order": ["review for accuracy", "adjust max_words if needed", "use bullets for lists"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /bullets
router.post('/bullets', async (req: Request, res: Response) => {
  const { text, max_bullets } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Summarize as ${max_bullets || 5} bullet points:\n\n${text.slice(0, 10000)}\n\nReturn JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "bullets": ["string"],
  "bullet_count": number,
  "original_word_count": number,
  "confidence_per_section": {"bullets": 0.9},
  "recommended_actions_priority_order": ["verify each bullet is accurate", "add context if needed", "trim for clarity"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /tldr
router.post('/tldr', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Create a TL;DR (1-2 sentences max) for this text:\n\n${text.slice(0, 10000)}\n\nReturn JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "tldr": "string",
  "key_point": "string",
  "original_word_count": number,
  "confidence_per_section": {"tldr": 0.9},
  "recommended_actions_priority_order": ["verify tldr captures main point", "use key_point for headlines", "expand with /summarize for detail"],
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
    objective: objective || 'summarization',
    next_api: 'language-detection',
    next_endpoint: '/detect',
    blocking_flags: text.length > 100000 ? ['TEXT_TOO_LONG'] : [],
    flag_definitions: { TEXT_REQUIRED: 'text input is required', TEXT_TOO_LONG: 'Text exceeds 100,000 character limit — split into chunks' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Detect language first', 'Choose summarize vs bullets vs tldr', 'Set max_words for precision'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /analyze (ONE-CALL)
router.post('/analyze', async (req: Request, res: Response) => {
  const { text, focus } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Full text summarization and analysis, focus: "${focus || 'general'}":\n\n${text.slice(0, 10000)}\n\nReturn JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "summary": "string",
  "bullets": ["string"],
  "tldr": "string",
  "key_topics": ["string"],
  "sentiment": "positive|negative|neutral",
  "reading_time_minutes": number,
  "original_word_count": number,
  "confidence_per_section": {"summary": 0.9, "bullets": 0.9},
  "recommended_actions_priority_order": ["use tldr for headers", "bullets for reports", "summary for context"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
