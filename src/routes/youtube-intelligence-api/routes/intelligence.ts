import { Router, Request, Response } from 'express';
import { logger } from '../logger';

const router = Router();
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4-5';

async function callClaude(prompt: string, maxTokens = 1500): Promise<Record<string, unknown>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!response.ok) throw new Error(`OpenRouter error: ${response.status}`);
  const data = await response.json() as { choices: { message: { content: string } }[] };
  try {
    const raw = data.choices[0].message.content ?? '{}';
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch { return { raw: data.choices[0].message.content }; }
}

function extractVideoId(url: string): string {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  throw new Error('Invalid YouTube URL or video ID');
}

async function fetchTranscript(videoId: string): Promise<string> {
  // Use youtube-transcript via a public API proxy approach
  const res = await fetch(
    `https://www.youtube.com/watch?v=${videoId}`,
    { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OrbisBot/1.0)' }, signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) throw new Error(`Failed to fetch video page: ${res.status}`);
  const html = await res.text();

  // Extract title and description from page
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const title = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : 'Unknown';

  // Extract description
  const descMatch = html.match(/"description":{"simpleText":"([^"]+)"/);
  const description = descMatch ? descMatch[1] : '';

  // Extract channel
  const channelMatch = html.match(/"ownerChannelName":"([^"]+)"/);
  const channel = channelMatch ? channelMatch[1] : 'Unknown';

  // Extract view count
  const viewMatch = html.match(/"viewCount":"(\d+)"/);
  const views = viewMatch ? parseInt(viewMatch[1]) : 0;

  // Extract duration
  const durationMatch = html.match(/"lengthSeconds":"(\d+)"/);
  const duration = durationMatch ? parseInt(durationMatch[1]) : 0;

  return JSON.stringify({ title, channel, description: description.slice(0, 500), views, duration_seconds: duration, video_id: videoId });
}

// ── POST /summarize ───────────────────────────────────────────────────────────
router.post('/summarize', async (req: Request, res: Response) => {
  const { url, context } = req.body;
  if (!url) { res.status(400).json({ error: 'Provide url (YouTube URL or video ID)' }); return; }
  const start = Date.now();
  try {
    const videoId = extractVideoId(url);
    const videoData = await fetchTranscript(videoId);
    const data = await callClaude(`You are a YouTube video intelligence engine. Analyze this video metadata and return ONLY a valid JSON object with these keys:
- title: string
- channel: string  
- summary: string (3-5 sentence summary of what this video is likely about)
- key_topics: array of strings
- target_audience: string
- content_type: string (tutorial|review|news|interview|entertainment|educational|marketing|other)
- estimated_value: string (high|medium|low — value for agents/researchers)
- action_items: array of strings (what a viewer should do after watching)
- tags: array of strings
${context ? `Context/goal: ${context}` : ''}
Video data: ${videoData}
Return only the JSON object:`);
    res.json({ endpoint: 'summarize', video_id: videoId, url, data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'summarize', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /extract-entities ────────────────────────────────────────────────────
router.post('/extract-entities', async (req: Request, res: Response) => {
  const { url, context } = req.body;
  if (!url) { res.status(400).json({ error: 'Provide url' }); return; }
  const start = Date.now();
  try {
    const videoId = extractVideoId(url);
    const videoData = await fetchTranscript(videoId);
    const data = await callClaude(`You are an entity extraction engine for YouTube content. Extract all named entities from this video metadata and return ONLY a valid JSON object with these keys:
- people: array of {name, role, context}
- companies: array of {name, type, context}
- products: array of {name, category, context}
- technologies: array of {name, type, context}
- locations: array of {name, type}
- events: array of {name, date, context}
- topics: array of strings
${context ? `Context: ${context}` : ''}
Video data: ${videoData}
Return only the JSON object:`);
    res.json({ endpoint: 'extract-entities', video_id: videoId, url, data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'extract-entities', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /analyze-channel ─────────────────────────────────────────────────────
router.post('/analyze-channel', async (req: Request, res: Response) => {
  const { channel_url, context } = req.body;
  if (!channel_url) { res.status(400).json({ error: 'Provide channel_url' }); return; }
  const start = Date.now();
  try {
    const res2 = await fetch(channel_url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OrbisBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res2.text();
    const nameMatch = html.match(/"channelMetadataRenderer":{"title":"([^"]+)"/);
    const descMatch = html.match(/"description":"([^"]{0,500})"/);
    const subMatch = html.match(/"subscriberCountText":{"accessibility":{"accessibilityData":{"label":"([^"]+)"/);
    const channelData = {
      name: nameMatch?.[1] ?? 'Unknown',
      description: descMatch?.[1] ?? '',
      subscriber_info: subMatch?.[1] ?? 'Unknown',
      url: channel_url,
    };
    const data = await callClaude(`You are a YouTube channel intelligence engine. Analyze this channel and return ONLY a valid JSON object with these keys:
- channel_name: string
- niche: string
- content_strategy: string
- target_audience: string
- estimated_authority: string (high|medium|low)
- monetization_signals: array of strings
- topics_covered: array of strings
- agent_use_cases: array of strings (how AI agents could use this channel's content)
- summary: string (2-3 sentences)
${context ? `Context: ${context}` : ''}
Channel data: ${JSON.stringify(channelData)}
Return only the JSON object:`);
    res.json({ endpoint: 'analyze-channel', channel_url, data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'analyze-channel', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /extract-action-items ────────────────────────────────────────────────
router.post('/extract-action-items', async (req: Request, res: Response) => {
  const { url, context } = req.body;
  if (!url) { res.status(400).json({ error: 'Provide url' }); return; }
  const start = Date.now();
  try {
    const videoId = extractVideoId(url);
    const videoData = await fetchTranscript(videoId);
    const data = await callClaude(`You are an action item extraction engine for YouTube content. Extract actionable intelligence from this video and return ONLY a valid JSON object with these keys:
- action_items: array of {action, priority (high|medium|low), category, estimated_effort}
- key_takeaways: array of strings
- tools_mentioned: array of strings
- resources_mentioned: array of strings
- next_steps: array of strings
- crm_note: string (1-2 sentence note suitable for CRM entry)
${context ? `Context/goal: ${context}` : ''}
Video data: ${videoData}
Return only the JSON object:`);
    res.json({ endpoint: 'extract-action-items', video_id: videoId, url, data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'extract-action-items', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /score-content ───────────────────────────────────────────────────────
router.post('/score-content', async (req: Request, res: Response) => {
  const { url, context } = req.body;
  if (!url) { res.status(400).json({ error: 'Provide url' }); return; }
  const start = Date.now();
  try {
    const videoId = extractVideoId(url);
    const videoData = await fetchTranscript(videoId);
    const data = await callClaude(`You are a content quality scoring engine. Score this YouTube video and return ONLY a valid JSON object with these keys:
- overall_score: number (0-100)
- relevance_score: number (0-100)
- authority_score: number (0-100)
- engagement_potential: string (high|medium|low)
- content_grade: string (A+|A|B+|B|C|D)
- use_for_research: boolean
- use_for_training_data: boolean
- sentiment: string (positive|neutral|negative|mixed)
- credibility_signals: array of strings
- red_flags: array of strings
- recommended_use: string
${context ? `Context: ${context}` : ''}
Video data: ${videoData}
Return only the JSON object:`);
    res.json({ endpoint: 'score-content', video_id: videoId, url, data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'score-content', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /execution-gate ──────────────────────────────────────────────────────
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { url, action, context } = req.body;
  if (!url) { res.status(400).json({ error: 'Provide url' }); return; }
  const start = Date.now();
  try {
    const videoId = extractVideoId(url);
    const videoData = await fetchTranscript(videoId);
    const data = await callClaude(`You are an autonomous agent execution gate for YouTube content processing. Determine whether this video content should trigger an autonomous action. Return ONLY a valid JSON object with these keys:
- execute: boolean
- confidence: number (0-1)
- content_quality: string (high|medium|low)
- risk_level: string (high|medium|low)
- blocking_flags: array of strings
- recommended_action: string
- next_api: string
- next_endpoint: string
- content_safe: boolean
${action ? `Requested action: ${action}` : ''}
${context ? `Context: ${context}` : ''}
Video data: ${videoData}
Return only the JSON object:`) as Record<string, unknown>;
    res.json({
      endpoint: 'execution-gate',
      video_id: videoId,
      url,
      execution_ready: data.execute === true,
      next_api: data.next_api ?? 'autopilot',
      next_endpoint: data.next_endpoint ?? '/should-execute',
      data,
      metadata: { latency_ms: Date.now() - start, estimated_cost: 0.004, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'execution-gate', err }, message);
    res.status(500).json({ error: message });
  }
});

export default router;

// ── POST /analyze-video (one-call workflow) ───────────────────────────────────
router.post('/analyze-video', async (req: Request, res: Response) => {
  const { url, context } = req.body;
  if (!url) { res.status(400).json({ error: 'Provide url (YouTube URL or video ID)' }); return; }
  const start = Date.now();
  try {
    const videoId = extractVideoId(url);
    const videoData = await fetchTranscript(videoId);
    const data = await callClaude(`You are a complete YouTube video intelligence engine. Perform a full analysis and return ONLY a valid JSON object with ALL of these keys:
- title: string
- channel: string
- summary: string (3-5 sentences)
- content_type: string (tutorial|review|news|interview|entertainment|educational|marketing|other)
- target_audience: string
- estimated_value: string (high|medium|low)
- key_topics: array of strings
- action_items: array of {action, priority (high|medium|low), category}
- key_takeaways: array of strings
- tools_mentioned: array of strings
- entities: object with {people, companies, products, technologies, locations}
- overall_score: number (0-100)
- content_grade: string (A+|A|B+|B|C|D)
- credibility_signals: array of strings
- red_flags: array of strings
- use_for_research: boolean
- sentiment: string (positive|neutral|negative|mixed)
- crm_note: string (1-2 sentence CRM-ready note)
- tags: array of strings
- safety: object with {copyright_risk (high|medium|low), content_safe boolean, age_restricted boolean, transcript_likely_available boolean}
- execute: boolean (should agent process this content?)
- blocking_flags: array of strings
- recommended_action: string
${context ? `Context/goal: ${context}` : ''}
Video data: ${videoData}
Return only the JSON object:`, 2000);
    const d = data as Record<string, unknown>;
    res.json({
      endpoint: 'analyze-video',
      video_id: videoId,
      url,
      execution_ready: d.execute === true,
      next_api: 'autopilot',
      next_endpoint: '/should-execute',
      data,
      metadata: { latency_ms: Date.now() - start, estimated_cost: 0.008, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'analyze-video', err }, message);
    res.status(500).json({ error: message });
  }
});
