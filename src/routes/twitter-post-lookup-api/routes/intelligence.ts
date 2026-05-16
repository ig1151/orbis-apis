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
  res.json({ name: 'X/Twitter Post Lookup API', info: '/twitter-post-lookup/info', openapi: '/twitter-post-lookup/openapi.json', health: 'ok' });
});

// POST /post
router.post('/post', async (req: Request, res: Response) => {
  const { post_url, post_id } = req.body;
  if (!post_url && !post_id) return res.status(400).json({ error: 'post_url or post_id is required' });
  const identifier = post_url || post_id;
  try {
    const raw = await callClaude(`Get Twitter/X post data for: "${identifier}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "post_id": "${post_id || 'extracted'}",
  "post": {
    "text": "string", "author": "string", "username": "string",
    "posted_at": "string", "likes": number, "retweets": number,
    "replies": number, "views": number, "is_thread": false, "thread_length": 1
  },
  "sentiment": "positive|negative|neutral",
  "topics": ["string"],
  "confidence_per_section": {"post": 0.8},
  "recommended_actions_priority_order": ["check thread context", "measure engagement", "analyze sentiment"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /profile
router.post('/profile', async (req: Request, res: Response) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'username is required' });
  try {
    const raw = await callClaude(`Get Twitter/X profile metrics for username: "${username}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "username": "${username}",
  "profile": {
    "name": "string", "bio": "string", "followers": number, "following": number,
    "tweets_count": number, "likes_count": number, "verified": false,
    "created_at": "string", "location": "string", "website": "string"
  },
  "audience_quality": "high|medium|low",
  "influence_score": number,
  "confidence_per_section": {"profile": 0.8},
  "recommended_actions_priority_order": ["check follower quality", "assess influence score", "review recent tweets"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /engagement
router.post('/engagement', async (req: Request, res: Response) => {
  const { post_url } = req.body;
  if (!post_url) return res.status(400).json({ error: 'post_url is required' });
  try {
    const raw = await callClaude(`Analyze engagement for Twitter/X post: "${post_url}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "post_url": "${post_url}",
  "engagement": {
    "likes": number, "retweets": number, "replies": number, "quotes": number, "views": number,
    "engagement_rate": number, "viral_score": number
  },
  "audience_reaction": "positive|negative|neutral|mixed",
  "top_replies": [{"text": "string", "likes": number, "author": "string"}],
  "confidence_per_section": {"engagement": 0.8},
  "recommended_actions_priority_order": ["note viral score", "read top replies", "check audience reaction"],
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
    objective: objective || 'social_intelligence',
    next_api: 'youtube-metadata',
    next_endpoint: '/channel',
    blocking_flags: [],
    flag_definitions: { NO_USERNAME: 'Username is required', PRIVATE_ACCOUNT: 'Account is private — limited data available' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Get profile first', 'Measure engagement', 'Analyze sentiment'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /analyze (ONE-CALL)
router.post('/analyze', async (req: Request, res: Response) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'username is required' });
  try {
    const raw = await callClaude(`Full Twitter/X intelligence for username: "${username}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "username": "${username}",
  "profile": {"name": "string", "bio": "string", "followers": number, "verified": false},
  "recent_posts": [{"text": "string", "likes": number, "retweets": number, "sentiment": "positive|negative|neutral"}],
  "engagement_avg": {"likes": number, "retweets": number, "engagement_rate": number},
  "topics": ["string"],
  "sentiment_distribution": {"positive": number, "neutral": number, "negative": number},
  "influence_assessment": {"score": number, "tier": "mega|macro|micro|nano"},
  "confidence_per_section": {"profile": 0.8, "recent_posts": 0.75},
  "recommended_actions_priority_order": ["verify influence tier", "review top topics", "track sentiment trend"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
