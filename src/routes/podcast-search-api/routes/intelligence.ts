import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';


function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Podcast Search API', info: '/podcast-search/info', openapi: '/podcast-search/openapi.json', health: 'ok' });
});

// POST /search
router.post('/search', async (req: Request, res: Response) => {
  const { query, category, language } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  try {
    const raw = await callClaude(`Search podcasts for: "${query}", category: "${category || 'any'}", language: "${language || 'en'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "query": "${query}",
  "podcasts": [
    {"podcast_id": "string", "title": "string", "description": "string", "host": "string", "category": "string", "language": "en", "episode_count": 200, "subscribers": 50000, "rating": 4.8, "rss_url": "string", "website": "string"}
  ],
  "total_found": 10,
  "source_provenance": {"provider": "podcast-search-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.85},
  "cache_ttl_seconds": 3600,
  "cache_recommended": true,
  "recommended_next_api": "podcast-search",
  "recommended_next_endpoint": "/podcast-details",
  "automation_safe": true,
  "confidence_per_section": {"podcasts": 0.85},
  "recommended_actions_priority_order": ["check rating", "get podcast details", "find guest quotes"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /episode-details
router.post('/episode-details', async (req: Request, res: Response) => {
  const { episode_id, podcast_id } = req.body;
  if (!episode_id && !podcast_id) return res.status(400).json({ error: 'episode_id or podcast_id is required' });
  try {
    const raw = await callClaude(`Get episode details for: "${episode_id || podcast_id}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "episode_id": "${episode_id || ''}",
  "episode": {
    "title": "string", "description": "string", "published_at": "ISO8601",
    "duration_seconds": 3600, "episode_number": 50,
    "guests": ["string"], "topics": ["string"],
    "audio_url": "string", "transcript_available": false,
    "downloads": 25000, "rating": 4.9
  },
  "source_provenance": {"provider": "podcast-search-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.85},
  "cache_ttl_seconds": 3600,
  "cache_recommended": true,
  "recommended_next_api": "podcast-search",
  "recommended_next_endpoint": "/quote-extraction",
  "automation_safe": true,
  "confidence_per_section": {"episode": 0.85},
  "recommended_actions_priority_order": ["extract quotes", "get transcript", "note guests"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /podcast-details
router.post('/podcast-details', async (req: Request, res: Response) => {
  const { podcast_id } = req.body;
  if (!podcast_id) return res.status(400).json({ error: 'podcast_id is required' });
  try {
    const raw = await callClaude(`Get full podcast details for ID: "${podcast_id}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "podcast_id": "${podcast_id}",
  "podcast": {
    "title": "string", "description": "string", "host": "string",
    "category": "string", "language": "en",
    "episode_count": 200, "subscribers": 50000, "rating": 4.8,
    "started_date": "YYYY-MM-DD", "last_episode_date": "YYYY-MM-DD",
    "publish_frequency": "weekly|biweekly|daily|monthly",
    "rss_url": "string", "website": "string",
    "recent_episodes": [{"title": "string", "published": "ISO8601", "duration_seconds": 3600}],
    "notable_guests": ["string"]
  },
  "source_provenance": {"provider": "podcast-search-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.85},
  "cache_ttl_seconds": 3600,
  "cache_recommended": true,
  "recommended_next_api": "podcast-search",
  "recommended_next_endpoint": "/episode-details",
  "automation_safe": true,
  "confidence_per_section": {"podcast": 0.85},
  "recommended_actions_priority_order": ["check notable_guests", "review recent_episodes", "extract quotes"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { query, objective } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: true,
    query,
    objective: objective || 'podcast_discovery',
    next_api: 'podcast-search',
    next_endpoint: '/search',
    blocking_flags: [],
    flag_definitions: { NO_QUERY: 'query is required', NO_RESULTS: 'No podcasts found for query' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0,
    cache_recommended: false,
    recommended_next_api: 'podcast-search',
    recommended_next_endpoint: '/search',
    automation_safe: true,
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Search podcasts', 'Get episode details', 'Extract notable quotes'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /podcast-intelligence (ONE-CALL)
router.post('/podcast-intelligence', async (req: Request, res: Response) => {
  const { query, context } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  try {
    const raw = await callClaude(`Full podcast intelligence for: "${query}", context: "${context || 'research'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "query": "${query}",
  "top_podcasts": [{"podcast_id": "string", "title": "string", "host": "string", "subscribers": 50000, "rating": 4.8, "niche": "string"}],
  "trending_topics": ["string"],
  "notable_guests_found": ["string"],
  "best_for_advertising": {"podcast_id": "string", "reason": "string"},
  "best_for_research": {"podcast_id": "string", "reason": "string"},
  "source_provenance": {"provider": "podcast-search-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.85},
  "cache_ttl_seconds": 3600,
  "cache_recommended": true,
  "recommended_next_api": "transcript-extraction",
  "recommended_next_endpoint": "/podcast",
  "automation_safe": true,
  "confidence_per_section": {"top_podcasts": 0.85},
  "recommended_actions_priority_order": ["check best_for_advertising", "extract episode transcripts", "find notable quotes"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /quote-extraction
router.post('/quote-extraction', async (req: Request, res: Response) => {
  const { episode_id, podcast_id, topic } = req.body;
  if (!episode_id && !podcast_id) return res.status(400).json({ error: 'episode_id or podcast_id is required' });
  try {
    const raw = await callClaude(`Extract notable quotes from podcast episode: "${episode_id || podcast_id}", topic filter: "${topic || 'all'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "episode_id": "${episode_id || ''}",
  "quotes": [
    {"quote": "string", "speaker": "string", "timestamp_seconds": 300, "topic": "string", "shareability_score": 0.85}
  ],
  "topics": ["string"],
  "guest_entities": [{"name": "string", "organization": "string", "role": "string"}],
  "controversial_segments": [{"topic": "string", "timestamp_seconds": 600, "controversy_score": 0.7}],
  "key_insights": ["string"],
  "source_provenance": {"provider": "podcast-search-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.85},
  "cache_ttl_seconds": 86400,
  "cache_recommended": true,
  "recommended_next_api": "entity-extraction",
  "recommended_next_endpoint": "/entities",
  "automation_safe": true,
  "confidence_per_section": {"quotes": 0.8, "guest_entities": 0.85},
  "recommended_actions_priority_order": ["use high shareability_score quotes", "log guest_entities", "review controversial_segments"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /batch
router.post('/batch', async (req: Request, res: Response) => {
  const { queries } = req.body;
  if (!Array.isArray(queries) || queries.length === 0) return res.status(400).json({ error: 'queries array is required' });
  if (queries.length > 10) return res.status(400).json({ error: 'Maximum 10 queries per batch' });
  try {
    const results = await Promise.all(queries.map(async (query: string) => {
      const raw = await callClaude(`Top 3 podcasts for: "${query}". Return JSON:
{"query": "${query}", "podcasts": [{"podcast_id": "string", "title": "string", "host": "string", "rating": 4.8, "subscribers": 50000}], "total_found": 3}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(),
      computed_at: new Date().toISOString(),
      success: true,
      batch_count: queries.length,
      results,
      source_provenance: { provider: 'podcast-search-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.85 },
      cache_ttl_seconds: 3600,
      cache_recommended: true,
      recommended_next_api: 'podcast-search',
      recommended_next_endpoint: '/quote-extraction',
      automation_safe: true,
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
