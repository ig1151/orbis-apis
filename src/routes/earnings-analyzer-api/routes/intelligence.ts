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
  res.json({ name: 'Earnings Analyzer API', info: '/earnings-analyzer/info', openapi: '/earnings-analyzer/openapi.json', health: 'ok' });
});

// POST /analyze-earnings
router.post('/analyze-earnings', async (req: Request, res: Response) => {
  const { earnings_text, ticker, fiscal_period } = req.body;
  if (!earnings_text) return res.status(400).json({ error: 'earnings_text is required' });
  try {
    const raw = await callClaude(`Analyze this earnings report and extract key financial metrics, performance highlights, and analyst-relevant signals.

Ticker: "${ticker || 'unknown'}", Period: "${fiscal_period || 'unknown'}"
Earnings text (first 4000 chars): "${earnings_text.slice(0, 4000)}"

Return JSON:
{
  "ticker": "string",
  "fiscal_period": "string",
  "revenue": { "reported": number, "unit": "string", "yoy_change_pct": number },
  "eps": { "reported": number, "diluted": number, "yoy_change_pct": number },
  "net_income": { "reported": number, "unit": "string", "yoy_change_pct": number },
  "gross_margin_pct": number,
  "operating_margin_pct": number,
  "free_cash_flow": number,
  "key_highlights": ["string"],
  "segment_performance": [{ "segment": "string", "revenue": number, "growth_pct": number }],
  "analyst_signals": ["string"],
  "sentiment": "bullish|neutral|bearish",
  "confidence_per_section": { "revenue": 0-1, "eps": 0-1, "sentiment": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /extract-metrics
router.post('/extract-metrics', async (req: Request, res: Response) => {
  const { earnings_text, metrics = [] } = req.body;
  if (!earnings_text) return res.status(400).json({ error: 'earnings_text is required' });
  try {
    const metricList = metrics.length > 0 ? metrics.join(', ') : 'revenue, EPS, net income, gross margin, operating income, free cash flow, guidance';
    const raw = await callClaude(`Extract specific financial metrics from this earnings report.

Metrics to extract: ${metricList}
Earnings text (first 4000 chars): "${earnings_text.slice(0, 4000)}"

Return JSON:
{
  "metrics": [{ "name": "string", "value": "string", "unit": "string", "period": "string", "source_quote": "string", "confidence": 0-1 }],
  "metrics_not_found": ["string"],
  "data_quality": "high|medium|low",
  "extraction_notes": ["string"],
  "confidence_per_section": { "metrics": 0-1, "data_quality": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /detect-beats-misses
router.post('/detect-beats-misses', async (req: Request, res: Response) => {
  const { earnings_text, consensus_estimates } = req.body;
  if (!earnings_text) return res.status(400).json({ error: 'earnings_text is required' });
  try {
    const estimatesStr = consensus_estimates ? JSON.stringify(consensus_estimates) : 'not provided — infer from analyst language in text';
    const raw = await callClaude(`Detect earnings beats and misses vs consensus estimates.

Consensus estimates: ${estimatesStr}
Earnings text (first 4000 chars): "${earnings_text.slice(0, 4000)}"

Return JSON:
{
  "overall_result": "beat|miss|in-line",
  "revenue_result": { "estimate": number, "actual": number, "beat_by_pct": number, "result": "beat|miss|in-line" },
  "eps_result": { "estimate": number, "actual": number, "beat_by_pct": number, "result": "beat|miss|in-line" },
  "guidance_result": { "raised": true|false, "lowered": true|false, "maintained": true|false, "details": "string" },
  "surprise_factor": "large_beat|small_beat|in-line|small_miss|large_miss",
  "market_reaction_predicted": "strong_positive|positive|neutral|negative|strong_negative",
  "key_misses": ["string"],
  "key_beats": ["string"],
  "confidence_per_section": { "revenue_result": 0-1, "eps_result": 0-1, "guidance_result": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /compare-quarters
router.post('/compare-quarters', async (req: Request, res: Response) => {
  const { current_quarter, prior_quarter, ticker } = req.body;
  if (!current_quarter || !prior_quarter) return res.status(400).json({ error: 'current_quarter and prior_quarter are required' });
  try {
    const raw = await callClaude(`Compare two earnings periods and identify material changes in financial performance.

Ticker: "${ticker || 'unknown'}"
Current quarter (first 2000 chars): "${String(current_quarter).slice(0, 2000)}"
Prior quarter (first 2000 chars): "${String(prior_quarter).slice(0, 2000)}"

Return JSON:
{
  "ticker": "string",
  "trend": "improving|stable|deteriorating",
  "revenue_change_pct": number,
  "eps_change_pct": number,
  "margin_change_pct": number,
  "material_changes": [{ "metric": "string", "change": "string", "significance": "high|medium|low" }],
  "improving_areas": ["string"],
  "deteriorating_areas": ["string"],
  "quarter_over_quarter_narrative": "string",
  "year_over_year_narrative": "string",
  "momentum_score": 0-100,
  "confidence_per_section": { "material_changes": 0-1, "trend": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /segment-analysis
router.post('/segment-analysis', async (req: Request, res: Response) => {
  const { earnings_text, ticker } = req.body;
  if (!earnings_text) return res.status(400).json({ error: 'earnings_text is required' });
  try {
    const raw = await callClaude(`Extract and analyze business segment performance from this earnings report.

Ticker: "${ticker || 'unknown'}"
Earnings text (first 4000 chars): "${earnings_text.slice(0, 4000)}"

Return JSON:
{
  "segments": [{ "name": "string", "revenue": number, "revenue_unit": "string", "growth_yoy_pct": number, "operating_income": number, "margin_pct": number, "highlights": ["string"], "risks": ["string"] }],
  "largest_segment": "string",
  "fastest_growing_segment": "string",
  "declining_segments": ["string"],
  "segment_mix_shift": "string",
  "total_segments_count": number,
  "confidence_per_section": { "segments": 0-1, "segment_mix_shift": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /management-sentiment
router.post('/management-sentiment', async (req: Request, res: Response) => {
  const { earnings_text, transcript_type = 'call' } = req.body;
  if (!earnings_text) return res.status(400).json({ error: 'earnings_text is required' });
  try {
    const raw = await callClaude(`Analyze management tone, sentiment, and confidence signals from this earnings ${transcript_type}.

Earnings text (first 4000 chars): "${earnings_text.slice(0, 4000)}"

Return JSON:
{
  "overall_tone": "very_confident|confident|cautious|defensive|concerned",
  "sentiment_score": -100 to 100,
  "ceo_tone": "string",
  "cfo_tone": "string",
  "bullish_signals": ["string (exact quotes or phrases)"],
  "bearish_signals": ["string (exact quotes or phrases)"],
  "hedging_language": ["string (uncertain phrases used)"],
  "forward_looking_statements": ["string"],
  "topics_avoided": ["string"],
  "analyst_qa_tone": "open|guarded|deflecting",
  "red_flags": ["string"],
  "confidence_per_section": { "overall_tone": 0-1, "bullish_signals": 0-1, "red_flags": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /guidance-analysis
router.post('/guidance-analysis', async (req: Request, res: Response) => {
  const { earnings_text, ticker } = req.body;
  if (!earnings_text) return res.status(400).json({ error: 'earnings_text is required' });
  try {
    const raw = await callClaude(`Extract and analyze forward guidance from this earnings report.

Ticker: "${ticker || 'unknown'}"
Earnings text (first 4000 chars): "${earnings_text.slice(0, 4000)}"

Return JSON:
{
  "guidance_provided": true|false,
  "next_quarter_revenue": { "low": number, "high": number, "unit": "string" },
  "next_quarter_eps": { "low": number, "high": number },
  "full_year_revenue": { "low": number, "high": number, "unit": "string" },
  "full_year_eps": { "low": number, "high": number },
  "guidance_trend": "raised|maintained|lowered|withdrawn",
  "guidance_confidence": "specific|range|vague|none",
  "key_assumptions": ["string"],
  "risk_factors_to_guidance": ["string"],
  "vs_consensus": "above|inline|below|unavailable",
  "confidence_per_section": { "next_quarter_revenue": 0-1, "guidance_trend": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /risk-factors
router.post('/risk-factors', async (req: Request, res: Response) => {
  const { earnings_text, ticker } = req.body;
  if (!earnings_text) return res.status(400).json({ error: 'earnings_text is required' });
  try {
    const raw = await callClaude(`Extract and categorize risk factors disclosed in this earnings report.

Ticker: "${ticker || 'unknown'}"
Earnings text (first 4000 chars): "${earnings_text.slice(0, 4000)}"

Return JSON:
{
  "risks": [{ "risk": "string", "category": "macro|competitive|operational|regulatory|financial|geopolitical", "severity": "high|medium|low", "time_horizon": "near-term|medium-term|long-term", "management_response": "string" }],
  "new_risks": ["string (risks not previously disclosed)"],
  "resolved_risks": ["string (risks that have been resolved)"],
  "top_risk": "string",
  "risk_trend": "increasing|stable|decreasing",
  "overall_risk_rating": "high|medium|low",
  "confidence_per_section": { "risks": 0-1, "risk_trend": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { earnings_text, ticker } = req.body;
  if (!earnings_text) return res.status(400).json({ error: 'earnings_text is required' });
  const charCount = (earnings_text || '').length;
  res.json({
    execution_ready: charCount > 200,
    ticker: ticker || 'unknown',
    content_length: charCount,
    recommended_endpoint: charCount > 3000 ? '/analyze-earnings' : '/extract-metrics',
    next_api: 'financial-news-monitor',
    next_endpoint: '/analyze-sentiment',
    blocking_flags: charCount < 200 ? ['CONTENT_TOO_SHORT'] : [],
    flag_definitions: { CONTENT_TOO_SHORT: 'Earnings text too short for reliable analysis' },
    confidence_per_section: { execution_ready: 0.95 },
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /analyze (ONE-CALL workflow)
router.post('/analyze', async (req: Request, res: Response) => {
  const { earnings_text, ticker, fiscal_period, consensus_estimates } = req.body;
  if (!earnings_text) return res.status(400).json({ error: 'earnings_text is required' });
  try {
    const estimatesStr = consensus_estimates ? JSON.stringify(consensus_estimates) : 'not provided';
    const raw = await callClaude(`ONE-CALL full earnings analysis. Extract metrics, detect beats/misses, analyze sentiment, and generate investment signals.

Ticker: "${ticker || 'unknown'}", Period: "${fiscal_period || 'unknown'}"
Consensus estimates: ${estimatesStr}
Earnings text (first 4000 chars): "${earnings_text.slice(0, 4000)}"

Return JSON:
{
  "ticker": "string",
  "fiscal_period": "string",
  "overall_result": "beat|miss|in-line",
  "revenue": { "reported": number, "estimate": number, "beat_by_pct": number },
  "eps": { "reported": number, "estimate": number, "beat_by_pct": number },
  "key_metrics": [{ "name": "string", "value": "string", "yoy_change_pct": number }],
  "guidance": { "trend": "raised|maintained|lowered|withdrawn", "next_quarter_eps_range": "string", "full_year_revenue_range": "string" },
  "management_tone": "very_confident|confident|cautious|defensive",
  "top_risks": ["string"],
  "top_opportunities": ["string"],
  "investment_signal": "strong_buy|buy|hold|sell|strong_sell",
  "signal_rationale": "string",
  "one_line_summary": "string",
  "confidence_per_section": { "revenue": 0-1, "eps": 0-1, "investment_signal": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Event Store + Governance ──────────────────────────────────────────────────
const eventStore: Record<string, any[]> = {};
const REQUIRED_SCOPES = ['earnings:read', 'earnings:analyze', 'earnings:execute'];
const EXECUTION_AUTHORITY = 'low';
function evaluateGovernance(req: any) {
  const agent_id = req.headers?.['x-agent-id'] || req.body?.agent_id || null;
  const trust_score = Math.min(1.0, Math.max(0.0, parseFloat(req.headers?.['x-agent-trust-score'] || '1.0') || 1.0));
  const sandbox_mode = trust_score < 0.5;
  const violations: string[] = [];
  if (trust_score < 0.3) violations.push('trust_score_below_threshold');
  return { permitted: violations.length === 0, agent_id, trust_score, sandbox_mode, violations,
    scopes: REQUIRED_SCOPES, execution_authority: EXECUTION_AUTHORITY,
    audit_entry: { agent_id, timestamp: new Date().toISOString(), endpoint: req.path, method: req.method, permitted: violations.length === 0, trust_score } };
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

// ── Workflow Runtime ──────────────────────────────────────────────────────────
const workflowStore: Record<string, any> = {};
router.post('/workflow/start', (req: any, res: any) => {
  const { goal, steps } = req.body || {};
  const id = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const defaultSteps = ['validate_input', 'extract_metrics', 'detect_beats_misses', 'analyze_sentiment', 'generate_signal'];
  workflowStore[id] = { workflow_id: id, goal: goal || 'analyze earnings', steps: steps || defaultSteps, step_index: 0, status: 'running', created_at: new Date().toISOString() };
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
