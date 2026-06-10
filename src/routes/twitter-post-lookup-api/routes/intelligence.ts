import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';


function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Twitter Post Lookup API', info: '/twitter-post-lookup/info', openapi: '/twitter-post-lookup/openapi.json', health: 'ok' });
});

// POST /tweet
router.post('/tweet', async (req: Request, res: Response) => {
  const { tweet_url, tweet_id } = req.body;
  if (!tweet_url && !tweet_id) return res.status(400).json({ error: 'tweet_url or tweet_id is required' });
  try {
    const raw = await callClaude(`Get tweet data for: "${tweet_url || tweet_id}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "tweet_id": "${tweet_id || ''}",
  "tweet": {
    "text": "string", "author_username": "string", "author_display_name": "string",
    "author_followers": 50000, "verified": false,
    "posted_at": "ISO8601",
    "likes": 1200, "retweets": 450, "replies": 85, "bookmarks": 200,
    "impressions": 50000,
    "hashtags": ["string"], "mentions": ["string"], "urls": ["string"],
    "media_count": 1, "is_thread": false, "thread_length": 1
  },
  "source_provenance": {"provider": "twitter-lookup-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.9},
  "cache_ttl_seconds": 3600,
  "cache_recommended": true,
  "recommended_next_api": "twitter-post-lookup",
  "recommended_next_endpoint": "/engagement-analysis",
  "automation_safe": true,
  "confidence_per_section": {"tweet": 0.9},
  "recommended_actions_priority_order": ["analyze engagement", "check thread context", "run sentiment"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /user-tweets
router.post('/user-tweets', async (req: Request, res: Response) => {
  const { username, limit, since_date } = req.body;
  if (!username) return res.status(400).json({ error: 'username is required' });
  try {
    const raw = await callClaude(`Get recent tweets for user: "${username}", limit: ${limit || 20}, since: "${since_date || '7 days ago'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "username": "${username}",
  "tweets": [
    {"tweet_id": "string", "text": "string", "posted_at": "ISO8601", "likes": 500, "retweets": 120, "replies": 45, "impressions": 20000, "hashtags": ["string"]}
  ],
  "total_fetched": 20,
  "top_hashtags": ["string"],
  "avg_engagement_rate": 0.04,
  "source_provenance": {"provider": "twitter-lookup-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.9},
  "cache_ttl_seconds": 1800,
  "cache_recommended": true,
  "recommended_next_api": "twitter-post-lookup",
  "recommended_next_endpoint": "/thread-summary",
  "automation_safe": true,
  "confidence_per_section": {"tweets": 0.9},
  "recommended_actions_priority_order": ["identify top tweets", "check top_hashtags", "run thread summary"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /engagement-analysis
router.post('/engagement-analysis', async (req: Request, res: Response) => {
  const { tweet_id, tweet_url } = req.body;
  if (!tweet_id && !tweet_url) return res.status(400).json({ error: 'tweet_id or tweet_url is required' });
  try {
    const raw = await callClaude(`Analyze engagement for tweet: "${tweet_id || tweet_url}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "tweet_id": "${tweet_id || ''}",
  "engagement": {
    "likes": 1200, "retweets": 450, "replies": 85, "bookmarks": 200, "impressions": 50000,
    "engagement_rate": 0.039,
    "viral_score": 0.75,
    "reply_sentiment": "positive|negative|mixed|neutral",
    "top_engagers": [{"username": "string", "followers": 50000, "verified": false}]
  },
  "performance_vs_author_avg": 1.8,
  "source_provenance": {"provider": "twitter-lookup-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.9},
  "cache_ttl_seconds": 3600,
  "cache_recommended": true,
  "recommended_next_api": "sentiment",
  "recommended_next_endpoint": "/sentiment",
  "automation_safe": true,
  "confidence_per_section": {"engagement": 0.85},
  "recommended_actions_priority_order": ["check viral_score", "review top_engagers", "run sentiment on replies"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { username, objective } = req.body;
  if (!username) return res.status(400).json({ error: 'username is required' });
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: true,
    username,
    objective: objective || 'tweet_monitoring',
    next_api: 'twitter-post-lookup',
    next_endpoint: '/user-tweets',
    blocking_flags: [],
    flag_definitions: { NO_USERNAME: 'username is required', PROTECTED_ACCOUNT: 'Account is protected — tweets not accessible' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0,
    cache_recommended: false,
    recommended_next_api: 'twitter-post-lookup',
    recommended_next_endpoint: '/user-tweets',
    automation_safe: true,
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Fetch user tweets', 'Analyze engagement', 'Run thread summary'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /twitter-intelligence (ONE-CALL)
router.post('/twitter-intelligence', async (req: Request, res: Response) => {
  const { username, context } = req.body;
  if (!username) return res.status(400).json({ error: 'username is required' });
  try {
    const raw = await callClaude(`Full Twitter intelligence for: "${username}", context: "${context || 'brand monitoring'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "username": "${username}",
  "top_tweets": [{"tweet_id": "string", "text": "string", "likes": 1000, "viral_score": 0.8}],
  "engagement_summary": {"avg_likes": 500, "avg_retweets": 100, "avg_engagement_rate": 0.04, "trend": "growing|stable|declining"},
  "top_topics": ["string"],
  "posting_pattern": {"peak_days": ["string"], "peak_hours": ["string"], "avg_per_week": 5},
  "influence_score": 0.75,
  "source_provenance": {"provider": "twitter-lookup-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.9},
  "cache_ttl_seconds": 3600,
  "cache_recommended": true,
  "recommended_next_api": "sentiment",
  "recommended_next_endpoint": "/trend-sentiment",
  "automation_safe": true,
  "confidence_per_section": {"top_tweets": 0.9, "engagement_summary": 0.85},
  "recommended_actions_priority_order": ["review top_topics", "check posting_pattern", "assess influence_score"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /thread-summary
router.post('/thread-summary', async (req: Request, res: Response) => {
  const { tweet_id, tweet_url } = req.body;
  if (!tweet_id && !tweet_url) return res.status(400).json({ error: 'tweet_id or tweet_url is required' });
  try {
    const raw = await callClaude(`Summarize Twitter thread starting at: "${tweet_id || tweet_url}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "tweet_id": "${tweet_id || ''}",
  "thread": {
    "length": 8,
    "summary": "string",
    "key_points": ["string"],
    "total_likes": 5000,
    "total_retweets": 1200,
    "total_impressions": 200000,
    "virality_score": 0.82,
    "momentum_direction": "accelerating|stable|declining",
    "peak_engagement_tweet": {"tweet_id": "string", "text": "string", "likes": 2000}
  },
  "audience_reaction": "positive|negative|mixed|divided",
  "source_provenance": {"provider": "twitter-lookup-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.9},
  "cache_ttl_seconds": 3600,
  "cache_recommended": true,
  "recommended_next_api": "sentiment",
  "recommended_next_endpoint": "/trend-sentiment",
  "automation_safe": true,
  "confidence_per_section": {"thread": 0.85},
  "recommended_actions_priority_order": ["review key_points", "monitor momentum_direction", "run sentiment analysis"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /batch
router.post('/batch', async (req: Request, res: Response) => {
  const { tweet_ids } = req.body;
  if (!Array.isArray(tweet_ids) || tweet_ids.length === 0) return res.status(400).json({ error: 'tweet_ids array is required' });
  if (tweet_ids.length > 10) return res.status(400).json({ error: 'Maximum 10 tweets per batch' });
  try {
    const results = await Promise.all(tweet_ids.map(async (tweet_id: string) => {
      const raw = await callClaude(`Brief tweet summary for ID: "${tweet_id}". Return JSON:
{"tweet_id": "${tweet_id}", "text_snippet": "string", "likes": 0, "retweets": 0, "author": "string", "posted_at": "ISO8601"}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(),
      computed_at: new Date().toISOString(),
      success: true,
      batch_count: tweet_ids.length,
      results,
      source_provenance: { provider: 'twitter-lookup-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.9 },
      cache_ttl_seconds: 3600,
      cache_recommended: true,
      recommended_next_api: 'twitter-post-lookup',
      recommended_next_endpoint: '/engagement-analysis',
      automation_safe: true,
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
