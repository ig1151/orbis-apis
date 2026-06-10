import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';
import { buildRuntime } from '../../../shared/ai';

// ── Universal Runtime Envelope ────────────────────────────────────────────────


const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';


function parseJSON(raw: string) {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.indexOf('{');
  if (start !== -1) {
    let depth = 0, end = -1;
    for (let i = start; i < cleaned.length; i++) {
      if (cleaned[i] === '{') depth++;
      else if (cleaned[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end !== -1) try { return JSON.parse(cleaned.slice(start, end + 1)); } catch {}
  }
  throw new Error(`Cannot parse as JSON: ${raw.slice(0, 100)}`);
}

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Social Intelligence API', info: '/social-intelligence/info', openapi: '/social-intelligence/openapi.json', health: 'ok' });
});

router.post('/analyze-post', async (req: Request, res: Response) => {
  const { post_content, platform, author_handle, engagement_data } = req.body;
  if (!post_content) return res.status(400).json({ error: 'post_content is required' });
  try {
    const raw = await callClaude(`Analyze this social media post for sentiment, virality potential, engagement quality, topic classification, and brand safety. Platform: "${platform || 'unknown'}" Author: "${author_handle || 'unknown'}" Engagement data: ${JSON.stringify(engagement_data || {})}

Post content: "${post_content}"

Return concise JSON:
{
  "sentiment": "positive|negative|neutral|mixed",
  "sentiment_score": 0-1,
  "virality_score": 0-100,
  "engagement_quality": "high|medium|low",
  "topics": ["string"],
  "hashtag_suggestions": ["string"],
  "brand_safe": true|false,
  "toxicity_score": 0-1,
  "key_themes": ["string"],
  "audience_resonance": "string",
  "confidence_per_section": { "sentiment": 0-1, "virality": 0-1, "brand_safety": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/brand-monitor', async (req: Request, res: Response) => {
  const { brand_name, competitors = [], platforms = [], sentiment_threshold, keywords = [] } = req.body;
  if (!brand_name) return res.status(400).json({ error: 'brand_name is required' });
  try {
    const raw = await callClaude(`Analyze brand presence and reputation based on provided context. Assess mentions sentiment, share of voice, reputation risks, and competitive positioning. Brand: "${brand_name}" Competitors: ${JSON.stringify(competitors)} Platforms: ${JSON.stringify(platforms)} Sentiment threshold: ${sentiment_threshold || 0.5} Keywords: ${JSON.stringify(keywords)}

Return concise JSON:
{
  "brand_name": "string",
  "overall_sentiment": "positive|negative|neutral|mixed",
  "sentiment_score": 0-1,
  "mention_volume_estimate": number,
  "reputation_score": 0-100,
  "risk_flags": [{ "risk": "string", "severity": "high|medium|low", "recommendation": "string" }],
  "competitor_comparison": [{ "name": "string", "sentiment_score": 0-1, "estimated_share": number }],
  "trending_topics": ["string"],
  "recommended_response": "string",
  "confidence_per_section": { "sentiment": 0-1, "reputation": 0-1, "competitor_comparison": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/influencer-score', async (req: Request, res: Response) => {
  const { handle, platform, follower_count, recent_posts = [], niche } = req.body;
  if (!handle) return res.status(400).json({ error: 'handle is required' });
  if (!platform) return res.status(400).json({ error: 'platform is required' });
  try {
    const raw = await callClaude(`Score this influencer's value for brand partnerships based on profile data. Assess authenticity, engagement quality, audience fit, and brand safety. Handle: "${handle}" Platform: "${platform}" Follower count: ${follower_count || 'unknown'} Niche: "${niche || 'unknown'}" Recent posts: ${JSON.stringify(recent_posts.slice(0, 10))}

Return concise JSON:
{
  "handle": "string",
  "platform": "string",
  "authenticity_score": 0-100,
  "engagement_quality": "high|medium|low",
  "estimated_reach_quality": "broad|niche|micro",
  "brand_fit_score": 0-100,
  "risk_indicators": ["string"],
  "content_themes": ["string"],
  "audience_demographics": { "age_range": "string", "gender_skew": "string", "interest_categories": ["string"] },
  "partnership_recommendation": "recommended|conditional|avoid",
  "confidence_per_section": { "authenticity": 0-1, "audience_demographics": 0-1, "brand_fit": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/trend-detect', async (req: Request, res: Response) => {
  const { industry, region, time_window, platforms = [], competitor_handles = [] } = req.body;
  if (!industry) return res.status(400).json({ error: 'industry is required' });
  try {
    const raw = await callClaude(`Identify current trending topics, hashtags, and conversations in this industry/niche based on known patterns and signals. Industry: "${industry}" Region: "${region || 'global'}" Time window: "${time_window || '7d'}" Platforms: ${JSON.stringify(platforms)} Competitor handles: ${JSON.stringify(competitor_handles)}

Return concise JSON:
{
  "industry": "string",
  "trending_topics": [{ "topic": "string", "momentum": "rising|peak|declining", "relevance_score": 0-1, "estimated_volume": "high|medium|low" }],
  "trending_hashtags": [{ "tag": "string", "usage_context": "string", "recommended": true|false }],
  "emerging_conversations": ["string"],
  "sentiment_landscape": { "overall": "positive|negative|mixed", "key_drivers": ["string"] },
  "content_opportunities": [{ "opportunity": "string", "format": "video|text|image|thread", "timing": "now|soon|future" }],
  "confidence_per_section": { "trending_topics": 0-1, "hashtags": 0-1, "content_opportunities": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/competitor-social', async (req: Request, res: Response) => {
  const { competitor_name, your_brand, competitor_handle, platforms = [], industry } = req.body;
  if (!competitor_name) return res.status(400).json({ error: 'competitor_name is required' });
  if (!your_brand) return res.status(400).json({ error: 'your_brand is required' });
  try {
    const raw = await callClaude(`Analyze competitor's social media strategy, positioning, and performance relative to your brand. Competitor: "${competitor_name}" Competitor handle: "${competitor_handle || 'unknown'}" Your brand: "${your_brand}" Platforms: ${JSON.stringify(platforms)} Industry: "${industry || 'unknown'}"

Return concise JSON:
{
  "competitor_name": "string",
  "your_brand": "string",
  "content_strategy": { "posting_frequency": "high|medium|low", "content_mix": [{ "type": "string", "percentage": number }], "tone": "string" },
  "positioning": { "key_messages": ["string"], "differentiators": ["string"], "target_audience": "string" },
  "strengths": ["string"],
  "weaknesses": ["string"],
  "content_gaps_you_can_exploit": ["string"],
  "engagement_benchmarks": { "estimated_avg_engagement": "high|medium|low" },
  "strategic_recommendations": ["string"],
  "confidence_per_section": { "content_strategy": 0-1, "positioning": 0-1, "gaps": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/audience-insights', async (req: Request, res: Response) => {
  const { brand_or_topic, platform, demographic_focus, sample_content = [] } = req.body;
  if (!brand_or_topic) return res.status(400).json({ error: 'brand_or_topic is required' });
  try {
    const raw = await callClaude(`Derive audience insights for this brand/topic including demographics, psychographics, content preferences, and engagement patterns. Brand/Topic: "${brand_or_topic}" Platform: "${platform || 'all'}" Demographic focus: "${demographic_focus || 'general'}" Sample content: ${JSON.stringify(sample_content.slice(0, 10))}

Return concise JSON:
{
  "brand_or_topic": "string",
  "audience_profile": { "age_range": "string", "gender_split": "string", "location_focus": "string", "income_level": "string" },
  "psychographics": { "values": ["string"], "interests": ["string"], "lifestyle_markers": ["string"], "pain_points": ["string"] },
  "content_preferences": { "formats": [{ "format": "string", "preference": "high|medium|low" }], "topics": ["string"], "tone": "string", "posting_times": ["string"] },
  "engagement_drivers": [{ "driver": "string", "impact": "high|medium|low" }],
  "segments": [{ "name": "string", "size": "large|medium|small", "description": "string" }],
  "confidence_per_section": { "audience_profile": 0-1, "psychographics": 0-1, "segments": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/content-performance', async (req: Request, res: Response) => {
  const { content, platform, target_audience, campaign_goal, brand_voice, historical_benchmarks } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  if (!platform) return res.status(400).json({ error: 'platform is required' });
  try {
    const raw = await callClaude(`Predict how this content will perform on this platform. Score for engagement, reach, and goal achievement. Platform: "${platform}" Target audience: "${target_audience || 'general'}" Campaign goal: "${campaign_goal || 'awareness'}" Brand voice: "${brand_voice || 'not specified'}" Historical benchmarks: ${JSON.stringify(historical_benchmarks || {})}

Content: "${content.slice(0, 2000)}"

Return concise JSON:
{
  "predicted_engagement_rate": "high|medium|low",
  "predicted_reach": "viral|high|medium|low",
  "performance_score": 0-100,
  "strengths": ["string"],
  "weaknesses": ["string"],
  "improvement_suggestions": [{ "suggestion": "string", "expected_impact": "high|medium|low" }],
  "optimal_posting_time": "string",
  "hashtag_strategy": { "recommended_tags": ["string"], "count": number },
  "cta_effectiveness": { "score": 0-100, "suggestion": "string" },
  "confidence_per_section": { "engagement": 0-1, "reach": 0-1, "suggestions": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/sentiment-timeline', async (req: Request, res: Response) => {
  const { brand_or_topic, events, time_range, platforms = [] } = req.body;
  if (!brand_or_topic) return res.status(400).json({ error: 'brand_or_topic is required' });
  if (!events) return res.status(400).json({ error: 'events is required' });
  try {
    const raw = await callClaude(`Map sentiment trajectory for this brand/topic through key events. Identify inflection points and recovery patterns. Brand/Topic: "${brand_or_topic}" Time range: "${time_range || 'last 12 months'}" Platforms: ${JSON.stringify(platforms)} Events: ${JSON.stringify(events.slice(0, 20))}

Return concise JSON:
{
  "brand_or_topic": "string",
  "overall_trend": "improving|stable|declining|volatile",
  "baseline_sentiment": 0-1,
  "current_sentiment": 0-1,
  "sentiment_events": [{ "date": "string", "event": "string", "sentiment_impact": -1 to 1, "recovery_time_days": number, "lesson": "string" }],
  "inflection_points": [{ "date": "string", "type": "positive|negative", "magnitude": "high|medium|low" }],
  "recovery_patterns": ["string"],
  "forecast": { "next_30_days": "string", "confidence": 0-1 },
  "confidence_per_section": { "sentiment_events": 0-1, "inflection_points": 0-1, "forecast": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/social-proof', async (req: Request, res: Response) => {
  const { brand_name, product_or_service, industry, review_samples = [] } = req.body;
  if (!brand_name) return res.status(400).json({ error: 'brand_name is required' });
  try {
    const raw = await callClaude(`Extract and assess social proof signals for this brand including credibility indicators, testimonial quality, and trust signals. Brand: "${brand_name}" Product/Service: "${product_or_service || 'not specified'}" Industry: "${industry || 'not specified'}" Review samples: ${JSON.stringify(review_samples.slice(0, 20))}

Return concise JSON:
{
  "brand_name": "string",
  "social_proof_score": 0-100,
  "trust_signals": [{ "signal": "string", "strength": "strong|moderate|weak", "evidence": "string" }],
  "testimonial_quality": { "authenticity": "high|medium|low", "specificity": "high|medium|low", "diversity": "high|medium|low" },
  "credibility_indicators": [{ "indicator": "string", "type": "achievement|partnership|media|community", "impact": "high|medium|low" }],
  "gaps": ["string"],
  "recommendations": [{ "action": "string", "priority": "high|medium|low" }],
  "confidence_per_section": { "trust_signals": 0-1, "testimonial_quality": 0-1, "credibility_indicators": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { social_action, brand_context, risk_threshold, platform, content_preview } = req.body;
  if (!social_action) return res.status(400).json({ error: 'social_action is required' });
  if (!brand_context) return res.status(400).json({ error: 'brand_context is required' });
  try {
    const raw = await callClaude(`Evaluate whether this social media action should be executed based on brand risk, timing, and strategic fit. Social action: "${social_action}" Platform: "${platform || 'unknown'}" Risk threshold: ${risk_threshold || 0.7} Content preview: "${content_preview || 'not provided'}" Brand context: ${JSON.stringify(brand_context)}

Return concise JSON:
{
  "execute": true|false,
  "confidence": 0-1,
  "risk_score": 0-1,
  "blocking_flags": ["string"],
  "warnings": ["string"],
  "recommended_action": "proceed|modify|delay|cancel",
  "modifications_needed": ["string"],
  "optimal_timing": "string or null",
  "chain_to": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});


// ── Event Store + Governance ──────────────────────────────────────────────────
const eventStore: Record<string, any[]> = {};
function emitEvent(execution_id: string, event: string, step: string, data: any = {}) {
  if (!eventStore[execution_id]) eventStore[execution_id] = [];
  eventStore[execution_id].push({ event_id: `evt_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    event, step, timestamp: new Date().toISOString(), execution_id, data });
}
const REQUIRED_SCOPES: string[] = ["market:read", "market:signal", "market:analyze"];
const EXECUTION_AUTHORITY: string = "medium";
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
  const wf = createWorkflow(workflow_id, goal || 'execute', steps || ["validate_inputs", "fetch_market_data", "compute_signals", "rank_outputs", "finalize"], meta || {});
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
