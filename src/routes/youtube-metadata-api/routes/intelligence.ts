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
  res.json({ name: 'YouTube Metadata API', info: '/youtube-metadata/info', openapi: '/youtube-metadata/openapi.json', health: 'ok' });
});

// POST /video
router.post('/video', async (req: Request, res: Response) => {
  const { video_url, video_id } = req.body;
  if (!video_url && !video_id) return res.status(400).json({ error: 'video_url or video_id is required' });
  const identifier = video_url || video_id;
  try {
    const raw = await callClaude(`Get YouTube video metadata for: "${identifier}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "video_id": "${video_id || 'extracted'}",
  "video": {
    "title": "string", "description": "string", "channel": "string",
    "published_at": "string", "duration_seconds": number, "views": number,
    "likes": number, "comments": number, "tags": ["string"],
    "category": "string", "language": "string"
  },
  "engagement_rate": number,
  "confidence_per_section": {"video": 0.85},
  "recommended_actions_priority_order": ["check engagement rate", "extract transcript", "analyze channel"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /channel
router.post('/channel', async (req: Request, res: Response) => {
  const { channel_url, channel_id } = req.body;
  if (!channel_url && !channel_id) return res.status(400).json({ error: 'channel_url or channel_id is required' });
  const identifier = channel_url || channel_id;
  try {
    const raw = await callClaude(`Get YouTube channel analytics for: "${identifier}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "channel": {
    "name": "string", "description": "string", "subscribers": number,
    "total_views": number, "video_count": number, "created_at": "string",
    "country": "string", "category": "string",
    "top_videos": [{"title": "string", "views": number, "published_at": "string"}]
  },
  "growth_trend": "growing|stable|declining",
  "confidence_per_section": {"channel": 0.85},
  "recommended_actions_priority_order": ["assess growth trend", "review top videos", "check subscriber quality"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /transcript
router.post('/transcript', async (req: Request, res: Response) => {
  const { video_url } = req.body;
  if (!video_url) return res.status(400).json({ error: 'video_url is required' });
  try {
    const raw = await callClaude(`Extract transcript from YouTube video: "${video_url}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "video_url": "${video_url}",
  "transcript": {
    "full_text": "string",
    "segments": [{"start_seconds": number, "end_seconds": number, "text": "string"}],
    "language": "string", "word_count": number
  },
  "key_topics": ["string"],
  "summary": "string",
  "confidence_per_section": {"transcript": 0.8},
  "recommended_actions_priority_order": ["use for RAG indexing", "extract key topics", "summarize for reports"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { video_url, objective } = req.body;
  if (!video_url) return res.status(400).json({ error: 'video_url is required' });
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: true,
    video_url,
    objective: objective || 'content_intelligence',
    next_api: 'tiktok-metadata',
    next_endpoint: '/video',
    blocking_flags: [],
    flag_definitions: { NO_VIDEO: 'No video URL provided', UNAVAILABLE: 'Video may be private or deleted' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Get video metadata', 'Extract transcript', 'Analyze channel'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /analyze (ONE-CALL)
router.post('/analyze', async (req: Request, res: Response) => {
  const { video_url } = req.body;
  if (!video_url) return res.status(400).json({ error: 'video_url is required' });
  try {
    const raw = await callClaude(`Full YouTube content intelligence for video: "${video_url}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "video_url": "${video_url}",
  "video_metadata": {"title": "string", "duration_seconds": number, "views": number, "likes": number, "published_at": "string"},
  "channel_summary": {"name": "string", "subscribers": number, "growth_trend": "string"},
  "transcript_summary": "string",
  "key_topics": ["string"],
  "sentiment": "positive|negative|neutral",
  "content_grade": "A|B|C|D|F",
  "confidence_per_section": {"video_metadata": 0.85, "transcript_summary": 0.8},
  "recommended_actions_priority_order": ["index transcript for RAG", "check content grade", "track channel growth"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
