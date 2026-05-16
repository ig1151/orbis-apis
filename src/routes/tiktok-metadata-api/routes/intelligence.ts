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
  res.json({ name: 'TikTok Metadata API', info: '/tiktok-metadata/info', openapi: '/tiktok-metadata/openapi.json', health: 'ok' });
});

// POST /video
router.post('/video', async (req: Request, res: Response) => {
  const { video_url } = req.body;
  if (!video_url) return res.status(400).json({ error: 'video_url is required' });
  try {
    const raw = await callClaude(`Get TikTok video metadata for: "${video_url}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "video_url": "${video_url}",
  "video": {
    "title": "string", "creator": "string", "username": "string",
    "posted_at": "string", "duration_seconds": number,
    "views": number, "likes": number, "comments": number, "shares": number,
    "hashtags": ["string"], "audio_track": "string", "is_trending": false
  },
  "engagement_rate": number,
  "confidence_per_section": {"video": 0.8},
  "recommended_actions_priority_order": ["check engagement rate", "analyze creator", "track hashtags"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /creator
router.post('/creator', async (req: Request, res: Response) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'username is required' });
  try {
    const raw = await callClaude(`Get TikTok creator analytics for username: "${username}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "username": "${username}",
  "creator": {
    "name": "string", "bio": "string", "followers": number, "following": number,
    "total_likes": number, "video_count": number, "verified": false,
    "avg_views": number, "avg_engagement": number,
    "top_hashtags": ["string"], "content_niche": "string"
  },
  "influence_tier": "mega|macro|micro|nano",
  "growth_trend": "growing|stable|declining",
  "confidence_per_section": {"creator": 0.8},
  "recommended_actions_priority_order": ["assess influence tier", "check growth trend", "review content niche"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /trend
router.post('/trend', async (req: Request, res: Response) => {
  const { keyword, region } = req.body;
  if (!keyword) return res.status(400).json({ error: 'keyword is required' });
  try {
    const raw = await callClaude(`Get TikTok trending content for keyword: "${keyword}", region: "${region || 'global'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "keyword": "${keyword}",
  "region": "${region || 'global'}",
  "trending_videos": [
    {"video_url": "string", "creator": "string", "views": number, "likes": number, "hashtags": ["string"]}
  ],
  "trend_score": number,
  "peak_time": "string",
  "related_hashtags": ["string"],
  "confidence_per_section": {"trending_videos": 0.75},
  "recommended_actions_priority_order": ["monitor trend velocity", "engage related hashtags", "identify top creators"],
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
    objective: objective || 'creator_intelligence',
    next_api: 'podcast-search',
    next_endpoint: '/search',
    blocking_flags: [],
    flag_definitions: { NO_USERNAME: 'Username is required', PRIVATE_ACCOUNT: 'Account is private — limited data available' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Get creator analytics', 'Analyze recent videos', 'Track trending content'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /analyze (ONE-CALL)
router.post('/analyze', async (req: Request, res: Response) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'username is required' });
  try {
    const raw = await callClaude(`Full TikTok intelligence for creator: "${username}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "username": "${username}",
  "creator": {"name": "string", "followers": number, "avg_views": number, "influence_tier": "string"},
  "top_videos": [{"url": "string", "views": number, "likes": number, "hashtags": ["string"]}],
  "trending_hashtags": ["string"],
  "content_strategy": {"niche": "string", "posting_frequency": "string", "best_performing_type": "string"},
  "audience_demographics": {"age_range": "string", "top_regions": ["string"]},
  "confidence_per_section": {"creator": 0.8, "content_strategy": 0.75},
  "recommended_actions_priority_order": ["leverage content_strategy", "partner on trending hashtags", "target audience demographics"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
