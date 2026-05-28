import { Router, Request, Response } from 'express';
import axios from 'axios';
import { buildRuntime } from '../../../shared/ai';

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

function traceId() { return `rid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Reddit Intelligence API', info: '/reddit-intelligence/info', openapi: '/reddit-intelligence/openapi.json', health: 'ok' });
});

// POST /analyze-subreddit
router.post('/analyze-subreddit', async (req: Request, res: Response) => {
  const { subreddit, posts, timeframe = '7d' } = req.body;
  if (!subreddit) return res.status(400).json({ error: 'subreddit is required' });
  try {
    const postsStr = posts ? (typeof posts === 'string' ? posts : JSON.stringify(posts).slice(0, 4000)) : `sample posts from r/${subreddit}`;
    const raw = await callClaude(`Analyze this subreddit for trends, sentiment, and community signals.

Subreddit: r/${subreddit}, Timeframe: ${timeframe}
Posts/content (first 4000 chars): "${postsStr.slice(0, 4000)}"

Return JSON:
{
  "subreddit": "string",
  "member_sentiment": "very_positive|positive|neutral|negative|very_negative",
  "sentiment_score": -100 to 100,
  "top_topics": [{ "topic": "string", "post_count": number, "sentiment": "positive|neutral|negative", "velocity": "rising|stable|falling" }],
  "pain_points": ["string"],
  "praised_aspects": ["string"],
  "trending_products": ["string"],
  "emerging_themes": ["string"],
  "community_health": "thriving|active|declining|toxic",
  "posting_velocity": "high|medium|low",
  "engagement_quality": "high|medium|low",
  "confidence_per_section": { "sentiment": 0-1, "top_topics": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /track-keywords
router.post('/track-keywords', async (req: Request, res: Response) => {
  const { keywords, posts, subreddits } = req.body;
  if (!keywords) return res.status(400).json({ error: 'keywords is required' });
  try {
    const kwList = Array.isArray(keywords) ? keywords.join(', ') : keywords;
    const postsStr = posts ? (typeof posts === 'string' ? posts : JSON.stringify(posts).slice(0, 4000)) : 'not provided — analyze from context';
    const raw = await callClaude(`Track keyword mentions, velocity, and sentiment across Reddit discussions.

Keywords: "${kwList}"
Subreddits: "${subreddits ? (Array.isArray(subreddits) ? subreddits.join(', ') : subreddits) : 'all'}"
Posts content (first 4000 chars): "${postsStr.slice(0, 4000)}"

Return JSON:
{
  "keywords": [{ "keyword": "string", "mention_count": number, "velocity": "rising|stable|falling", "sentiment": "positive|neutral|negative", "sentiment_score": -100 to 100, "top_subreddits": ["string"], "related_keywords": ["string"] }],
  "overall_velocity": "rising|stable|falling",
  "spike_detected": true|false,
  "spike_reason": "string",
  "trending_combinations": ["string"],
  "sentiment_shift": "improving|stable|deteriorating",
  "confidence_per_section": { "keywords": 0-1, "velocity": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /detect-complaints
router.post('/detect-complaints', async (req: Request, res: Response) => {
  const { posts, product_or_brand, subreddit } = req.body;
  if (!posts) return res.status(400).json({ error: 'posts is required' });
  try {
    const postsStr = typeof posts === 'string' ? posts : JSON.stringify(posts).slice(0, 4000);
    const raw = await callClaude(`Detect recurring complaints, pain points, and frustrations in Reddit posts.

Product/brand: "${product_or_brand || 'general'}", Subreddit: "${subreddit || 'not specified'}"
Posts (first 4000 chars): "${postsStr.slice(0, 4000)}"

Return JSON:
{
  "complaints": [{ "complaint": "string", "frequency": "high|medium|low", "mention_count": number, "severity": "critical|major|minor", "category": "product|support|pricing|ux|performance|reliability|other", "sample_quotes": ["string"] }],
  "top_complaint": "string",
  "complaint_volume_trend": "increasing|stable|decreasing",
  "unresolved_issues": ["string"],
  "feature_requests": ["string"],
  "churn_risk_signals": ["string"],
  "nps_estimate": -100 to 100,
  "confidence_per_section": { "complaints": 0-1, "nps_estimate": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /score-virality
router.post('/score-virality', async (req: Request, res: Response) => {
  const { post_title, post_content, subreddit } = req.body;
  if (!post_title && !post_content) return res.status(400).json({ error: 'post_title or post_content is required' });
  try {
    const raw = await callClaude(`Score the virality potential of this Reddit post.

Subreddit: r/${subreddit || 'general'}
Title: "${post_title || ''}"
Content: "${String(post_content || '').slice(0, 2000)}"

Return JSON:
{
  "virality_score": 0-100,
  "virality_level": "viral|high|medium|low|minimal",
  "predicted_upvote_ratio": 0-1,
  "predicted_comment_count": "string (e.g. 50-200)",
  "virality_factors": ["string (what makes it shareable)"],
  "risk_factors": ["string (what might limit reach)"],
  "best_posting_time": "string",
  "related_subreddits": ["string"],
  "headline_strength": "strong|moderate|weak",
  "emotional_trigger": "string",
  "confidence_per_section": { "virality_score": 0-1, "predicted_upvote_ratio": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /buying-intent
router.post('/buying-intent', async (req: Request, res: Response) => {
  const { posts, product_category } = req.body;
  if (!posts) return res.status(400).json({ error: 'posts is required' });
  try {
    const postsStr = typeof posts === 'string' ? posts : JSON.stringify(posts).slice(0, 4000);
    const raw = await callClaude(`Detect buying intent signals in Reddit discussions.

Product category: "${product_category || 'general'}"
Posts (first 4000 chars): "${postsStr.slice(0, 4000)}"

Return JSON:
{
  "buying_intent_score": 0-100,
  "intent_level": "high|medium|low|none",
  "intent_signals": [{ "signal": "string", "type": "asking_for_recommendations|comparing_products|price_checking|ready_to_buy|research_phase", "strength": "strong|moderate|weak", "quote": "string" }],
  "purchase_stage": "awareness|consideration|decision|post_purchase",
  "price_sensitivity": "high|medium|low",
  "preferred_channels": ["string"],
  "objections": ["string"],
  "decision_triggers": ["string"],
  "estimated_purchase_timeline": "immediate|1-2 weeks|1 month|3+ months",
  "confidence_per_section": { "buying_intent_score": 0-1, "intent_signals": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /topic-clusters
router.post('/topic-clusters', async (req: Request, res: Response) => {
  const { posts, subreddit, max_clusters = 8 } = req.body;
  if (!posts) return res.status(400).json({ error: 'posts is required' });
  try {
    const postsStr = typeof posts === 'string' ? posts : JSON.stringify(posts).slice(0, 4000);
    const raw = await callClaude(`Cluster Reddit posts into semantic topic groups and identify key themes.

Subreddit: "${subreddit || 'not specified'}", Max clusters: ${max_clusters}
Posts (first 4000 chars): "${postsStr.slice(0, 4000)}"

Return JSON:
{
  "clusters": [{ "cluster_name": "string", "post_count": number, "sentiment": "positive|neutral|negative", "keywords": ["string"], "summary": "string", "trending": true|false }],
  "dominant_cluster": "string",
  "emerging_clusters": ["string"],
  "declining_clusters": ["string"],
  "cross_cluster_themes": ["string"],
  "total_posts_analyzed": number,
  "confidence_per_section": { "clusters": 0-1, "dominant_cluster": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /competitor-mentions
router.post('/competitor-mentions', async (req: Request, res: Response) => {
  const { posts, brand, competitors } = req.body;
  if (!posts) return res.status(400).json({ error: 'posts is required' });
  try {
    const postsStr = typeof posts === 'string' ? posts : JSON.stringify(posts).slice(0, 4000);
    const compList = competitors ? (Array.isArray(competitors) ? competitors.join(', ') : competitors) : 'detect from content';
    const raw = await callClaude(`Analyze competitor mentions and brand comparisons in Reddit discussions.

Brand: "${brand || 'not specified'}", Competitors: "${compList}"
Posts (first 4000 chars): "${postsStr.slice(0, 4000)}"

Return JSON:
{
  "brand_sentiment": "positive|neutral|negative",
  "brand_score": -100 to 100,
  "competitor_mentions": [{ "competitor": "string", "mention_count": number, "sentiment": "positive|neutral|negative", "score": -100 to 100, "vs_brand": "preferred|equal|not_preferred" }],
  "brand_vs_competitors": "leading|competitive|lagging",
  "common_comparisons": ["string"],
  "brand_strengths_vs_competitors": ["string"],
  "brand_weaknesses_vs_competitors": ["string"],
  "switching_intent": "high|medium|low",
  "confidence_per_section": { "brand_sentiment": 0-1, "competitor_mentions": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { posts, subreddit } = req.body;
  const hasInput = posts || subreddit;
  if (!hasInput) return res.status(400).json({ error: 'posts or subreddit is required' });
  const postCount = Array.isArray(posts) ? posts.length : posts ? 1 : 0;
  res.json({
    execution_ready: true,
    subreddit: subreddit || 'not specified',
    post_count: postCount,
    recommended_endpoint: postCount > 5 ? '/analyze-subreddit' : '/detect-complaints',
    next_api: 'serp-intelligence',
    next_endpoint: '/analyze',
    blocking_flags: [],
    flag_definitions: { NO_INPUT: 'No posts or subreddit provided' },
    trace_id: traceId(),
    confidence_per_section: { execution_ready: 0.95 },
    privacy: { data_stored: false, retention: 'none' },
    computed_at: new Date().toISOString(),
  });
});

// POST /monitor (ONE-CALL)
router.post('/monitor', async (req: Request, res: Response) => {
  const { posts, subreddit, brand, keywords, product_category } = req.body;
  if (!posts) return res.status(400).json({ error: 'posts is required' });
  try {
    const postsStr = typeof posts === 'string' ? posts : JSON.stringify(posts).slice(0, 4000);
    const raw = await callClaude(`ONE-CALL Reddit intelligence monitor. Analyze sentiment, detect complaints, identify trends, score buying intent, and surface competitive signals.

Subreddit: "${subreddit || 'not specified'}", Brand: "${brand || 'not specified'}", Keywords: "${keywords ? (Array.isArray(keywords) ? keywords.join(', ') : keywords) : 'not specified'}", Category: "${product_category || 'general'}"
Posts (first 4000 chars): "${postsStr.slice(0, 4000)}"

Return JSON:
{
  "overall_sentiment": "very_positive|positive|neutral|negative|very_negative",
  "sentiment_score": -100 to 100,
  "top_trends": ["string"],
  "top_complaints": ["string"],
  "buying_intent_score": 0-100,
  "purchase_stage": "awareness|consideration|decision|post_purchase",
  "viral_topics": ["string"],
  "competitor_signals": ["string"],
  "emerging_opportunities": ["string"],
  "risk_signals": ["string"],
  "recommended_actions": ["string"],
  "one_line_summary": "string",
  "confidence_per_section": { "overall_sentiment": 0-1, "buying_intent_score": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Governance + Workflow ─────────────────────────────────────────────────────
const eventStore: Record<string, any[]> = {};
const REQUIRED_SCOPES = ['reddit:read', 'reddit:analyze', 'reddit:monitor'];
const EXECUTION_AUTHORITY = 'low';
function evaluateGovernance(req: any) {
  const agent_id = req.headers?.['x-agent-id'] || req.body?.agent_id || null;
  const trust_score = Math.min(1.0, Math.max(0.0, parseFloat(req.headers?.['x-agent-trust-score'] || '1.0') || 1.0));
  const violations: string[] = trust_score < 0.3 ? ['trust_score_below_threshold'] : [];
  return { permitted: violations.length === 0, agent_id, trust_score, sandbox_mode: trust_score < 0.5, violations, scopes: REQUIRED_SCOPES, execution_authority: EXECUTION_AUTHORITY, audit_entry: { agent_id, timestamp: new Date().toISOString(), endpoint: req.path, method: req.method, permitted: violations.length === 0, trust_score } };
}
router.get('/events/:execution_id', (req: any, res: any) => {
  res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true, execution_id: req.params.execution_id, events: eventStore[req.params.execution_id] || [], total: (eventStore[req.params.execution_id] || []).length, computed_at: new Date().toISOString() });
});
router.post('/governance/check', (req: any, res: any) => {
  const gov = evaluateGovernance(req);
  res.json({ ...buildRuntime(req, { workflow_state: gov.permitted ? 'complete' : 'blocked' }), success: gov.permitted, ...gov, required_scopes: REQUIRED_SCOPES, computed_at: new Date().toISOString() });
});
router.get('/governance/scopes', (req: any, res: any) => {
  res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true, required_scopes: REQUIRED_SCOPES, execution_authority: EXECUTION_AUTHORITY, computed_at: new Date().toISOString() });
});
router.post('/governance/audit', (req: any, res: any) => {
  const { execution_id } = req.body || {};
  const gov = evaluateGovernance(req);
  res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true, audit_trail: execution_id ? (eventStore[execution_id] || []) : [], agent_id: gov.agent_id, trust_score: gov.trust_score, computed_at: new Date().toISOString() });
});
const workflowStore: Record<string, any> = {};
router.post('/workflow/start', (req: any, res: any) => {
  const { goal, steps } = req.body || {};
  const id = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const defaultSteps = ['ingest_posts', 'analyze_sentiment', 'detect_complaints', 'score_virality', 'generate_insights'];
  workflowStore[id] = { workflow_id: id, goal: goal || 'monitor reddit intelligence', steps: steps || defaultSteps, step_index: 0, status: 'running', created_at: new Date().toISOString() };
  const wf = workflowStore[id];
  res.json({ ...buildRuntime(req, { workflow_state: 'running' }), success: true, workflow_id: id, status: wf.status, current_step: wf.steps[0], steps: wf.steps, computed_at: new Date().toISOString() });
});
router.get('/workflow/:id', (req: any, res: any) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true, ...wf, computed_at: new Date().toISOString() });
});
router.post('/workflow/:id/resume', (req: any, res: any) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  if (wf.step_index < wf.steps.length - 1) { wf.step_index++; wf.status = wf.step_index === wf.steps.length - 1 ? 'complete' : 'running'; } else { wf.status = 'complete'; }
  wf.updated_at = new Date().toISOString();
  res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true, workflow_id: wf.workflow_id, status: wf.status, current_step: wf.steps[wf.step_index], computed_at: new Date().toISOString() });
});
router.get('/workflow/:id/state', (req: any, res: any) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true, workflow_id: wf.workflow_id, state_machine: { current_state: wf.steps[wf.step_index], terminal: wf.status === 'complete', transitions: wf.steps.map((s: string, i: number) => ({ step: i + 1, state: s, status: i < wf.step_index ? 'complete' : i === wf.step_index ? 'active' : 'pending' })) }, computed_at: new Date().toISOString() });
});

export default router;
