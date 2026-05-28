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

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Portfolio Risk API', info: '/portfolio-risk/info', openapi: '/portfolio-risk/openapi.json', health: 'ok' });
});

// POST /score-risk
router.post('/score-risk', async (req: Request, res: Response) => {
  const { holdings, portfolio_value, risk_tolerance = 'moderate' } = req.body;
  if (!holdings) return res.status(400).json({ error: 'holdings is required' });
  try {
    const holdingsStr = typeof holdings === 'string' ? holdings : JSON.stringify(holdings).slice(0, 4000);
    const raw = await callClaude(`Score the overall risk of this investment portfolio.

Portfolio value: ${portfolio_value || 'not specified'}
Risk tolerance: "${risk_tolerance}" (conservative|moderate|aggressive)
Holdings: ${holdingsStr.slice(0, 4000)}

Return JSON:
{
  "overall_risk_score": 0-100,
  "risk_level": "very_low|low|moderate|high|very_high",
  "risk_vs_tolerance": "appropriate|too_aggressive|too_conservative",
  "risk_breakdown": { "market_risk": 0-100, "concentration_risk": 0-100, "liquidity_risk": 0-100, "correlation_risk": 0-100, "currency_risk": 0-100 },
  "top_risk_contributors": [{ "asset": "string", "contribution_pct": number, "risk_factor": "string" }],
  "diversification_score": 0-100,
  "sharpe_ratio_estimate": number,
  "max_drawdown_estimate_pct": number,
  "recommended_adjustments": ["string"],
  "confidence_per_section": { "overall_risk_score": 0-1, "risk_breakdown": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /concentration-analysis
router.post('/concentration-analysis', async (req: Request, res: Response) => {
  const { holdings } = req.body;
  if (!holdings) return res.status(400).json({ error: 'holdings is required' });
  try {
    const holdingsStr = typeof holdings === 'string' ? holdings : JSON.stringify(holdings).slice(0, 4000);
    const raw = await callClaude(`Analyze portfolio concentration risk across assets, sectors, and geographies.

Holdings: ${holdingsStr.slice(0, 4000)}

Return JSON:
{
  "top_10_holdings_pct": number,
  "largest_single_position_pct": number,
  "largest_position": "string",
  "sector_concentration": [{ "sector": "string", "weight_pct": number, "holding_count": number }],
  "geographic_concentration": [{ "region": "string", "weight_pct": number }],
  "asset_class_breakdown": [{ "asset_class": "string", "weight_pct": number }],
  "herfindahl_index": number,
  "concentration_risk_level": "low|moderate|high|very_high",
  "over_concentrated_areas": ["string"],
  "under_diversified_areas": ["string"],
  "recommendations": ["string"],
  "confidence_per_section": { "sector_concentration": 0-1, "herfindahl_index": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /correlation-matrix
router.post('/correlation-matrix', async (req: Request, res: Response) => {
  const { holdings, lookback_period = '1Y' } = req.body;
  if (!holdings) return res.status(400).json({ error: 'holdings is required' });
  try {
    const holdingsStr = typeof holdings === 'string' ? holdings : JSON.stringify(holdings).slice(0, 3000);
    const raw = await callClaude(`Estimate correlation relationships between portfolio holdings and identify clustering risk.

Lookback period: "${lookback_period}"
Holdings: ${holdingsStr.slice(0, 3000)}

Return JSON:
{
  "high_correlation_pairs": [{ "asset_a": "string", "asset_b": "string", "estimated_correlation": -1 to 1, "risk_note": "string" }],
  "low_correlation_pairs": [{ "asset_a": "string", "asset_b": "string", "estimated_correlation": -1 to 1 }],
  "correlation_clusters": [{ "cluster_name": "string", "assets": ["string"], "avg_intra_cluster_correlation": number }],
  "portfolio_avg_correlation": number,
  "diversification_benefit_score": 0-100,
  "tail_risk_note": "string",
  "hedging_opportunities": ["string"],
  "confidence_per_section": { "high_correlation_pairs": 0-1, "correlation_clusters": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /stress-test
router.post('/stress-test', async (req: Request, res: Response) => {
  const { holdings, scenarios, portfolio_value } = req.body;
  if (!holdings) return res.status(400).json({ error: 'holdings is required' });
  try {
    const holdingsStr = typeof holdings === 'string' ? holdings : JSON.stringify(holdings).slice(0, 3000);
    const scenarioList = scenarios ? JSON.stringify(scenarios) : 'default: 2008 GFC, 2020 COVID crash, 2022 rate shock, 30% equity decline, inflation spike';
    const raw = await callClaude(`Run stress test scenarios on this portfolio and estimate losses.

Portfolio value: ${portfolio_value || 'not specified'}
Scenarios: ${scenarioList}
Holdings: ${holdingsStr.slice(0, 3000)}

Return JSON:
{
  "scenarios": [{ "name": "string", "estimated_loss_pct": number, "estimated_loss_usd": number, "recovery_time_estimate": "string", "most_impacted_assets": ["string"] }],
  "worst_case_scenario": "string",
  "worst_case_loss_pct": number,
  "portfolio_resilience": "resilient|moderate|fragile",
  "tail_risk_probability_pct": number,
  "protective_assets": ["string (assets that hold or gain in stress)"],
  "vulnerability_summary": "string",
  "confidence_per_section": { "scenarios": 0-1, "tail_risk_probability_pct": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /sector-exposure
router.post('/sector-exposure', async (req: Request, res: Response) => {
  const { holdings, benchmark = 'S&P 500' } = req.body;
  if (!holdings) return res.status(400).json({ error: 'holdings is required' });
  try {
    const holdingsStr = typeof holdings === 'string' ? holdings : JSON.stringify(holdings).slice(0, 4000);
    const raw = await callClaude(`Analyze sector exposure and compare to benchmark.

Benchmark: "${benchmark}"
Holdings: ${holdingsStr.slice(0, 4000)}

Return JSON:
{
  "sector_weights": [{ "sector": "string", "portfolio_weight_pct": number, "benchmark_weight_pct": number, "overweight_pct": number, "underweight_pct": number, "tilt": "overweight|inline|underweight" }],
  "largest_overweight": "string",
  "largest_underweight": "string",
  "active_risk_score": 0-100,
  "cyclical_vs_defensive_ratio": number,
  "sector_momentum": [{ "sector": "string", "momentum": "positive|neutral|negative" }],
  "rebalancing_suggestions": ["string"],
  "confidence_per_section": { "sector_weights": 0-1, "active_risk_score": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /drawdown-analysis
router.post('/drawdown-analysis', async (req: Request, res: Response) => {
  const { holdings, time_horizon = '1Y' } = req.body;
  if (!holdings) return res.status(400).json({ error: 'holdings is required' });
  try {
    const holdingsStr = typeof holdings === 'string' ? holdings : JSON.stringify(holdings).slice(0, 4000);
    const raw = await callClaude(`Estimate drawdown risk and recovery characteristics for this portfolio.

Time horizon: "${time_horizon}"
Holdings: ${holdingsStr.slice(0, 4000)}

Return JSON:
{
  "max_drawdown_estimate_pct": number,
  "expected_drawdown_pct": number,
  "time_to_recover_estimate": "string",
  "var_95_pct": number,
  "cvar_95_pct": number,
  "drawdown_contributors": [{ "asset": "string", "contribution_pct": number }],
  "drawdown_protection_score": 0-100,
  "historical_analog": "string",
  "risk_adjusted_return_estimate": number,
  "protection_strategies": ["string"],
  "confidence_per_section": { "max_drawdown_estimate_pct": 0-1, "var_95_pct": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /rebalance-suggestions
router.post('/rebalance-suggestions', async (req: Request, res: Response) => {
  const { holdings, target_allocation, risk_tolerance = 'moderate', portfolio_value } = req.body;
  if (!holdings) return res.status(400).json({ error: 'holdings is required' });
  try {
    const holdingsStr = typeof holdings === 'string' ? holdings : JSON.stringify(holdings).slice(0, 3000);
    const targetStr = target_allocation ? JSON.stringify(target_allocation) : 'derive optimal from risk tolerance';
    const raw = await callClaude(`Generate portfolio rebalancing suggestions to optimize risk-return profile.

Portfolio value: ${portfolio_value || 'not specified'}
Risk tolerance: "${risk_tolerance}"
Target allocation: ${targetStr}
Current holdings: ${holdingsStr.slice(0, 3000)}

Return JSON:
{
  "rebalancing_needed": true|false,
  "urgency": "immediate|soon|optional|none",
  "trades": [{ "asset": "string", "action": "buy|sell|hold", "current_weight_pct": number, "target_weight_pct": number, "delta_pct": number, "estimated_trade_size_usd": number, "rationale": "string" }],
  "estimated_risk_reduction_pct": number,
  "estimated_return_improvement_pct": number,
  "tax_considerations": ["string"],
  "transaction_cost_estimate_usd": number,
  "priority_trades": ["string"],
  "confidence_per_section": { "trades": 0-1, "urgency": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { holdings } = req.body;
  if (!holdings) return res.status(400).json({ error: 'holdings is required' });
  const holdingCount = Array.isArray(holdings) ? holdings.length : typeof holdings === 'object' ? Object.keys(holdings).length : 1;
  res.json({
    execution_ready: holdingCount > 0,
    holding_count: holdingCount,
    recommended_endpoint: holdingCount > 10 ? '/score-risk' : '/concentration-analysis',
    next_api: 'financial-news-monitor',
    next_endpoint: '/analyze-sentiment',
    blocking_flags: holdingCount === 0 ? ['NO_HOLDINGS'] : [],
    flag_definitions: { NO_HOLDINGS: 'No holdings provided — cannot analyze empty portfolio' },
    confidence_per_section: { execution_ready: 0.95 },
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /analyze-portfolio (ONE-CALL)
router.post('/analyze-portfolio', async (req: Request, res: Response) => {
  const { holdings, portfolio_value, risk_tolerance = 'moderate' } = req.body;
  if (!holdings) return res.status(400).json({ error: 'holdings is required' });
  try {
    const holdingsStr = typeof holdings === 'string' ? holdings : JSON.stringify(holdings).slice(0, 4000);
    const raw = await callClaude(`ONE-CALL full portfolio risk analysis. Score risk, concentration, sector exposure, stress scenarios, and generate rebalancing action plan.

Portfolio value: ${portfolio_value || 'not specified'}
Risk tolerance: "${risk_tolerance}"
Holdings: ${holdingsStr.slice(0, 4000)}

Return JSON:
{
  "overall_risk_score": 0-100,
  "risk_level": "very_low|low|moderate|high|very_high",
  "risk_vs_tolerance": "appropriate|too_aggressive|too_conservative",
  "concentration_risk": "low|moderate|high|very_high",
  "top_5_positions_pct": number,
  "sector_tilts": [{ "sector": "string", "tilt": "overweight|inline|underweight", "weight_pct": number }],
  "stress_test_worst_case_pct": number,
  "max_drawdown_estimate_pct": number,
  "diversification_score": 0-100,
  "top_risks": ["string"],
  "immediate_actions": ["string"],
  "rebalancing_priority": "immediate|soon|optional|none",
  "portfolio_health_score": 0-100,
  "one_line_summary": "string",
  "confidence_per_section": { "overall_risk_score": 0-1, "portfolio_health_score": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Governance + Workflow ─────────────────────────────────────────────────────
const eventStore: Record<string, any[]> = {};
const REQUIRED_SCOPES = ['portfolio:read', 'portfolio:analyze', 'portfolio:execute'];
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
  const defaultSteps = ['validate_holdings', 'score_risk', 'concentration_check', 'stress_test', 'generate_rebalance'];
  workflowStore[id] = { workflow_id: id, goal: goal || 'analyze portfolio risk', steps: steps || defaultSteps, step_index: 0, status: 'running', created_at: new Date().toISOString() };
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
