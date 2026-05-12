import { Router, Request, Response } from 'express';
import { logger } from '../logger';
import { buildRuntime } from '../../../shared/ai';

// ── Universal Runtime Envelope ────────────────────────────────────────────────


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


// ── Event Store + Governance ──────────────────────────────────────────────────
const eventStore: Record<string, any[]> = {};
function emitEvent(execution_id: string, event: string, step: string, data: any = {}) {
  if (!eventStore[execution_id]) eventStore[execution_id] = [];
  eventStore[execution_id].push({ event_id: `evt_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    event, step, timestamp: new Date().toISOString(), execution_id, data });
}
const REQUIRED_SCOPES: string[] = ["data:read", "data:extract", "data:monitor"];
const EXECUTION_AUTHORITY: string = "low";
function evaluateGovernance(req: any) {
  const agent_id        = req.headers?.['x-agent-id']    || req.body?.agent_id    || null;
  const provided_scopes = (req.headers?.['x-agent-scopes'] || '').split(',').filter(Boolean);
  const trust_score     = Math.min(1.0, Math.max(0.0, parseFloat(req.headers?.['x-agent-trust-score'] || '1.0') || 1.0));
  const sandbox_mode    = req.headers?.['x-sandbox-mode'] === 'true' || trust_score < 0.5;
  const violations: string[] = [];
  if (trust_score < 0.3) violations.push('trust_score_below_threshold');
  const permitted = violations.filter((v: string) => v.includes('trust_score_below_threshold')).length === 0;
  return { permitted, agent_id, scopes: provided_scopes.length > 0 ? provided_scopes : REQUIRED_SCOPES,
    trust_score, execution_authority: EXECUTION_AUTHORITY, sandbox_mode, violations,
    audit_entry: { agent_id, timestamp: new Date().toISOString(), endpoint: req.path,
      method: req.method, permitted, trust_score, sandbox_mode } };
}
router.get('/events/:execution_id', (req: any, res: any) => {
  const events = eventStore[req.params.execution_id] || [];
  res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true,
    execution_id: req.params.execution_id, events, total: events.length,
    computed_at: new Date().toISOString() });
});
router.get('/events/:execution_id/stream', (req: any, res: any) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();
  let index = 0;
  const existing = eventStore[req.params.execution_id] || [];
  existing.forEach((evt: any) => { res.write(`data: ${JSON.stringify(evt)}

`); index++; });
  const interval = setInterval(() => {
    const current = eventStore[req.params.execution_id] || [];
    while (index < current.length) { res.write(`data: ${JSON.stringify(current[index])}

`); index++; }
  }, 500);
  req.on('close', () => clearInterval(interval));
});
router.post('/governance/check', (req: any, res: any) => {
  const gov = evaluateGovernance(req);
  res.json({ ...buildRuntime(req, { workflow_state: gov.permitted ? 'complete' : 'blocked',
    retryable: !gov.permitted && !gov.violations.includes('trust_score_below_threshold') }),
    success: gov.permitted, permitted: gov.permitted, agent_id: gov.agent_id,
    scopes: gov.scopes, required_scopes: REQUIRED_SCOPES, trust_score: gov.trust_score,
    execution_authority: gov.execution_authority, sandbox_mode: gov.sandbox_mode,
    violations: gov.violations, audit_entry: gov.audit_entry,
    computed_at: new Date().toISOString() });
});
router.get('/governance/scopes', (req: any, res: any) => {
  res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true,
    required_scopes: REQUIRED_SCOPES, execution_authority: EXECUTION_AUTHORITY,
    scope_descriptions: REQUIRED_SCOPES.reduce((acc: any, s: string) => {
      acc[s] = `Permission to ${s.replace(':', ' ')} on this API`; return acc; }, {}),
    computed_at: new Date().toISOString() });
});
router.post('/governance/audit', (req: any, res: any) => {
  const { execution_id } = req.body || {};
  const events = execution_id ? (eventStore[execution_id] || []) : [];
  const gov    = evaluateGovernance(req);
  res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true,
    audit_trail: events, total_events: events.length, agent_id: gov.agent_id,
    trust_score: gov.trust_score, sandbox_mode: gov.sandbox_mode,
    audit_summary: { governance_checks: events.filter((e: any) => e.event === 'governance_check').length,
      step_completions: events.filter((e: any) => e.event === 'step_completed').length,
      violations: gov.violations, permitted: gov.permitted },
    computed_at: new Date().toISOString() });
});


// ── Workflow Runtime Layer ────────────────────────────────────────────────────
const workflowStore: Record<string, any> = {};
function createWorkflow(id: string, goal: string, steps: string[], meta: any) {
  const now = new Date().toISOString();
  workflowStore[id] = { workflow_id: id, goal, steps, current_step: steps[0], step_index: 0,
    status: 'running', created_at: now, updated_at: now,
    completed_steps: [], pending_steps: steps.slice(1), results: {}, meta };
  return workflowStore[id];
}
function advanceWorkflow(id: string) {
  const wf = workflowStore[id];
  if (!wf) return null;
  if (wf.step_index < wf.steps.length - 1) {
    wf.completed_steps.push(wf.current_step);
    wf.step_index += 1;
    wf.current_step  = wf.steps[wf.step_index];
    wf.pending_steps = wf.steps.slice(wf.step_index + 1);
    wf.status        = wf.step_index === wf.steps.length - 1 ? 'complete' : 'running';
  } else {
    wf.completed_steps.push(wf.current_step); wf.status = 'complete'; wf.pending_steps = [];
  }
  wf.updated_at = new Date().toISOString();
  return wf;
}
router.post('/workflow/start', (req: any, res: any) => {
  const { goal, steps, meta } = req.body || {};
  const workflow_id = `wf_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const wf = createWorkflow(workflow_id, goal || 'execute', steps || ["validate_inputs", "fetch_source", "extract_structure", "score_confidence", "finalize"], meta || {});
  res.json({ ...buildRuntime(req, { workflow_state: 'running', orchestration_hints: { can_chain: true, suggested_next: ['GET /workflow/' + workflow_id], requires_review: false } }),
    success: true, workflow_id, goal: wf.goal, status: wf.status, current_step: wf.current_step,
    steps: wf.steps, pending_steps: wf.pending_steps, created_at: wf.created_at,
    estimated_steps: wf.steps.length, computed_at: new Date().toISOString() });
});
router.get('/workflow/:id', (req: any, res: any) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true,
    workflow_id: wf.workflow_id, goal: wf.goal, status: wf.status, current_step: wf.current_step,
    step_index: wf.step_index, total_steps: wf.steps.length, completed_steps: wf.completed_steps,
    pending_steps: wf.pending_steps, progress_pct: Math.round((wf.step_index / wf.steps.length) * 100),
    created_at: wf.created_at, updated_at: wf.updated_at, results: wf.results,
    computed_at: new Date().toISOString() });
});
router.post('/workflow/:id/resume', (req: any, res: any) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  if (wf.status === 'complete') return res.json({ ...buildRuntime(req, { workflow_state: 'complete' }),
    success: true, workflow_id: wf.workflow_id, status: 'complete', message: 'Already complete' });
  const advanced = advanceWorkflow(req.params.id);
  res.json({ ...buildRuntime(req, { workflow_state: advanced!.status, retryable: advanced!.status !== 'complete',
    orchestration_hints: { can_chain: true, suggested_next: advanced!.status === 'complete' ? [] : ['POST /workflow/' + req.params.id + '/resume'], requires_review: false } }),
    success: true, workflow_id: advanced!.workflow_id, status: advanced!.status,
    current_step: advanced!.current_step, completed_steps: advanced!.completed_steps,
    pending_steps: advanced!.pending_steps, progress_pct: Math.round((advanced!.step_index / advanced!.steps.length) * 100),
    updated_at: advanced!.updated_at, computed_at: new Date().toISOString() });
});
router.get('/workflow/:id/state', (req: any, res: any) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true,
    workflow_id: wf.workflow_id,
    state_machine: { current_state: wf.current_step, previous_states: wf.completed_steps,
      next_states: wf.pending_steps, terminal: wf.status === 'complete',
      transitions: wf.steps.map((s: string, i: number) => ({ step: i+1, state: s,
        status: i < wf.step_index ? 'complete' : i === wf.step_index ? 'active' : 'pending' })) },
    meta: wf.meta, created_at: wf.created_at, updated_at: wf.updated_at,
    computed_at: new Date().toISOString() });
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
