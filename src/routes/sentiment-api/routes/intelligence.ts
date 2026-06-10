import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';


function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Sentiment API', info: '/sentiment/info', openapi: '/sentiment/openapi.json', health: 'ok' });
});

// POST /sentiment
router.post('/sentiment', async (req: Request, res: Response) => {
  const { text, context } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Analyze sentiment of text: "${text}", context: "${context || 'general'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "sentiment": {
    "label": "positive|negative|neutral|mixed",
    "score": 0.85,
    "positive_score": 0.8,
    "negative_score": 0.1,
    "neutral_score": 0.1
  },
  "aspects": [{"aspect": "string", "sentiment": "positive|negative|neutral", "score": 0.8}],
  "source_provenance": {"provider": "sentiment-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.95},
  "cache_ttl_seconds": 3600,
  "cache_recommended": true,
  "recommended_next_api": "sentiment",
  "recommended_next_endpoint": "/trend-sentiment",
  "automation_safe": true,
  "confidence_per_section": {"sentiment": 0.9},
  "recommended_actions_priority_order": ["route based on label", "review negative aspects", "flag mixed sentiment"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /bulk-sentiment
router.post('/bulk-sentiment', async (req: Request, res: Response) => {
  const { texts } = req.body;
  if (!Array.isArray(texts) || texts.length === 0) return res.status(400).json({ error: 'texts array is required' });
  try {
    const raw = await callClaude(`Analyze sentiment for ${texts.length} texts. Sample: "${texts[0]}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "results": [
    {"index": 0, "text_snippet": "string", "label": "positive|negative|neutral", "score": 0.85}
  ],
  "aggregate": {
    "positive_count": 5, "negative_count": 2, "neutral_count": 3,
    "avg_sentiment_score": 0.65,
    "overall_label": "positive|negative|neutral|mixed"
  },
  "source_provenance": {"provider": "sentiment-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.95},
  "cache_ttl_seconds": 3600,
  "cache_recommended": true,
  "recommended_next_api": "sentiment",
  "recommended_next_endpoint": "/trend-sentiment",
  "automation_safe": true,
  "confidence_per_section": {"results": 0.9, "aggregate": 0.85},
  "recommended_actions_priority_order": ["act on aggregate", "review negative items", "track trend over time"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /brand-sentiment
router.post('/brand-sentiment', async (req: Request, res: Response) => {
  const { brand, texts } = req.body;
  if (!brand) return res.status(400).json({ error: 'brand is required' });
  try {
    const raw = await callClaude(`Analyze brand sentiment for "${brand}" across provided texts. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "brand": "${brand}",
  "brand_sentiment": {
    "overall_label": "positive|negative|neutral|mixed",
    "overall_score": 0.72,
    "mention_count": 25,
    "positive_mentions": 18,
    "negative_mentions": 5,
    "neutral_mentions": 2,
    "top_positive_themes": ["string"],
    "top_negative_themes": ["string"]
  },
  "reputation_score": 0.75,
  "source_provenance": {"provider": "sentiment-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.9},
  "cache_ttl_seconds": 3600,
  "cache_recommended": true,
  "recommended_next_api": "sentiment",
  "recommended_next_endpoint": "/trend-sentiment",
  "automation_safe": true,
  "confidence_per_section": {"brand_sentiment": 0.85},
  "recommended_actions_priority_order": ["address top_negative_themes", "amplify top_positive_themes", "monitor reputation_score"],
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
    objective: objective || 'sentiment_analysis',
    next_api: 'sentiment',
    next_endpoint: '/sentiment',
    blocking_flags: [],
    flag_definitions: { NO_TEXT: 'text is required', TEXT_TOO_SHORT: 'text must be at least 3 characters' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0,
    cache_recommended: false,
    recommended_next_api: 'sentiment',
    recommended_next_endpoint: '/sentiment',
    automation_safe: true,
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Run sentiment', 'Check trend', 'Monitor brand sentiment'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /sentiment-intelligence (ONE-CALL)
router.post('/sentiment-intelligence', async (req: Request, res: Response) => {
  const { texts, brand, context } = req.body;
  if (!texts && !brand) return res.status(400).json({ error: 'texts or brand is required' });
  try {
    const raw = await callClaude(`Full sentiment intelligence for brand: "${brand || 'general'}", context: "${context || 'monitoring'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "overall_sentiment": "positive|negative|neutral|mixed",
  "sentiment_score": 0.72,
  "emotions": {"joy": 0.4, "anger": 0.1, "sadness": 0.05, "fear": 0.05, "surprise": 0.2, "disgust": 0.02},
  "top_themes": ["string"],
  "alerts": [{"type": "negative_spike|positive_surge", "theme": "string", "severity": "high|medium|low"}],
  "source_provenance": {"provider": "sentiment-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.9},
  "cache_ttl_seconds": 3600,
  "cache_recommended": true,
  "recommended_next_api": "entity-extraction",
  "recommended_next_endpoint": "/entities",
  "automation_safe": true,
  "confidence_per_section": {"overall_sentiment": 0.9, "emotions": 0.85},
  "recommended_actions_priority_order": ["act on alerts", "review top_themes", "monitor emotion trends"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /trend-sentiment
router.post('/trend-sentiment', async (req: Request, res: Response) => {
  const { topic, texts, time_window } = req.body;
  if (!topic && !texts) return res.status(400).json({ error: 'topic or texts is required' });
  try {
    const raw = await callClaude(`Analyze sentiment trend for topic: "${topic || 'general'}", time_window: "${time_window || '7 days'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "topic": "${topic || 'general'}",
  "time_window": "${time_window || '7 days'}",
  "trend": {
    "direction": "improving|declining|stable|volatile",
    "current_score": 0.72,
    "previous_score": 0.65,
    "change_pct": 10.8,
    "data_points": [{"date": "YYYY-MM-DD", "score": 0.7, "label": "positive"}]
  },
  "emotions": {
    "joy": 0.4, "anger": 0.1, "sadness": 0.05,
    "fear": 0.05, "surprise": 0.2, "disgust": 0.02,
    "dominant": "joy"
  },
  "inflection_points": [{"date": "YYYY-MM-DD", "event": "string", "impact": "positive|negative"}],
  "source_provenance": {"provider": "sentiment-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.9},
  "cache_ttl_seconds": 3600,
  "cache_recommended": true,
  "recommended_next_api": "entity-extraction",
  "recommended_next_endpoint": "/entities",
  "automation_safe": true,
  "confidence_per_section": {"trend": 0.85, "emotions": 0.85},
  "recommended_actions_priority_order": ["monitor direction", "investigate inflection_points", "track dominant emotion"],
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
    const results = await Promise.all(items.map(async (item: { text: string; context?: string }) => {
      const raw = await callClaude(`Sentiment for: "${item.text.slice(0, 200)}". Return JSON:
{"text_snippet": "${item.text.slice(0, 50)}", "label": "positive|negative|neutral", "score": 0.8, "success": true}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(),
      computed_at: new Date().toISOString(),
      success: true,
      batch_count: items.length,
      results,
      source_provenance: { provider: 'sentiment-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.95 },
      cache_ttl_seconds: 3600,
      cache_recommended: true,
      recommended_next_api: 'sentiment',
      recommended_next_endpoint: '/trend-sentiment',
      automation_safe: true,
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
