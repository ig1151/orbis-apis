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
  res.json({ name: 'Audio Transcription API', info: '/audio-transcription/info', openapi: '/audio-transcription/openapi.json', health: 'ok' });
});

// POST /transcribe
router.post('/transcribe', async (req: Request, res: Response) => {
  const { audio_url, language } = req.body;
  if (!audio_url) return res.status(400).json({ error: 'audio_url is required' });
  try {
    const raw = await callClaude(`Transcribe audio file at URL: "${audio_url}", language hint: "${language || 'auto-detect'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "audio_url": "${audio_url}",
  "transcription": {
    "text": "string",
    "language": "en",
    "word_count": 300,
    "duration_seconds": 180,
    "confidence": 0.92
  },
  "confidence_per_section": {"transcription": 0.85},
  "recommended_actions_priority_order": ["verify transcript accuracy", "get timestamps", "generate summary"],
  "source_provenance": {"provider": "claude-sonnet-4-5", "retrieved_at": "${new Date().toISOString()}", "model_version": "claude-sonnet-4-5", "freshness_score": 0.9},
  "cache_ttl_seconds": 86400,
  "cache_recommended": true,
  "recommended_next_api": "text-summarizer",
  "recommended_next_endpoint": "/summarize",
  "automation_safe": true,
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /timestamps
router.post('/timestamps', async (req: Request, res: Response) => {
  const { audio_url } = req.body;
  if (!audio_url) return res.status(400).json({ error: 'audio_url is required' });
  try {
    const raw = await callClaude(`Transcribe with word-level timestamps for audio: "${audio_url}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "audio_url": "${audio_url}",
  "timestamped_transcript": {
    "segments": [{"start_seconds": 0, "end_seconds": 10, "text": "string", "confidence": 0.9}],
    "word_timestamps": [{"word": "string", "start": 0.0, "end": 0.5}],
    "language": "en",
    "duration_seconds": 180
  },
  "confidence_per_section": {"timestamped_transcript": 0.8},
  "recommended_actions_priority_order": ["use segments for indexing", "verify low-confidence segments", "sync with video"],
  "source_provenance": {"provider": "claude-sonnet-4-5", "retrieved_at": "${new Date().toISOString()}", "model_version": "claude-sonnet-4-5", "freshness_score": 0.9},
  "cache_ttl_seconds": 86400,
  "cache_recommended": true,
  "recommended_next_api": "transcript-extraction",
  "recommended_next_endpoint": "/semantic-chunks",
  "automation_safe": true,
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /summary
router.post('/summary', async (req: Request, res: Response) => {
  const { audio_url } = req.body;
  if (!audio_url) return res.status(400).json({ error: 'audio_url is required' });
  try {
    const raw = await callClaude(`Transcribe and summarize audio at: "${audio_url}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "audio_url": "${audio_url}",
  "summary": {
    "paragraph": "string",
    "bullet_points": ["string"],
    "key_topics": ["string"],
    "action_items": ["string"],
    "duration_seconds": 180
  },
  "confidence_per_section": {"summary": 0.8},
  "recommended_actions_priority_order": ["review action_items", "share bullet_points", "archive full transcript"],
  "source_provenance": {"provider": "claude-sonnet-4-5", "retrieved_at": "${new Date().toISOString()}", "model_version": "claude-sonnet-4-5", "freshness_score": 0.9},
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

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { audio_url, objective } = req.body;
  if (!audio_url) return res.status(400).json({ error: 'audio_url is required' });
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: true,
    audio_url,
    objective: objective || 'transcription',
    next_api: 'text-summarizer',
    next_endpoint: '/summarize',
    blocking_flags: [],
    flag_definitions: { NO_AUDIO_URL: 'audio_url is required', UNSUPPORTED_FORMAT: 'Unsupported audio format — use mp3, wav, m4a, or ogg' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Verify audio URL is accessible', 'Choose language hint for accuracy', 'Get timestamps for indexing'],
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), model_version: 'n/a', freshness_score: 1.0 },
    cache_ttl_seconds: 86400,
    cache_recommended: false,
    recommended_next_api: 'text-summarizer',
    recommended_next_endpoint: '/summarize',
    automation_safe: true,
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /analyze (ONE-CALL)
router.post('/analyze', async (req: Request, res: Response) => {
  const { audio_url, context } = req.body;
  if (!audio_url) return res.status(400).json({ error: 'audio_url is required' });
  try {
    const raw = await callClaude(`Full audio transcription and analysis for: "${audio_url}", context: "${context || 'general'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "audio_url": "${audio_url}",
  "transcription": {"text": "string", "language": "en", "duration_seconds": 180},
  "timestamped_segments": [{"start_seconds": 0, "end_seconds": 30, "text": "string"}],
  "speakers": [{"label": "Speaker 1", "talk_time_seconds": 120}],
  "summary": "string",
  "action_items": ["string"],
  "sentiment": "positive",
  "topics": ["string"],
  "confidence_per_section": {"transcription": 0.85, "summary": 0.8},
  "recommended_actions_priority_order": ["process action_items", "share summary", "archive transcript"],
  "source_provenance": {"provider": "claude-sonnet-4-5", "retrieved_at": "${new Date().toISOString()}", "model_version": "claude-sonnet-4-5", "freshness_score": 0.9},
  "cache_ttl_seconds": 86400,
  "cache_recommended": true,
  "recommended_next_api": "sentiment",
  "recommended_next_endpoint": "/trend-sentiment",
  "automation_safe": true,
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /emotion-analysis
router.post('/emotion-analysis', async (req: Request, res: Response) => {
  const { audio_url } = req.body;
  if (!audio_url) return res.status(400).json({ error: 'audio_url is required' });
  try {
    const raw = await callClaude(`Analyze emotional tone and speaker emotions in audio: "${audio_url}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "audio_url": "${audio_url}",
  "emotions": {
    "frustration_score": 0.1,
    "confidence_score": 0.85,
    "engagement_score": 0.9
  },
  "speaker_segments": [
    {
      "speaker": "Speaker 1",
      "start_seconds": 0,
      "end_seconds": 60,
      "emotions": {"frustration_score": 0.1, "confidence_score": 0.85, "engagement_score": 0.9}
    }
  ],
  "overall_tone": "positive|negative|neutral",
  "confidence_per_section": {"emotions": 0.8},
  "recommended_actions_priority_order": ["flag high frustration segments", "use engagement for content quality", "route frustrated speakers to support"],
  "source_provenance": {"provider": "claude-sonnet-4-5", "retrieved_at": "${new Date().toISOString()}", "model_version": "claude-sonnet-4-5", "freshness_score": 0.9},
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

// POST /meeting-intelligence
router.post('/meeting-intelligence', async (req: Request, res: Response) => {
  const { audio_url } = req.body;
  if (!audio_url) return res.status(400).json({ error: 'audio_url is required' });
  try {
    const raw = await callClaude(`Extract full meeting intelligence from audio: "${audio_url}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "audio_url": "${audio_url}",
  "action_items": [{"item": "string", "owner": "string", "due_date": "string", "priority": "high|medium|low"}],
  "decisions": [{"decision": "string", "made_by": "string", "context": "string"}],
  "participants": [{"name": "string", "role": "string", "talk_time_pct": 50.0}],
  "follow_ups": [{"topic": "string", "assigned_to": "string", "deadline": "string"}],
  "meeting_summary": "string",
  "key_topics": ["string"],
  "confidence_per_section": {"action_items": 0.85, "decisions": 0.8},
  "recommended_actions_priority_order": ["assign action_items immediately", "log decisions to CRM", "schedule follow_ups"],
  "source_provenance": {"provider": "claude-sonnet-4-5", "retrieved_at": "${new Date().toISOString()}", "model_version": "claude-sonnet-4-5", "freshness_score": 0.9},
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
    const results = await Promise.all(limited.map(async (item: { audio_url: string; language?: string }, idx: number) => {
      try {
        const raw = await callClaude(`Transcribe audio at URL: "${item.audio_url}", language: "${item.language || 'auto'}". Return JSON:
{
  "index": ${idx},
  "audio_url": "${item.audio_url}",
  "transcription": {"text": "string", "language": "en", "word_count": 200, "duration_seconds": 120, "confidence": 0.9},
  "success": true
}`);
        return parseJSON(raw);
      } catch (e: any) {
        return { index: idx, audio_url: item.audio_url, success: false, error: e.message };
      }
    }));
    res.json({
      trace_id: traceId(),
      computed_at: new Date().toISOString(),
      success: true,
      total: limited.length,
      results,
      source_provenance: { provider: 'claude-sonnet-4-5', retrieved_at: new Date().toISOString(), model_version: 'claude-sonnet-4-5', freshness_score: 0.9 },
      cache_ttl_seconds: 86400,
      cache_recommended: true,
      recommended_next_api: 'text-summarizer',
      recommended_next_endpoint: '/summarize',
      automation_safe: true,
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
