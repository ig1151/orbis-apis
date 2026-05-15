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

function traceId() { return `scr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

// GET / — discovery
router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Supply Chain Risk API',
    description: 'AI-powered supply chain risk intelligence: supplier scoring, disruption analysis, geopolitical exposure, concentration risk, logistics, dependency mapping',
    endpoints: [
      'GET /',
      'POST /supplier-risk',
      'POST /disruption-analysis',
      'POST /geopolitical-exposure',
      'POST /concentration-risk',
      'POST /logistics-analysis',
      'POST /dependency-mapping',
      'POST /execution-gate',
      'POST /assess',
    ],
    health: 'ok',
  });
});

// POST /supplier-risk
router.post('/supplier-risk', async (req: Request, res: Response) => {
  const { company, suppliers } = req.body;
  if (!company && !suppliers) return res.status(400).json({ error: 'company or suppliers is required' });
  try {
    const raw = await callClaude(`Analyze supplier risk for: company="${company || ''}" suppliers=${JSON.stringify(suppliers || [])}. Return JSON:
{
  "suppliers": [
    {
      "name": "string",
      "risk_score": 0-100,
      "risk_level": "critical|high|medium|low",
      "country": "string",
      "single_source_dependency": true|false,
      "financial_stability": "stable|uncertain|at_risk",
      "lead_time_risk": "high|medium|low",
      "quality_risk": "high|medium|low"
    }
  ],
  "overall_supply_risk": "low|medium|high|critical",
  "highest_risk_supplier": "string",
  "confidence_per_section": { "suppliers": 0-1, "overall_supply_risk": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /disruption-analysis
router.post('/disruption-analysis', async (req: Request, res: Response) => {
  const { company, supply_chain_data } = req.body;
  if (!company && !supply_chain_data) return res.status(400).json({ error: 'company or supply_chain_data is required' });
  try {
    const raw = await callClaude(`Analyze supply chain disruption risks for: company="${company || ''}" supply_chain_data="${supply_chain_data || ''}". Return JSON:
{
  "active_disruptions": [
    {
      "event": "string",
      "severity": "critical|high|medium|low",
      "affected_region": "string",
      "affected_categories": ["string"],
      "estimated_duration": "string",
      "probability_of_impact": 0-1
    }
  ],
  "disruption_risk_score": 0-100,
  "most_at_risk_inputs": ["string"],
  "contingency_recommended": true|false,
  "confidence_per_section": { "active_disruptions": 0-1, "disruption_risk_score": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /geopolitical-exposure
router.post('/geopolitical-exposure', async (req: Request, res: Response) => {
  const { company, suppliers } = req.body;
  if (!company && !suppliers) return res.status(400).json({ error: 'company or suppliers is required' });
  try {
    const raw = await callClaude(`Analyze geopolitical exposure for supply chain: company="${company || ''}" suppliers=${JSON.stringify(suppliers || [])}. Return JSON:
{
  "regions": [
    {
      "region": "string",
      "exposure_pct": 0-100,
      "risk_level": "low|medium|high|critical",
      "active_risks": ["string"],
      "trade_war_exposure": true|false,
      "sanctions_risk": true|false
    }
  ],
  "overall_geo_risk": "low|medium|high|critical",
  "top_exposure_region": "string",
  "diversification_score": 0-100,
  "recommended_diversification": ["string"],
  "confidence_per_section": { "regions": 0-1, "diversification_score": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /concentration-risk
router.post('/concentration-risk', async (req: Request, res: Response) => {
  const { company, supply_chain_data } = req.body;
  if (!company && !supply_chain_data) return res.status(400).json({ error: 'company or supply_chain_data is required' });
  try {
    const raw = await callClaude(`Analyze supply chain concentration risk for: company="${company || ''}" supply_chain_data="${supply_chain_data || ''}". Return JSON:
{
  "herfindahl_index": 0-1,
  "concentration_level": "low|moderate|high|critical",
  "single_source_items": ["string"],
  "top_3_supplier_share_pct": 0-100,
  "category_concentration": [
    {
      "category": "string",
      "supplier_count": 0,
      "top_supplier_share_pct": 0-100
    }
  ],
  "dependency_risks": ["string"],
  "confidence_per_section": { "herfindahl_index": 0-1, "category_concentration": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /logistics-analysis
router.post('/logistics-analysis', async (req: Request, res: Response) => {
  const { company, logistics_data } = req.body;
  if (!company && !logistics_data) return res.status(400).json({ error: 'company or logistics_data is required' });
  try {
    const raw = await callClaude(`Analyze logistics risk for supply chain: company="${company || ''}" logistics_data="${logistics_data || ''}". Return JSON:
{
  "logistics_risk_score": 0-100,
  "transport_modes": [
    {
      "mode": "string",
      "risk_level": "low|medium|high|critical",
      "delays_expected": true|false
    }
  ],
  "port_concentration_risk": "low|medium|high",
  "customs_risk": "low|medium|high",
  "last_mile_risk": "low|medium|high",
  "estimated_delay_days": 0,
  "resilience_score": 0-100,
  "confidence_per_section": { "logistics_risk_score": 0-1, "transport_modes": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /dependency-mapping
router.post('/dependency-mapping', async (req: Request, res: Response) => {
  const { company, supply_chain_text } = req.body;
  if (!company && !supply_chain_text) return res.status(400).json({ error: 'company or supply_chain_text is required' });
  try {
    const raw = await callClaude(`Map supply chain dependencies for: company="${company || ''}" supply_chain_text="${supply_chain_text || ''}". Return JSON:
{
  "critical_dependencies": [
    {
      "item": "string",
      "supplier": "string",
      "substitutability": "low|medium|high",
      "switchover_weeks": 0,
      "strategic_importance": "critical|high|medium|low"
    }
  ],
  "tier_2_risks": ["string"],
  "orphan_dependencies": ["string"],
  "resilience_score": 0-100,
  "confidence_per_section": { "critical_dependencies": 0-1, "resilience_score": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { company, suppliers } = req.body;
  if (!company && !suppliers) return res.status(400).json({ error: 'company or suppliers is required' });
  const supplier_count = Array.isArray(suppliers) ? suppliers.length : 0;
  res.json({
    execution_ready: true,
    company: company || null,
    supplier_count,
    recommended_endpoint: supplier_count > 0 ? '/supplier-risk' : '/assess',
    blocking_flags: [],
    trace_id: traceId(),
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    privacy: { data_stored: false, retention: 'none' },
    computed_at: new Date().toISOString(),
  });
});

// POST /assess — ONE-CALL
router.post('/assess', async (req: Request, res: Response) => {
  const { company } = req.body;
  if (!company) return res.status(400).json({ error: 'company is required' });
  try {
    const raw = await callClaude(`Comprehensive supply chain risk assessment for company: "${company}". Return JSON:
{
  "overall_risk": "low|medium|high|critical",
  "supplier_risks": [
    {
      "name": "string",
      "risk_score": 0-100,
      "risk_level": "critical|high|medium|low",
      "country": "string"
    }
  ],
  "geopolitical_hotspots": ["string"],
  "top_disruption_risks": ["string"],
  "concentration_score": 0-100,
  "logistics_score": 0-100,
  "recommended_actions": ["string"],
  "one_line_summary": "string",
  "confidence_per_section": { "overall_risk": 0-1, "supplier_risks": 0-1, "geopolitical_hotspots": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

const eventStore: Record<string, any[]> = {};
const REQUIRED_SCOPES = ['supply:read', 'supply:analyze', 'supply:monitor'];
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
  workflowStore[id] = { workflow_id: id, goal: goal || 'default goal', steps: steps || ['map_suppliers', 'score_risks', 'analyze_geopolitical', 'detect_disruptions', 'generate_mitigations'], step_index: 0, status: 'running', created_at: new Date().toISOString() };
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
