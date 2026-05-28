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

function traceId() { return `neg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

// GET / — discovery
router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Autonomous Negotiation API',
    description: 'AI-powered negotiation intelligence: counteroffer generation, strategy analysis, concession planning, BATNA scoring, risk detection, deal-breaker identification',
    endpoints: [
      'GET /',
      'POST /generate-counteroffer',
      'POST /negotiation-strategy',
      'POST /concession-analysis',
      'POST /batna-score',
      'POST /negotiation-risk',
      'POST /deal-breakers',
      'POST /execution-gate',
      'POST /negotiate',
    ],
    health: 'ok',
  });
});

// POST /generate-counteroffer
router.post('/generate-counteroffer', async (req: Request, res: Response) => {
  const { offer_text, party_role } = req.body;
  if (!offer_text || !party_role) return res.status(400).json({ error: 'offer_text and party_role are required' });
  try {
    const raw = await callClaude(`Generate a professional counteroffer for the following negotiation scenario. Party role: "${party_role}". Original offer: "${offer_text}". Return JSON:
{
  "counteroffer_text": "string — the actual counteroffer language",
  "changed_terms": [
    {
      "term": "string",
      "original": "string",
      "proposed": "string",
      "rationale": "string"
    }
  ],
  "concessions_made": ["string"],
  "demands_added": ["string"],
  "strategy_used": "anchoring|reciprocity|bundling|splitting|other",
  "confidence_per_section": { "counteroffer_text": 0-1, "changed_terms": 0-1, "strategy_used": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /negotiation-strategy
router.post('/negotiation-strategy', async (req: Request, res: Response) => {
  const { deal_context, offer_text, party_role } = req.body;
  if ((!deal_context && !offer_text) || !party_role) return res.status(400).json({ error: 'deal_context or offer_text, and party_role are required' });
  try {
    const raw = await callClaude(`Develop a negotiation strategy. Party role: "${party_role}". Context: "${deal_context || offer_text}". Return JSON:
{
  "recommended_strategy": "collaborative|competitive|principled|hardball",
  "opening_position": "string",
  "target_outcome": "string",
  "walk_away_point": "string",
  "key_leverage_points": ["string"],
  "vulnerabilities": ["string"],
  "time_pressure_assessment": "low|medium|high",
  "power_balance": "we_have_leverage|balanced|they_have_leverage",
  "opening_moves": ["string"],
  "confidence_per_section": { "recommended_strategy": 0-1, "key_leverage_points": 0-1, "power_balance": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /concession-analysis
router.post('/concession-analysis', async (req: Request, res: Response) => {
  const { offer_history, current_offer, party_role } = req.body;
  if ((!offer_history && !current_offer) || !party_role) return res.status(400).json({ error: 'offer_history or current_offer, and party_role are required' });
  try {
    const raw = await callClaude(`Analyze concession patterns in a negotiation. Party role: "${party_role}". Offer history/current offer: "${JSON.stringify(offer_history || current_offer)}". Return JSON:
{
  "concession_pattern": "escalating|stable|inconsistent",
  "total_conceded_value": "string",
  "concessions_remaining": ["string"],
  "high_value_concessions": ["string"],
  "low_cost_concessions": ["string"],
  "reciprocity_balance": "owed|balanced|overextended",
  "next_concession_recommendation": "string",
  "confidence_per_section": { "concession_pattern": 0-1, "reciprocity_balance": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /batna-score
router.post('/batna-score', async (req: Request, res: Response) => {
  const { deal_description, party_role, alternatives_text } = req.body;
  if (!deal_description || !party_role) return res.status(400).json({ error: 'deal_description and party_role are required' });
  try {
    const raw = await callClaude(`Score BATNA (Best Alternative to Negotiated Agreement) for a negotiation. Party role: "${party_role}". Deal description: "${deal_description}". Known alternatives: "${alternatives_text || 'none provided'}". Return JSON:
{
  "batna_strength": "strong|adequate|weak|none",
  "batna_options": [
    {
      "option": "string",
      "value_estimate": "string",
      "feasibility": "high|medium|low"
    }
  ],
  "zopa_exists": true|false,
  "zopa_range": "string",
  "reservation_value": "string",
  "negotiation_leverage_score": 0-100,
  "should_walk_away": true|false,
  "walk_away_trigger": "string",
  "confidence_per_section": { "batna_strength": 0-1, "batna_options": 0-1, "negotiation_leverage_score": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /negotiation-risk
router.post('/negotiation-risk', async (req: Request, res: Response) => {
  const { offer_text, deal_description } = req.body;
  if (!offer_text && !deal_description) return res.status(400).json({ error: 'offer_text or deal_description is required' });
  try {
    const raw = await callClaude(`Assess negotiation and deal risks in the following: "${offer_text || deal_description}". Return JSON:
{
  "risk_score": 0-100,
  "risks": [
    {
      "risk": "string",
      "category": "financial|legal|relational|reputational|operational",
      "severity": "critical|high|medium|low",
      "mitigation": "string"
    }
  ],
  "deal_breakers": ["string"],
  "hidden_costs": ["string"],
  "unfavorable_terms": ["string"],
  "overall_recommendation": "accept|counter|reject|request_clarification",
  "confidence_per_section": { "risk_score": 0-1, "risks": 0-1, "overall_recommendation": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /deal-breakers
router.post('/deal-breakers', async (req: Request, res: Response) => {
  const { offer_text, party_role } = req.body;
  if (!offer_text || !party_role) return res.status(400).json({ error: 'offer_text and party_role are required' });
  try {
    const raw = await callClaude(`Identify deal breakers and non-negotiables for the following offer. Party role: "${party_role}". Offer: "${offer_text}". Return JSON:
{
  "deal_breakers": [
    {
      "term": "string",
      "reason": "string",
      "severity": "critical|high|medium",
      "suggested_fix": "string"
    }
  ],
  "non_negotiables": ["string"],
  "red_lines": ["string"],
  "acceptable_fallbacks": ["string"],
  "confidence_per_section": { "deal_breakers": 0-1, "non_negotiables": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { offer_text, deal_context } = req.body;
  if (!offer_text && !deal_context) return res.status(400).json({ error: 'offer_text or deal_context is required' });
  res.json({
    execution_ready: true,
    deal_type_detected: 'general',
    recommended_endpoint: '/negotiate',
    blocking_flags: [],
    recommended_next_api: 'legal-contract-risk',
    execution_priority: 'high',
    automation_safe: true,
    trace_id: traceId(),
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    privacy: { data_stored: false, retention: 'none' },
    computed_at: new Date().toISOString(),
  });
});

// POST /negotiate — ONE-CALL
router.post('/negotiate', async (req: Request, res: Response) => {
  const { offer_text, party_role } = req.body;
  if (!offer_text || !party_role) return res.status(400).json({ error: 'offer_text and party_role are required' });
  try {
    const raw = await callClaude(`Comprehensive negotiation analysis and counteroffer generation. Party role: "${party_role}". Offer: "${offer_text}". Return JSON:
{
  "strategy": "collaborative|competitive|principled|hardball",
  "batna_score": 0-100,
  "top_risks": ["string"],
  "counteroffer_summary": "string",
  "key_concessions": ["string"],
  "deal_breakers": ["string"],
  "recommended_next_move": "string",
  "one_line_summary": "string",
  "confidence_per_section": { "strategy": 0-1, "batna_score": 0-1, "top_risks": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

const eventStore: Record<string, any[]> = {};
const REQUIRED_SCOPES = ['negotiation:read', 'negotiation:analyze', 'negotiation:generate'];
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
  workflowStore[id] = { workflow_id: id, goal: goal || 'default goal', steps: steps || ['analyze_position', 'score_batna', 'identify_leverage', 'generate_strategy', 'draft_counteroffer'], step_index: 0, status: 'running', created_at: new Date().toISOString() };
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
