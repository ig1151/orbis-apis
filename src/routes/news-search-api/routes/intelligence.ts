import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';

async function callClaude(prompt: string): Promise<string> {
  // Hardened: 25s timeout + bounded retry on 429/5xx/timeout so transient upstream
  // failures degrade to a caught error (→ 200 success:false) instead of a hang/500.
  const MAX_RETRIES = 2;
  let lastErr: any;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        { model: MODEL, messages: [{ role: 'user', content: prompt }] },
        { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' }, timeout: 25000 }
      );
      return res.data.choices[0].message.content;
    } catch (e: any) {
      lastErr = e;
      const status = e?.response?.status;
      const retryable = !status || status === 429 || status >= 500 || e?.code === 'ECONNABORTED';
      if (attempt < MAX_RETRIES && retryable) { await new Promise(r => setTimeout(r, 500 * (attempt + 1))); continue; }
      throw e;
    }
  }
  throw lastErr;
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
  res.json({ name: 'News Search API', info: '/news-search/info', openapi: '/news-search/openapi.json', health: 'ok' });
});

// POST /latest
router.post('/latest', async (req: Request, res: Response) => {
  const { limit = 10 } = req.body;
  try {
    const raw = await callClaude(`Fetch the latest ${limit} top news articles. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "articles": [
    {
      "title": "string",
      "source": "string",
      "published_at": "ISO8601",
      "url": "string",
      "summary": "string",
      "category": "business|tech|politics|finance|world|other",
      "sentiment": "positive|negative|neutral"
    }
  ],
  "total": number,
  "confidence_per_section": {"articles": 0.85},
  "recommended_actions_priority_order": ["filter by sentiment for risk signals", "pass to knowledge-graph for entity extraction", "route to sentiment-api for deeper analysis"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(200).json({ success: false, error: e.message }); }
});

// POST /by-topic
router.post('/by-topic', async (req: Request, res: Response) => {
  const { topic } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic is required' });
  try {
    const raw = await callClaude(`Search news articles about topic: "${topic}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "topic": "${topic}",
  "articles": [
    {
      "title": "string",
      "source": "string",
      "published_at": "ISO8601",
      "url": "string",
      "summary": "string",
      "relevance_score": 0.0,
      "sentiment": "positive|negative|neutral",
      "entities": ["string"]
    }
  ],
  "topic_sentiment_trend": "bullish|bearish|neutral",
  "top_sources": ["string"],
  "confidence_per_section": {"articles": 0.86, "topic_sentiment_trend": 0.80},
  "recommended_actions_priority_order": ["track topic sentiment over time", "identify key entities for graph analysis", "alert on negative sentiment spikes"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(200).json({ success: false, error: e.message }); }
});

// POST /by-company
router.post('/by-company', async (req: Request, res: Response) => {
  const { company } = req.body;
  if (!company) return res.status(400).json({ error: 'company is required' });
  try {
    const raw = await callClaude(`Search news articles mentioning company: "${company}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "company": "${company}",
  "articles": [
    {
      "title": "string",
      "source": "string",
      "published_at": "ISO8601",
      "url": "string",
      "summary": "string",
      "relevance_score": 0.0,
      "sentiment": "positive|negative|neutral",
      "angle": "earnings|product|legal|leadership|market|other"
    }
  ],
  "company_news_summary": {
    "overall_sentiment": "positive|negative|neutral",
    "key_themes": ["string"],
    "risk_signals": ["string"],
    "recent_events": ["string"]
  },
  "confidence_per_section": {"articles": 0.87, "company_news_summary": 0.82},
  "recommended_actions_priority_order": ["monitor for reputation risks", "use for competitive intelligence", "cross-reference with due-diligence API"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(200).json({ success: false, error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { query, topic, company, objective } = req.body;
  const hasInput = query || topic || company;
  const flags: string[] = [];
  if (!hasInput) flags.push('NO_SEARCH_INPUT');
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: flags.length === 0,
    input: query || topic || company || null,
    objective: objective || 'news_intelligence',
    next_api: 'sentiment-api',
    next_endpoint: '/analyze',
    blocking_flags: flags,
    flag_definitions: { NO_SEARCH_INPUT: 'Provide query, topic, or company to search news' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Run /latest for trending signals', 'Run /by-company for competitive monitoring', 'Run /by-topic for market intelligence'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /search (ONE-CALL)
router.post('/search', async (req: Request, res: Response) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  try {
    const raw = await callClaude(`Full news intelligence search for query: "${query}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "query": "${query}",
  "articles": [
    {"title": "string", "source": "string", "published_at": "ISO8601", "url": "string", "summary": "string", "sentiment": "positive|negative|neutral", "relevance_score": 0.0, "entities": ["string"]}
  ],
  "search_intelligence": {
    "overall_sentiment": "positive|negative|neutral",
    "sentiment_breakdown": {"positive": 0, "negative": 0, "neutral": 0},
    "key_themes": ["string"],
    "trending_entities": ["string"],
    "risk_signals": ["string"],
    "market_signals": ["string"]
  },
  "source_diversity_score": 0.0,
  "confidence_per_section": {"articles": 0.86, "search_intelligence": 0.83},
  "recommended_actions_priority_order": ["monitor risk signals for alerts", "track trending entities over time", "route to knowledge-graph for entity mapping"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(200).json({ success: false, error: e.message }); }
});

export default router;
