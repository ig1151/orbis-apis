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

function traceId() { return `eco_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Economic Calendar API', info: '/economic-calendar/info', openapi: '/economic-calendar/openapi.json', health: 'ok' });
});

// POST /upcoming-events
router.post('/upcoming-events', async (req: Request, res: Response) => {
  const { timeframe = '7d', regions, event_types } = req.body;
  try {
    const regionStr = regions ? (Array.isArray(regions) ? regions.join(', ') : String(regions)) : 'US, EU, UK, JP, CN';
    const typesStr = event_types ? (Array.isArray(event_types) ? event_types.join(', ') : String(event_types)) : 'fed, cpi, ppi, payrolls, gdp, pmi, retail_sales, housing';
    const raw = await callClaude(`You are a macro economist and financial calendar expert. Generate a realistic economic calendar for the upcoming ${timeframe} covering regions: ${regionStr}. Focus on these event types: ${typesStr}.

For each event, provide realistic expected values based on current economic conditions, prior values, and a market impact assessment. Events should reflect real-world macro dynamics including central bank meetings, inflation data, employment reports, and growth indicators.

Return JSON:
{
  "events": [
    {
      "event_name": "string (e.g. US CPI MoM, Fed Rate Decision, ECB Meeting)",
      "date": "string (ISO date within the requested timeframe)",
      "region": "US|EU|UK|JP|CN",
      "expected_value": "string (e.g. +0.3%, 5.25%, 225K)",
      "prior_value": "string (e.g. +0.4%, 5.25%, 216K)",
      "importance": "high|medium|low",
      "market_impact": "stocks|bonds|forex|crypto",
      "expected_direction": "bullish|bearish|neutral"
    }
  ],
  "next_high_impact_event": "string (name and date of the next high-importance event)",
  "week_summary": "string (2-3 sentence macro calendar summary)",
  "confidence_per_section": { "event_coverage": 0.0, "impact_assessment": 0.0, "direction_forecast": 0.0 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /impact-score
router.post('/impact-score', async (req: Request, res: Response) => {
  const { event_name, actual_value, expected_value, prior_value } = req.body;
  if (!event_name || actual_value === undefined || actual_value === null) return res.status(400).json({ error: 'event_name and actual_value are required' });
  try {
    const raw = await callClaude(`You are a macro market analyst. Score the market impact of an economic data release based on the surprise factor relative to consensus expectations.

Event: "${String(event_name)}"
Actual Value: "${String(actual_value)}"
Expected/Consensus Value: "${String(expected_value || 'not provided')}"
Prior Value: "${String(prior_value || 'not provided')}"

Calculate the surprise factor (how much the actual deviated from expected), score the overall market impact from 0-100, determine whether the impact direction is positive or negative for risk assets, identify which asset classes are most affected, assess the magnitude, and generate short-term (hours) and medium-term (days) trading signals.

Return JSON:
{
  "surprise_factor": "string (e.g. Beat by +0.2pp, Missed by -15K)",
  "impact_score": 0,
  "impact_direction": "positive|negative|neutral",
  "affected_assets": ["string (e.g. US equities, Treasury bonds, USD, gold)"],
  "magnitude": "large|moderate|small|minimal",
  "short_term_signal": "string (hours-based signal, e.g. Risk-on rally likely in first 2 hours)",
  "medium_term_signal": "string (days-based signal, e.g. Bond yields to reprice higher over 3-5 days)",
  "confidence_per_section": { "surprise_calculation": 0.0, "impact_scoring": 0.0, "asset_identification": 0.0, "signal_generation": 0.0 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /macro-scenario
router.post('/macro-scenario', async (req: Request, res: Response) => {
  const { events, portfolio_type = 'mixed' } = req.body;
  try {
    const eventsStr = events ? (Array.isArray(events) ? events.map((e: any) => typeof e === 'string' ? e : JSON.stringify(e)).join('; ') : String(events)) : 'general upcoming macro events';
    const raw = await callClaude(`You are a macro strategist at a top-tier asset manager. Construct three macro scenarios (base, bull, bear) based on the following upcoming economic events and their potential outcomes, calibrated for a ${portfolio_type} portfolio.

Upcoming Events: "${String(eventsStr).slice(0, 3000)}"
Portfolio Type: ${portfolio_type}

For each scenario, assign a probability, describe the market impact, and recommend portfolio positioning. Base case should have the highest probability. Identify the key risks that could derail the base case and the key opportunities that could catalyze the bull case.

Return JSON:
{
  "base_case": {
    "probability": "string (e.g. 55%)",
    "market_impact": "string",
    "recommended_positioning": "string"
  },
  "bull_case": {
    "probability": "string (e.g. 25%)",
    "market_impact": "string",
    "recommended_positioning": "string"
  },
  "bear_case": {
    "probability": "string (e.g. 20%)",
    "market_impact": "string",
    "recommended_positioning": "string"
  },
  "key_risks": ["string"],
  "key_opportunities": ["string"],
  "confidence_per_section": { "scenario_construction": 0.0, "probability_assignment": 0.0, "positioning": 0.0 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /volatility-estimate
router.post('/volatility-estimate', async (req: Request, res: Response) => {
  const { event_name, event_date, asset } = req.body;
  try {
    const raw = await callClaude(`You are a volatility strategist and options market expert. Estimate the expected volatility impact of an upcoming economic event on a specific asset.

Event: "${String(event_name || 'major economic event')}"
Event Date: "${String(event_date || 'upcoming')}"
Asset: "${String(asset || 'SPY')}"

Based on historical behavior of this type of event and typical market reactions, estimate the expected volatility increase, the time window around the event during which vol is elevated, the historical average move for this asset on similar events, the tail risk probability (probability of a move 2x the average), and suggest an appropriate options strategy for the event.

Return JSON:
{
  "expected_vol_increase_pct": "string (e.g. +35% IV spike expected)",
  "vol_window": "string (e.g. 12 hours centered on release)",
  "historical_avg_move_pct": "string (e.g. ±0.8% on CPI day historically)",
  "tail_risk_probability": "string (e.g. 12% chance of >2% move)",
  "options_strategy_suggestion": "string (e.g. Long straddle expiring same week, sell into vol spike post-release)",
  "confidence_per_section": { "vol_estimation": 0.0, "historical_calibration": 0.0, "strategy_suitability": 0.0 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /event-signals
router.post('/event-signals', async (req: Request, res: Response) => {
  const { event_name, actual_result, consensus, prior } = req.body;
  try {
    const raw = await callClaude(`You are a quantitative macro analyst. Generate granular trading signals across sectors, currencies, and fixed income based on the outcome of an economic data release.

Event: "${String(event_name || 'economic event')}"
Actual Result: "${String(actual_result || 'not provided')}"
Consensus Expectation: "${String(consensus || 'not provided')}"
Prior Reading: "${String(prior || 'not provided')}"

Determine whether the result beat, missed, or was in line with consensus. Calculate the surprise percentage. Generate the primary risk-on/risk-off signal and then generate specific signals for key equity sectors, major currency pairs, and bond markets. Be specific and actionable.

Return JSON:
{
  "beat_miss": "beat|miss|inline",
  "surprise_pct": "string (e.g. +0.15% above consensus, or Beat by 12K jobs)",
  "primary_signal": "risk_on|risk_off|neutral",
  "sector_signals": [
    {
      "sector": "string (e.g. Financials, Technology, Energy, Consumer Discretionary)",
      "direction": "bullish|bearish|neutral"
    }
  ],
  "currency_signals": ["string (e.g. USD strengthens vs EUR, JPY weakens on risk-on)"],
  "bond_signals": "yields_up|yields_down|flat",
  "confidence_per_section": { "beat_miss_classification": 0.0, "sector_signals": 0.0, "currency_signals": 0.0, "bond_signals": 0.0 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /macro-regime
router.post('/macro-regime', async (req: Request, res: Response) => {
  const { region = 'US', economic_data } = req.body;
  try {
    const dataStr = economic_data ? `\n\nEconomic data: "${typeof economic_data === 'string' ? economic_data.slice(0, 3000) : JSON.stringify(economic_data).slice(0, 3000)}"` : '';
    const raw = await callClaude(`You are a macro regime classification analyst. Determine the current macroeconomic regime and its investment implications.

Region: "${String(region)}"${dataStr}

Classify the current macro regime using standard economic framework categories. Assess the probability of regime transition within 6 months. Provide asset class implications for each major regime state. Identify the 3 most important regime indicators to watch.

Return JSON:
{
  "current_regime": "inflationary|stagflationary|disinflationary|recessionary|liquidity_expansion|goldilocks|deflationary",
  "regime_confidence": 0.0,
  "regime_duration_estimate": "string (e.g. 3-6 more months, or 'regime transition imminent')",
  "transition_probability_6m": 0.0,
  "likely_next_regime": "string",
  "asset_class_implications": {
    "equities": "string",
    "bonds": "string",
    "commodities": "string",
    "cash": "string",
    "real_assets": "string"
  },
  "key_indicators_to_watch": ["string"],
  "regime_drivers": ["string (factors currently driving this regime)"],
  "tail_risk_scenarios": ["string"],
  "confidence_per_section": { "regime_classification": 0.0, "asset_implications": 0.0, "transition_probability": 0.0 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /cross-asset-impact
router.post('/cross-asset-impact', async (req: Request, res: Response) => {
  const { event, event_type, magnitude } = req.body;
  if (!event) return res.status(400).json({ error: 'event is required' });
  try {
    const raw = await callClaude(`You are a cross-asset macro strategist. Analyze how the following economic event will impact multiple asset classes simultaneously. Model transmission mechanisms and second-order effects.

Event: "${String(event)}"
Event type: "${String(event_type || 'macro')}" (fed_decision|cpi|jobs|gdp|earnings|geopolitical|other)
Magnitude: "${String(magnitude || 'as_described')}" (beat|in_line|miss|shock)

For each asset class, determine direction (bullish/bearish/neutral), magnitude of impact (large/moderate/small), time horizon (immediate within hours, short_term within weeks, medium_term within months), and the transmission mechanism explaining why.

Return JSON:
{
  "event_summary": "string",
  "impact_by_asset": {
    "us_equities": { "direction": "bullish|bearish|neutral", "magnitude": "large|moderate|small", "horizon": "immediate|short_term|medium_term", "mechanism": "string" },
    "us_treasuries": { "direction": "bullish|bearish|neutral", "magnitude": "large|moderate|small", "horizon": "immediate|short_term|medium_term", "mechanism": "string" },
    "usd": { "direction": "bullish|bearish|neutral", "magnitude": "large|moderate|small", "horizon": "immediate|short_term|medium_term", "mechanism": "string" },
    "gold": { "direction": "bullish|bearish|neutral", "magnitude": "large|moderate|small", "horizon": "immediate|short_term|medium_term", "mechanism": "string" },
    "oil": { "direction": "bullish|bearish|neutral", "magnitude": "large|moderate|small", "horizon": "immediate|short_term|medium_term", "mechanism": "string" },
    "crypto": { "direction": "bullish|bearish|neutral", "magnitude": "large|moderate|small", "horizon": "immediate|short_term|medium_term", "mechanism": "string" }
  },
  "dominant_theme": "string (e.g. risk-off flight to safety, reflation trade, dollar strength)",
  "most_impacted_asset": "string",
  "second_order_effects": ["string"],
  "confidence_per_section": { "impact_by_asset": 0.0, "second_order_effects": 0.0 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { events, event_name } = req.body;
  try {
    const blocking_flags: string[] = [];
    const event_count = events ? (Array.isArray(events) ? events.length : 1) : event_name ? 1 : 0;

    if (event_count === 0) blocking_flags.push('no_events_or_event_name_provided');

    // Determine next high impact event heuristically
    let next_high_impact = 'unknown — provide events list for accurate detection';
    if (event_name) next_high_impact = String(event_name);
    else if (Array.isArray(events) && events.length > 0) {
      const first = events[0];
      next_high_impact = typeof first === 'string' ? first : (first?.event_name || first?.name || JSON.stringify(first));
    }

    // Recommend endpoint
    let recommended_endpoint = '/economic-calendar/upcoming-events';
    if (event_name && (String(event_name).toLowerCase().includes('actual') || req.body.actual_result)) {
      recommended_endpoint = '/economic-calendar/event-signals';
    } else if (events && Array.isArray(events) && events.length > 0) {
      recommended_endpoint = '/economic-calendar/macro-scenario';
    }

    res.json({
      execution_ready: blocking_flags.length === 0,
      event_count,
      next_high_impact,
      recommended_endpoint,
      blocking_flags,
      recommended_next_api: 'risk-event-forecast',
      execution_priority: 'medium',
      automation_safe: true,
      trace_id: traceId(),
      confidence_per_section: { event_detection: event_count > 0 ? 0.9 : 0.0, readiness: blocking_flags.length === 0 ? 1.0 : 0.0 },
      privacy: { data_stored: false, retention: 'none' },
      computed_at: new Date().toISOString()
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /analyze (ONE-CALL full macro analysis)
router.post('/analyze', async (req: Request, res: Response) => {
  const { timeframe = '7d', regions } = req.body;
  try {
    const regionStr = regions ? (Array.isArray(regions) ? regions.join(', ') : String(regions)) : 'US, EU, UK, JP, CN';
    const raw = await callClaude(`You are a chief macro strategist. Provide a comprehensive one-call macro economic calendar analysis covering the upcoming ${timeframe} for regions: ${regionStr}.

Synthesize the macro calendar into an actionable weekly brief: identify the highest-impact events, articulate the dominant macro theme for the week, assess the overall volatility outlook, provide a clear positioning recommendation, and list the key risks to the base case.

Return JSON:
{
  "upcoming_high_impact": [
    {
      "event_name": "string",
      "date": "string",
      "region": "string",
      "importance": "high",
      "expected_direction": "bullish|bearish|neutral"
    }
  ],
  "this_week_macro_theme": "string (e.g. Inflation data dominates; Fed pivot narrative tested)",
  "volatility_outlook": "high|medium|low",
  "positioning_recommendation": "string (concrete, actionable positioning advice)",
  "key_risks": ["string"],
  "confidence_per_section": { "event_identification": 0.0, "theme_synthesis": 0.0, "volatility_assessment": 0.0, "positioning": 0.0 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Governance + Workflow
const eventStore: Record<string, any[]> = {};
const REQUIRED_SCOPES = ['calendar:read', 'calendar:analyze', 'macro:analyze'];
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
  const defaultSteps = ['fetch_events', 'score_impact', 'model_scenarios', 'estimate_volatility', 'generate_signals'];
  workflowStore[id] = { workflow_id: id, goal: goal || 'default goal', steps: steps || defaultSteps, step_index: 0, status: 'running', created_at: new Date().toISOString() };
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
