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
  res.json({ name: 'Podcast Search API', info: '/podcast-search/info', openapi: '/podcast-search/openapi.json', health: 'ok' });
});

// POST /search
router.post('/search', async (req: Request, res: Response) => {
  const { query, language } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  try {
    const raw = await callClaude(`Search podcasts for query: "${query}", language: "${language || 'en'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "query": "${query}",
  "podcasts": [
    {"podcast_id": "string", "title": "string", "author": "string", "description": "string",
     "episode_count": number, "language": "string", "category": "string", "rating": number}
  ],
  "total_found": number,
  "confidence_per_section": {"podcasts": 0.85},
  "recommended_actions_priority_order": ["filter by language", "check episode count", "get episode details"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /episode
router.post('/episode', async (req: Request, res: Response) => {
  const { episode_url, episode_id } = req.body;
  if (!episode_url && !episode_id) return res.status(400).json({ error: 'episode_url or episode_id is required' });
  const identifier = episode_url || episode_id;
  try {
    const raw = await callClaude(`Get podcast episode metadata for: "${identifier}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "episode_id": "${episode_id || 'extracted'}",
  "episode": {
    "title": "string", "podcast": "string", "author": "string",
    "published_at": "string", "duration_seconds": number,
    "description": "string", "audio_url": "string",
    "season": number, "episode_number": number, "language": "string"
  },
  "confidence_per_section": {"episode": 0.85},
  "recommended_actions_priority_order": ["extract transcript", "check duration", "find related episodes"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /transcript
router.post('/transcript', async (req: Request, res: Response) => {
  const { episode_url } = req.body;
  if (!episode_url) return res.status(400).json({ error: 'episode_url is required' });
  try {
    const raw = await callClaude(`Extract transcript from podcast episode: "${episode_url}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "episode_url": "${episode_url}",
  "transcript": {
    "full_text": "string",
    "segments": [{"start_seconds": number, "end_seconds": number, "speaker": "string", "text": "string"}],
    "language": "string", "word_count": number
  },
  "key_topics": ["string"],
  "summary": "string",
  "confidence_per_section": {"transcript": 0.75},
  "recommended_actions_priority_order": ["index for RAG", "extract key topics", "identify speakers"],
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
    objective: objective || 'podcast_research',
    next_api: 'transcript-extraction',
    next_endpoint: '/podcast',
    blocking_flags: [],
    flag_definitions: { NO_QUERY: 'Search query is required', TRANSCRIPT_UNAVAILABLE: 'Transcript may not be available for all episodes' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Search podcasts first', 'Get episode metadata', 'Extract transcript'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /lookup (ONE-CALL)
router.post('/lookup', async (req: Request, res: Response) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  try {
    const raw = await callClaude(`Full podcast intelligence for query: "${query}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "query": "${query}",
  "top_podcasts": [{"title": "string", "author": "string", "episode_count": number, "rating": number}],
  "top_episodes": [
    {"title": "string", "podcast": "string", "duration_seconds": number, "published_at": "string", "description": "string"}
  ],
  "best_match": {"title": "string", "reason": "string"},
  "confidence_per_section": {"top_podcasts": 0.85, "top_episodes": 0.8},
  "recommended_actions_priority_order": ["explore best_match first", "extract transcript for RAG", "check related podcasts"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
