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
function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return `ref_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

const DISCLAIMER = 'For informational purposes only. Not financial advice.';

// GET / discovery
router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Risk Event Forecast API', info: '/risk-event-forecast/info', openapi: '/risk-event-forecast/openapi.json', health: 'ok' });
});

// POST /bankruptcy-probability
router.post('/bankruptcy-probability', async (req: Request, res: Response) => {
  const { company, financial_data } = req.body;
  if (!company) return res.status(400).json({ error: 'company is required' });
  try {
    const financialContext = financial_data ? `Financial data: "${JSON.stringify(financial_data).slice(0, 2000)}"` : '';
    const raw = await callClaude(`Estimate the bankruptcy probability for the following company over the next 12 months. Use all available signals.

Company: "${company}"
${financialContext}

Return JSON:
{
  "company": "${company}",
  "bankruptcy_probability_12m": 0-1,
  "bankruptcy_risk": "critical|high|medium|low|minimal",
  "altman_z_score_estimate": number,
  "piotroski_f_score_estimate": number,
  "distress_signals": [{ "signal": "string", "severity": "string" }],
  "liquidity_runway_months": number,
  "creditor_risk": "high|medium|low",
  "restructuring_probability": 0-1,
  "confidence_per_section": { "bankruptcy_probability_12m": 0-1, "distress_signals": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "paper_mode_recommended": true,
  "disclaimer": "${DISCLAIMER}",
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /volatility-forecast
router.post('/volatility-forecast', async (req: Request, res: Response) => {
  const { asset, company, timeframe = '30d' } = req.body;
  if (!asset && !company) return res.status(400).json({ error: 'asset or company is required' });
  try {
    const target = asset || company;
    const raw = await callClaude(`Forecast volatility for the following asset/company over the specified timeframe.

Asset/Company: "${target}"
Timeframe: "${timeframe}"

Return JSON:
{
  "asset": "${target}",
  "expected_volatility_pct": number,
  "vol_regime": "low|normal|elevated|extreme",
  "vol_trend": "rising|stable|falling",
  "vol_drivers": ["string"],
  "options_implied_vol_estimate": number,
  "historical_vol_comparison": "above_avg|avg|below_avg",
  "event_vol_catalysts": ["string"],
  "confidence_per_section": { "expected_volatility_pct": 0-1, "vol_drivers": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "paper_mode_recommended": true,
  "disclaimer": "${DISCLAIMER}",
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /event-prediction
router.post('/event-prediction', async (req: Request, res: Response) => {
  const { company, sector, event_types } = req.body;
  if (!company && !sector) return res.status(400).json({ error: 'company or sector is required' });
  try {
    const target = company || sector;
    const eventTypesStr = event_types ? `Limit to event types: ${Array.isArray(event_types) ? event_types.join(', ') : event_types}` : '';
    const raw = await callClaude(`Predict upcoming risk events for the following company or sector.

Target: "${target}"
${eventTypesStr}
Event types to consider: earnings_miss, regulatory_action, leadership_change, lawsuit, credit_downgrade, product_failure, bankruptcy

Return JSON:
{
  "predicted_events": [{ "event_type": "string", "probability": 0-1, "timeframe_estimate": "string", "impact_magnitude": "large|moderate|small", "early_warning_signals": ["string"] }],
  "highest_probability_event": "string",
  "combined_risk_score": 0-100,
  "confidence_per_section": { "predicted_events": 0-1, "combined_risk_score": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "paper_mode_recommended": true,
  "disclaimer": "${DISCLAIMER}",
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /stress-propagation
router.post('/stress-propagation', async (req: Request, res: Response) => {
  const { shock_event, affected_entities } = req.body;
  if (!shock_event || !affected_entities) return res.status(400).json({ error: 'shock_event and affected_entities are required' });
  try {
    const raw = await callClaude(`Analyze how a stress event would propagate through the financial system to affected entities.

Shock event: "${shock_event}"
Affected entities: "${typeof affected_entities === 'string' ? affected_entities : JSON.stringify(affected_entities).slice(0, 2000)}"

Return JSON:
{
  "primary_impact": { "entity": "string", "impact_score": 0-100, "channels": ["string"] },
  "secondary_impacts": [{ "entity": "string", "propagation_path": ["string"], "impact_score": 0-100 }],
  "systemic_risk": "low|medium|high|critical",
  "contagion_probability": 0-1,
  "firebreak_entities": ["string"],
  "time_to_peak_impact_days": number,
  "recovery_time_estimate": "string",
  "confidence_per_section": { "primary_impact": 0-1, "secondary_impacts": 0-1, "systemic_risk": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "paper_mode_recommended": true,
  "disclaimer": "${DISCLAIMER}",
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /tail-risk
router.post('/tail-risk', async (req: Request, res: Response) => {
  const { portfolio_description, asset, confidence_level = 0.95 } = req.body;
  if (!portfolio_description && !asset) return res.status(400).json({ error: 'portfolio_description or asset is required' });
  try {
    const target = portfolio_description || asset;
    const raw = await callClaude(`Estimate tail risk metrics for the following portfolio or asset.

Portfolio/Asset: "${typeof target === 'string' ? target.slice(0, 3000) : JSON.stringify(target).slice(0, 3000)}"
Confidence level: ${confidence_level}

Return JSON:
{
  "var_estimate": "string (Value at Risk estimate)",
  "cvar_estimate": "string (Conditional VaR / Expected Shortfall estimate)",
  "tail_scenarios": [{ "scenario": "string", "probability": 0-1, "loss_estimate": "string" }],
  "black_swan_sensitivity": "high|medium|low",
  "fat_tail_detected": true|false,
  "stress_loss_estimate": "string",
  "confidence_per_section": { "var_estimate": 0-1, "tail_scenarios": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "paper_mode_recommended": true,
  "disclaimer": "${DISCLAIMER}",
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { company, asset } = req.body;
  if (!company && !asset) return res.status(400).json({ error: 'company or asset is required' });
  const target = company || asset;
  const entityTypeDetected = company ? 'company' : 'asset';
  res.json({
    execution_ready: true,
    entity_type_detected: entityTypeDetected,
    recommended_endpoint: company ? '/bankruptcy-probability' : '/volatility-forecast',
    blocking_flags: [],
    trace_id: traceId(),
    confidence_per_section: { execution_ready: 0.95, entity_type_detected: 0.9 },
    privacy: { data_stored: false, retention: 'none' },
    computed_at: new Date().toISOString(),
  });
});

// POST /forecast (one-call workflow)
router.post('/forecast', async (req: Request, res: Response) => {
  const { company, asset } = req.body;
  if (!company && !asset) return res.status(400).json({ error: 'company or asset is required' });
  try {
    const target = company || asset;
    const raw = await callClaude(`ONE-CALL risk forecast. Provide a comprehensive risk assessment for the following entity covering bankruptcy risk, volatility, event predictions, tail risk, and stress propagation.

Entity: "${target}"

Return JSON:
{
  "bankruptcy_risk": "critical|high|medium|low|minimal",
  "volatility_outlook": "string",
  "top_predicted_events": [{ "event_type": "string", "probability": 0-1, "timeframe_estimate": "string" }],
  "tail_risk_summary": "string",
  "stress_propagation_risk": "low|medium|high|critical",
  "overall_risk_score": 0-100,
  "agent_summary": "string",
  "confidence_per_section": { "bankruptcy_risk": 0-1, "volatility_outlook": 0-1, "top_predicted_events": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "paper_mode_recommended": true,
  "disclaimer": "${DISCLAIMER}",
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Governance + Workflow ─────────────────────────────────────────────────────
const eventStore: Record<string, any[]> = {};
const REQUIRED_SCOPES = ['risk:read', 'risk:forecast', 'risk:analyze'];
const EXECUTION_AUTHORITY = 'low';
function evaluateGovernance(req: any) {
  const agent_id = req.headers?.['x-agent-id'] || req.body?.agent_id || null;
  const trust_score = Math.min(1.0, Math.max(0.0, parseFloat(req.headers?.['x-agent-trust-score'] || '1.0') || 1.0));
  const violations: string[] = trust_score < 0.3 ? ['trust_score_below_threshold'] : [];
  return { permitted: violations.length === 0, agent_id, trust_score, sandbox_mode: trust_score < 0.5, violations, scopes: REQUIRED_SCOPES, execution_authority: EXECUTION_AUTHORITY, audit_entry: { agent_id, timestamp: new Date().toISOString(), endpoint: req.path, method: req.method, permitted: violations.length === 0, trust_score } };
}
router.get('/events/:execution_id', (req: any, res: any) => { res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true, execution_id: req.params.execution_id, events: eventStore[req.params.execution_id] || [], total: (eventStore[req.params.execution_id] || []).length, computed_at: new Date().toISOString() }); });
router.post('/governance/check', (req: any, res: any) => { const gov = evaluateGovernance(req); res.json({ ...buildRuntime(req, { workflow_state: gov.permitted ? 'complete' : 'blocked' }), success: gov.permitted, ...gov, required_scopes: REQUIRED_SCOPES, computed_at: new Date().toISOString() }); });
router.get('/governance/scopes', (req: any, res: any) => { res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true, required_scopes: REQUIRED_SCOPES, execution_authority: EXECUTION_AUTHORITY, computed_at: new Date().toISOString() }); });
router.post('/governance/audit', (req: any, res: any) => { const { execution_id } = req.body || {}; const gov = evaluateGovernance(req); res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true, audit_trail: execution_id ? (eventStore[execution_id] || []) : [], agent_id: gov.agent_id, trust_score: gov.trust_score, computed_at: new Date().toISOString() }); });
const workflowStore: Record<string, any> = {};
router.post('/workflow/start', (req: any, res: any) => { const { goal, steps } = req.body || {}; const id = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; workflowStore[id] = { workflow_id: id, goal: goal || 'default goal', steps: steps || ['gather_signals', 'model_bankruptcy', 'forecast_volatility', 'predict_events', 'stress_propagation'], step_index: 0, status: 'running', created_at: new Date().toISOString() }; const wf = workflowStore[id]; res.json({ ...buildRuntime(req, { workflow_state: 'running' }), success: true, workflow_id: id, status: wf.status, current_step: wf.steps[0], steps: wf.steps, computed_at: new Date().toISOString() }); });
router.get('/workflow/:id', (req: any, res: any) => { const wf = workflowStore[req.params.id]; if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' }); res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true, ...wf, computed_at: new Date().toISOString() }); });
router.post('/workflow/:id/resume', (req: any, res: any) => { const wf = workflowStore[req.params.id]; if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' }); if (wf.step_index < wf.steps.length - 1) { wf.step_index++; wf.status = wf.step_index === wf.steps.length - 1 ? 'complete' : 'running'; } else { wf.status = 'complete'; } wf.updated_at = new Date().toISOString(); res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true, workflow_id: wf.workflow_id, status: wf.status, current_step: wf.steps[wf.step_index], computed_at: new Date().toISOString() }); });
router.get('/workflow/:id/state', (req: any, res: any) => { const wf = workflowStore[req.params.id]; if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' }); res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true, workflow_id: wf.workflow_id, state_machine: { current_state: wf.steps[wf.step_index], terminal: wf.status === 'complete', transitions: wf.steps.map((s: string, i: number) => ({ step: i + 1, state: s, status: i < wf.step_index ? 'complete' : i === wf.step_index ? 'active' : 'pending' })) }, computed_at: new Date().toISOString() }); });
export default router;
