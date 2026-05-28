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
  res.json({ name: 'Text Summarizer API', info: '/text-summarizer/info', openapi: '/text-summarizer/openapi.json', health: 'ok' });
});

// POST /summarize
router.post('/summarize', async (req: Request, res: Response) => {
  const { text, max_words, summary_mode } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  const mode = summary_mode || 'executive';
  const wordLimit = max_words || 150;
  try {
    const raw = await callClaude(`Summarize the following text in ${wordLimit} words or less using ${mode} mode (executive=concise business-focused, technical=detail-rich, sales=value-focused, legal=risk-focused):\n\n${text.slice(0, 10000)}\n\nReturn JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "summary": "string",
  "summary_mode": "${mode}",
  "original_word_count": 500,
  "summary_word_count": ${wordLimit},
  "compression_ratio": 0.3,
  "confidence_per_section": {"summary": 0.9},
  "recommended_actions_priority_order": ["review for accuracy", "adjust max_words if needed", "use bullets for lists"],
  "source_provenance": {"provider": "claude-sonnet-4-5", "retrieved_at": "${new Date().toISOString()}", "model_version": "claude-sonnet-4-5", "freshness_score": 1.0},
  "cache_ttl_seconds": 86400,
  "cache_recommended": true,
  "recommended_next_api": "entity-extraction",
  "recommended_next_endpoint": "/entities",
  "automation_safe": true,
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
  "bullet_count": ${max_bullets || 5},
  "original_word_count": 500,
  "confidence_per_section": {"bullets": 0.9},
  "recommended_actions_priority_order": ["verify each bullet is accurate", "add context if needed", "trim for clarity"],
  "source_provenance": {"provider": "claude-sonnet-4-5", "retrieved_at": "${new Date().toISOString()}", "model_version": "claude-sonnet-4-5", "freshness_score": 1.0},
  "cache_ttl_seconds": 86400,
  "cache_recommended": true,
  "recommended_next_api": "sentiment",
  "recommended_next_endpoint": "/sentiment",
  "automation_safe": true,
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
  "original_word_count": 500,
  "confidence_per_section": {"tldr": 0.9},
  "recommended_actions_priority_order": ["verify tldr captures main point", "use key_point for headlines", "expand with /summarize for detail"],
  "source_provenance": {"provider": "claude-sonnet-4-5", "retrieved_at": "${new Date().toISOString()}", "model_version": "claude-sonnet-4-5", "freshness_score": 1.0},
  "cache_ttl_seconds": 86400,
  "cache_recommended": true,
  "recommended_next_api": "language-detection",
  "recommended_next_endpoint": "/detect",
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
    objective: objective || 'summarization',
    next_api: 'language-detection',
    next_endpoint: '/detect',
    blocking_flags: text.length > 100000 ? ['TEXT_TOO_LONG'] : [],
    flag_definitions: { TEXT_REQUIRED: 'text input is required', TEXT_TOO_LONG: 'Text exceeds 100,000 character limit — split into chunks' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Detect language first', 'Choose summarize vs bullets vs tldr', 'Set max_words for precision'],
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), model_version: 'n/a', freshness_score: 1.0 },
    cache_ttl_seconds: 86400,
    cache_recommended: false,
    recommended_next_api: 'language-detection',
    recommended_next_endpoint: '/detect',
    automation_safe: true,
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
  "reading_time_minutes": 3,
  "original_word_count": 500,
  "confidence_per_section": {"summary": 0.9, "bullets": 0.9},
  "recommended_actions_priority_order": ["use tldr for headers", "bullets for reports", "summary for context"],
  "source_provenance": {"provider": "claude-sonnet-4-5", "retrieved_at": "${new Date().toISOString()}", "model_version": "claude-sonnet-4-5", "freshness_score": 1.0},
  "cache_ttl_seconds": 86400,
  "cache_recommended": true,
  "recommended_next_api": "sentiment",
  "recommended_next_endpoint": "/sentiment",
  "automation_safe": true,
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /decision-summary
router.post('/decision-summary', async (req: Request, res: Response) => {
  const { text, context } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Extract decisions, owners, deadlines, and risks from the following text. Context: "${context || 'general'}":\n\n${text.slice(0, 10000)}\n\nReturn JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "decisions": [{"decision": "string", "owner": "string", "deadline": "string", "status": "pending|approved|rejected"}],
  "owners": [{"name": "string", "role": "string", "decisions_owned": ["string"]}],
  "deadlines": [{"item": "string", "deadline": "string", "owner": "string"}],
  "risks": [{"risk": "string", "severity": "high|medium|low", "mitigation": "string"}],
  "summary": "string",
  "confidence_per_section": {"decisions": 0.85, "risks": 0.8},
  "recommended_actions_priority_order": ["assign owners for pending decisions", "schedule deadline tracking", "address high-severity risks"],
  "source_provenance": {"provider": "claude-sonnet-4-5", "retrieved_at": "${new Date().toISOString()}", "model_version": "claude-sonnet-4-5", "freshness_score": 1.0},
  "cache_ttl_seconds": 86400,
  "cache_recommended": true,
  "recommended_next_api": "email-parser",
  "recommended_next_endpoint": "/crm-intelligence",
  "automation_safe": true,
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /batch
router.post('/batch', async (req: Request, res: Response) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) return res.status(400).json({ error: 'items array is required' });
  const limited = items.slice(0, 10);
  try {
    const results = await Promise.all(limited.map(async (item: { text: string; max_words?: number; summary_mode?: string }, idx: number) => {
      try {
        const raw = await callClaude(`Summarize in ${item.max_words || 100} words using ${item.summary_mode || 'executive'} mode:\n\n${item.text.slice(0, 5000)}\n\nReturn JSON:
{
  "index": ${idx},
  "summary": "string",
  "summary_mode": "${item.summary_mode || 'executive'}",
  "original_word_count": 200,
  "summary_word_count": ${item.max_words || 100},
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
      recommended_next_api: 'entity-extraction',
      recommended_next_endpoint: '/entities',
      automation_safe: true,
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
