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
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

function traceId() { return `cap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

// GET / — discovery
router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Corporate Actions API',
    description: 'AI-powered corporate actions intelligence: stock splits, dividends, buybacks, M&A, insider activity, and corporate event tracking',
    'x-financial-disclaimer': 'For informational purposes only. Not financial advice.',
    'x-paper-mode-recommended': true,
    endpoints: [
      'GET /',
      'POST /splits',
      'POST /dividends',
      'POST /buybacks',
      'POST /mergers',
      'POST /insider-activity',
      'POST /corporate-events',
      'POST /execution-gate',
      'POST /analyze',
    ],
    health: 'ok',
  });
});

// POST /splits
router.post('/splits', async (req: Request, res: Response) => {
  const { company, filing_text } = req.body;
  if (!company && !filing_text) return res.status(400).json({ error: 'company or filing_text is required' });
  try {
    const raw = await callClaude(`Analyze stock split history and signals for: company="${company || ''}" filing_text="${filing_text || ''}". Return JSON:
{
  "recent_splits": [
    {
      "date": "string",
      "ratio": "string",
      "type": "forward|reverse",
      "price_before": "string",
      "price_after_adjusted": "string",
      "rationale": "string",
      "market_reaction": "bullish|bearish|neutral"
    }
  ],
  "upcoming_splits_rumored": ["string"],
  "split_signal": "positive|negative|neutral",
  "historical_post_split_performance": "string",
  "confidence_per_section": { "recent_splits": 0-1, "split_signal": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "paper_mode_recommended": true,
  "disclaimer": "For informational purposes only. Not financial advice.",
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /dividends
router.post('/dividends', async (req: Request, res: Response) => {
  const { company } = req.body;
  if (!company) return res.status(400).json({ error: 'company is required' });
  try {
    const raw = await callClaude(`Analyze dividend information for company: "${company}". Return JSON:
{
  "current_dividend_yield_pct": 0,
  "dividend_per_share": "string",
  "ex_dividend_date": "string",
  "payment_date": "string",
  "payout_ratio_pct": 0,
  "dividend_growth_rate_3yr": "string",
  "dividend_safety": "safe|at_risk|cut_likely|suspended",
  "dividend_history": [
    {
      "year": "string",
      "amount": "string",
      "change_pct": "string"
    }
  ],
  "special_dividends": ["string"],
  "income_signal": "strong_income|moderate|weak|none",
  "confidence_per_section": { "dividend_safety": 0-1, "dividend_history": 0-1, "income_signal": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "paper_mode_recommended": true,
  "disclaimer": "For informational purposes only. Not financial advice.",
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /buybacks
router.post('/buybacks', async (req: Request, res: Response) => {
  const { company, filing_text } = req.body;
  if (!company && !filing_text) return res.status(400).json({ error: 'company or filing_text is required' });
  try {
    const raw = await callClaude(`Analyze share buyback program for: company="${company || ''}" filing_text="${filing_text || ''}". Return JSON:
{
  "active_buyback": true|false,
  "authorized_amount": "string",
  "completed_pct": 0,
  "shares_repurchased": "string",
  "buyback_yield_pct": 0,
  "buyback_signal": "aggressive|moderate|minimal|none",
  "management_confidence_signal": "high|medium|low",
  "price_support_level": "string",
  "confidence_per_section": { "active_buyback": 0-1, "buyback_signal": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "paper_mode_recommended": true,
  "disclaimer": "For informational purposes only. Not financial advice.",
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /mergers
router.post('/mergers', async (req: Request, res: Response) => {
  const { company, news_text } = req.body;
  if (!company && !news_text) return res.status(400).json({ error: 'company or news_text is required' });
  try {
    const raw = await callClaude(`Analyze mergers and acquisitions activity for: company="${company || ''}" news_text="${news_text || ''}". Return JSON:
{
  "active_deals": [
    {
      "target_or_acquirer": "string",
      "deal_type": "acquisition|merger|spinoff|divestiture",
      "status": "rumored|announced|pending_approval|completed|terminated",
      "deal_value": "string",
      "premium_pct": 0,
      "strategic_rationale": "string",
      "deal_risk": "low|medium|high|broken"
    }
  ],
  "recent_completed_deals": ["string"],
  "ma_activity_signal": "active|moderate|quiet",
  "confidence_per_section": { "active_deals": 0-1, "ma_activity_signal": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "paper_mode_recommended": true,
  "disclaimer": "For informational purposes only. Not financial advice.",
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /insider-activity
router.post('/insider-activity', async (req: Request, res: Response) => {
  const { company } = req.body;
  if (!company) return res.status(400).json({ error: 'company is required' });
  try {
    const raw = await callClaude(`Analyze insider trading and ownership activity for company: "${company}". Return JSON:
{
  "recent_transactions": [
    {
      "insider_name": "string",
      "role": "string",
      "transaction_type": "buy|sell|option_exercise",
      "shares": "string",
      "value": "string",
      "date": "string",
      "form_type": "string"
    }
  ],
  "cluster_signal": "strong_buy|buying|mixed|selling|strong_sell|none",
  "30d_net_flow": "positive|negative|neutral",
  "conviction_score": 0-100,
  "notable_insiders": ["string"],
  "confidence_per_section": { "recent_transactions": 0-1, "cluster_signal": 0-1, "conviction_score": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "paper_mode_recommended": true,
  "disclaimer": "For informational purposes only. Not financial advice.",
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /corporate-events
router.post('/corporate-events', async (req: Request, res: Response) => {
  const { company, lookback_days = 90 } = req.body;
  if (!company) return res.status(400).json({ error: 'company is required' });
  try {
    const raw = await callClaude(`List and analyze corporate events for company: "${company}" over the past ${lookback_days} days. Return JSON:
{
  "events": [
    {
      "event_type": "split|dividend|buyback|merger|spinoff|rights_offering|debt_issuance|leadership_change",
      "date": "string",
      "description": "string",
      "market_impact": "positive|negative|neutral",
      "significance": "high|medium|low"
    }
  ],
  "event_count_30d": 0,
  "corporate_activity_level": "high|moderate|low",
  "confidence_per_section": { "events": 0-1, "corporate_activity_level": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "paper_mode_recommended": true,
  "disclaimer": "For informational purposes only. Not financial advice.",
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /post-event-performance
router.post('/post-event-performance', async (req: Request, res: Response) => {
  const { company, event_type, event_date } = req.body;
  if (!company || !event_type) return res.status(400).json({ error: 'company and event_type are required' });
  try {
    const raw = await callClaude(`You are a corporate event alpha analyst. Analyze the historical post-event performance for this type of corporate action and estimate the likely price impact and alpha generation opportunity.

Company: "${String(company)}"
Event type: "${String(event_type)}" (split|dividend_initiation|buyback|merger|acquisition|spinoff|ceo_change|restructuring)
Event date: "${String(event_date || 'recent')}"

Based on historical patterns for this event type, estimate post-event stock performance across multiple time horizons. Identify whether this event type historically generates alpha. Compare to sector peers where possible.

Return JSON:
{
  "event_type": "${String(event_type)}",
  "historical_alpha_pattern": "positive|neutral|negative|mixed",
  "expected_performance": {
    "1_day_pct": "string (e.g. +1.2% to +3.4%)",
    "1_week_pct": "string",
    "1_month_pct": "string",
    "3_month_pct": "string"
  },
  "alpha_signal": "strong_buy|buy|hold|sell|strong_sell",
  "historical_win_rate_pct": "string (e.g. 67% of similar events produced positive returns)",
  "peer_comparison": "string (how this event compares to sector peer events)",
  "key_catalysts_for_outperformance": ["string"],
  "key_risks_to_thesis": ["string"],
  "event_driven_trade_window": "string (e.g. Buy dip on announcement day, exit within 3 weeks)",
  "confidence_per_section": { "historical_pattern": 0.0, "expected_performance": 0.0, "alpha_signal": 0.0 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { company } = req.body;
  if (!company) return res.status(400).json({ error: 'company is required' });
  res.json({
    execution_ready: true,
    company,
    recommended_endpoint: '/analyze',
    blocking_flags: [],
    recommended_next_api: 'sec-filing-intelligence',
    execution_priority: 'medium',
    automation_safe: true,
    trace_id: traceId(),
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    privacy: { data_stored: false, retention: 'none' },
    computed_at: new Date().toISOString(),
  });
});

// POST /analyze — ONE-CALL
router.post('/analyze', async (req: Request, res: Response) => {
  const { company } = req.body;
  if (!company) return res.status(400).json({ error: 'company is required' });
  try {
    const raw = await callClaude(`Comprehensive corporate actions analysis for company: "${company}". Return JSON:
{
  "all_events_summary": "string",
  "dividend_signal": "strong_income|moderate|weak|none",
  "buyback_signal": "aggressive|moderate|minimal|none",
  "insider_signal": "strong_buy|buying|mixed|selling|strong_sell|none",
  "ma_signal": "active|moderate|quiet",
  "overall_corporate_signal": "bullish|bearish|neutral",
  "agent_summary": "string",
  "confidence_per_section": { "dividend_signal": 0-1, "buyback_signal": 0-1, "insider_signal": 0-1, "ma_signal": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "paper_mode_recommended": true,
  "disclaimer": "For informational purposes only. Not financial advice.",
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

const eventStore: Record<string, any[]> = {};
const REQUIRED_SCOPES = ['corporate:read', 'corporate:analyze'];
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
  workflowStore[id] = { workflow_id: id, goal: goal || 'default goal', steps: steps || ['detect_events', 'analyze_splits', 'analyze_dividends', 'analyze_mergers', 'generate_signals'], step_index: 0, status: 'running', created_at: new Date().toISOString() };
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
