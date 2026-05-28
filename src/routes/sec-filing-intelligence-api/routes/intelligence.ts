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

function traceId() { return `sec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'SEC Filing Intelligence API', info: '/sec-filing-intelligence/info', openapi: '/sec-filing-intelligence/openapi.json', health: 'ok' });
});

// POST /analyze-filing
router.post('/analyze-filing', async (req: Request, res: Response) => {
  const { filing_text, company, filing_type } = req.body;
  if (!filing_text && !company) return res.status(400).json({ error: 'filing_text or company is required' });
  try {
    const input = filing_text || `${company} ${filing_type || '10-K'} filing`;
    const raw = await callClaude(`You are a senior equity analyst specializing in SEC filing analysis. Analyze the following SEC filing and extract key financial metrics, investment signals, and actionable insights.

Filing Text: "${String(input).slice(0, 4000)}"

Extract and return a comprehensive analysis with revenue figures, EPS, margin trends, year-over-year growth rates, key highlights, red flags, and an investment signal. Be precise and use actual numbers from the filing where available.

Return JSON:
{
  "company": "string",
  "filing_type": "string (10-K|10-Q|8-K|S-1|other)",
  "period": "string",
  "financial_metrics": {
    "revenue_growth_yoy": "number (e.g. 12.4 for 12.4%)",
    "gross_margin": "number (e.g. 42.3 for 42.3%)",
    "operating_margin": "number (e.g. 18.7 for 18.7%)",
    "net_margin": "number (e.g. 14.2 for 14.2%)",
    "free_cash_flow": "string (e.g. $340M)",
    "debt_to_equity": "number (e.g. 0.45)",
    "eps_growth_yoy": "number (e.g. 8.1 for 8.1%)"
  },
  "revenue": "string",
  "eps": "string",
  "key_highlights": ["string"],
  "red_flags": ["string"],
  "investment_signal": "strong_buy|buy|hold|sell|strong_sell",
  "agent_summary": "string",
  "confidence_per_section": { "metrics": 0.0, "growth": 0.0, "signal": 0.0, "highlights": 0.0 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /extract-risks
router.post('/extract-risks', async (req: Request, res: Response) => {
  const { filing_text } = req.body;
  if (!filing_text) return res.status(400).json({ error: 'filing_text is required' });
  try {
    const raw = await callClaude(`You are a risk analyst specializing in SEC filings. Extract and categorize all material risk factors from the following filing text. Identify risks by category, assess severity, determine trend direction, and note whether mitigation strategies are mentioned.

Filing Text: "${String(filing_text).slice(0, 4000)}"

Identify every material risk factor. For each, determine its category (financial, legal, regulatory, operational, market, or competitive), severity level, trend direction, and whether the company mentions a mitigation strategy. Also identify any new risks compared to what a prior filing might have contained, and any risks that appear to have been removed.

Return JSON:
{
  "risk_count": 0,
  "top_risk": "string (single most critical risk)",
  "overall_risk_level": "critical|high|medium|low",
  "risks": [
    {
      "category": "financial|legal|regulatory|operational|market|competitive",
      "severity": "critical|high|medium|low",
      "description": "string",
      "trend": "increasing|stable|decreasing",
      "mitigation_mentioned": true
    }
  ],
  "new_risks_vs_prior": ["string"],
  "removed_risks": ["string"],
  "confidence_per_section": { "risk_identification": 0.0, "severity_assessment": 0.0, "trend_analysis": 0.0 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /compare-filings
router.post('/compare-filings', async (req: Request, res: Response) => {
  const { filing_a, filing_b } = req.body;
  if (!filing_a || !filing_b) return res.status(400).json({ error: 'filing_a and filing_b are required' });
  try {
    const raw = await callClaude(`You are a senior equity analyst. Compare two SEC filings from different periods and identify material changes, metric shifts, risk evolution, and investment implications.

Filing A (earlier period): "${String(filing_a).slice(0, 2000)}"

Filing B (later period): "${String(filing_b).slice(0, 2000)}"

Compare these filings across key financial metrics, identify material changes in business conditions, track risk evolution, assess sentiment shift between filings, and determine the momentum direction. Provide an investment implication based on the period-over-period changes.

Return JSON:
{
  "period_a": "string (e.g. Q2 2023 or FY2022)",
  "period_b": "string (e.g. Q3 2023 or FY2023)",
  "metric_changes": {
    "revenue_change_pct": "string (e.g. +12.4%)",
    "eps_change_pct": "string (e.g. -3.2%)",
    "margin_change_pct": "string (e.g. +1.8pp)"
  },
  "material_changes": ["string"],
  "risk_delta": {
    "new_risks": ["string"],
    "removed_risks": ["string"]
  },
  "sentiment_shift": "string (e.g. Management tone shifted from cautious to optimistic)",
  "momentum": "improving|stable|declining",
  "investment_implication": "string",
  "confidence_per_section": { "metric_comparison": 0.0, "risk_delta": 0.0, "sentiment": 0.0, "momentum": 0.0 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /insider-activity
router.post('/insider-activity', async (req: Request, res: Response) => {
  const { filing_text, company } = req.body;
  if (!filing_text && !company) return res.status(400).json({ error: 'filing_text or company is required' });
  try {
    const input = filing_text || `${company} insider transactions Form 4`;
    const raw = await callClaude(`You are an insider trading analyst. Extract and analyze all insider transaction data from the following SEC filing. Identify patterns of coordinated buying or selling that may signal conviction about future performance.

Filing/Data: "${String(input).slice(0, 4000)}"

Extract individual insider transactions including the person's name, role, transaction type (buy/sell), share count, price, and total value. Calculate aggregate buy and sell totals. Determine the net sentiment signal and identify any cluster patterns of coordinated activity.

Return JSON:
{
  "insiders": [
    {
      "name": "string",
      "role": "string (e.g. CEO, CFO, Director)",
      "transaction_type": "buy|sell",
      "shares": 0,
      "price_per_share": "string",
      "total_value": "string",
      "date": "string",
      "filing_type": "string (e.g. Form 4)"
    }
  ],
  "total_buy_value": "string",
  "total_sell_value": "string",
  "net_sentiment": "bullish|bearish|neutral",
  "largest_transaction": "string (description of largest single transaction)",
  "cluster_signal": "coordinated_buying|coordinated_selling|mixed|none",
  "confidence_per_section": { "transaction_extraction": 0.0, "sentiment_assessment": 0.0, "cluster_detection": 0.0 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /liquidity-analysis
router.post('/liquidity-analysis', async (req: Request, res: Response) => {
  const { filing_text } = req.body;
  if (!filing_text) return res.status(400).json({ error: 'filing_text is required' });
  try {
    const raw = await callClaude(`You are a credit analyst specializing in liquidity and solvency assessment. Analyze the following SEC filing and extract all liquidity-related financial metrics. Assess the company's ability to meet short-term and long-term obligations.

Filing Text: "${String(filing_text).slice(0, 4000)}"

Extract balance sheet and cash flow metrics to calculate liquidity ratios. Assess going concern risk, identify any debt covenant risks, and assign an overall liquidity score and grade. A score of 80-100 is grade A, 60-79 is B, 40-59 is C, 20-39 is D, below 20 is F.

Return JSON:
{
  "current_ratio": "string (e.g. 2.4x)",
  "quick_ratio": "string (e.g. 1.8x)",
  "cash_and_equivalents": "string (e.g. $1.2B)",
  "debt_to_equity": "string (e.g. 0.45x)",
  "interest_coverage": "string (e.g. 8.3x)",
  "free_cash_flow": "string (e.g. $340M)",
  "liquidity_score": 0,
  "liquidity_grade": "A|B|C|D|F",
  "going_concern_risk": "none|low|medium|high",
  "covenant_risks": ["string"],
  "confidence_per_section": { "ratio_extraction": 0.0, "scoring": 0.0, "covenant_analysis": 0.0 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /management-changes
router.post('/management-changes', async (req: Request, res: Response) => {
  const { filing_text, company } = req.body;
  if (!filing_text && !company) return res.status(400).json({ error: 'filing_text or company is required' });
  try {
    const input = filing_text || `${company} proxy statement executive changes 8-K`;
    const raw = await callClaude(`You are an executive leadership analyst. Extract all management and board changes from the following SEC filing. Assess leadership stability and succession risk based on the pattern and nature of changes.

Filing/Data: "${String(input).slice(0, 4000)}"

Identify every executive or board-level personnel change including appointments, departures, and interim roles. Note the context of each change (e.g., retirement, resignation, termination, expansion). Assess whether the overall pattern indicates a stable, moderately churning, or high-churn leadership environment. Identify red flags such as sudden departures, interim appointments at critical roles, or cluster departures.

Return JSON:
{
  "changes": [
    {
      "role": "string (e.g. CEO, CFO, Board Member)",
      "person": "string",
      "type": "appointment|departure|interim",
      "date": "string",
      "context": "string (brief context, e.g. voluntary retirement, strategic expansion)"
    }
  ],
  "leadership_stability": "stable|moderate_churn|high_churn",
  "red_flags": ["string"],
  "succession_risk": "none|low|medium|high",
  "confidence_per_section": { "change_extraction": 0.0, "stability_assessment": 0.0, "risk_evaluation": 0.0 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /accounting-red-flags
router.post('/accounting-red-flags', async (req: Request, res: Response) => {
  const { filing_text } = req.body;
  if (!filing_text) return res.status(400).json({ error: 'filing_text is required' });
  try {
    const raw = await callClaude(`You are a forensic accounting analyst specializing in fraud detection and accounting quality assessment. Analyze the following SEC filing for accounting irregularities, aggressive revenue recognition, unusual reserve adjustments, related-party transactions, and other red flags associated with financial statement manipulation.

Filing Text: "${String(filing_text).slice(0, 4000)}"

Identify all accounting red flags. For each flag, categorize it (revenue_recognition, expense_timing, reserves, related_party, auditor, or other), assess severity, describe the specific concern, and note any known precedents where similar practices led to restatements or enforcement actions. Assess the auditor's opinion type, the probability of future restatement, and an overall fraud risk score from 0 (no risk) to 100 (extreme risk).

Return JSON:
{
  "red_flags": [
    {
      "flag": "string (brief name of the flag)",
      "category": "revenue_recognition|expense_timing|reserves|related_party|auditor|other",
      "severity": "critical|high|medium|low",
      "description": "string",
      "precedent": "string (known precedent or 'none identified')"
    }
  ],
  "auditor_opinion": "clean|qualified|adverse|disclaimer",
  "restatement_risk": "low|medium|high",
  "fraud_risk_score": 0,
  "confidence_per_section": { "flag_detection": 0.0, "auditor_assessment": 0.0, "restatement_risk": 0.0, "fraud_scoring": 0.0 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /extract-guidance
router.post('/extract-guidance', async (req: Request, res: Response) => {
  const { filing_text, company } = req.body;
  if (!filing_text && !company) return res.status(400).json({ error: 'filing_text or company is required' });
  try {
    const input = filing_text || `${company} forward guidance management outlook`;
    const raw = await callClaude(`You are a senior equity research analyst specializing in extracting forward guidance from SEC filings and earnings materials. Extract all forward-looking statements, management outlook, and guidance signals.

Filing/Input: "${String(input).slice(0, 4000)}"

Extract every piece of forward guidance management has provided. Include revenue guidance, EPS guidance, margin targets, capex plans, and any qualitative demand commentary. Assess management tone. Flag any guidance cuts or raises versus prior periods.

Return JSON:
{
  "revenue_guidance": "string (e.g. $4.8-5.2B for FY2025, or 'not provided')",
  "eps_guidance": "string (e.g. $2.20-2.40 diluted, or 'not provided')",
  "margin_guidance": "string (e.g. Gross margin 41-43%, or 'not provided')",
  "capex_guidance": "string (e.g. $1.2-1.4B, or 'not provided')",
  "demand_commentary": ["string (key demand signals management mentioned)"],
  "management_tone": "bullish|cautious|neutral|bearish",
  "guidance_vs_prior": "raised|maintained|lowered|first_guidance|not_applicable",
  "key_risks_flagged": ["string (risks management explicitly called out)"],
  "forward_catalysts": ["string (opportunities management highlighted)"],
  "agent_summary": "string (2-3 sentence synthesis of guidance outlook)",
  "confidence_per_section": { "revenue_guidance": 0.0, "eps_guidance": 0.0, "management_tone": 0.0, "demand_commentary": 0.0 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { filing_text, company } = req.body;
  if (!filing_text && !company) return res.status(400).json({ error: 'filing_text or company is required' });
  try {
    const input = filing_text || company || '';
    const inputStr = String(input);
    const text_length = inputStr.length;
    const blocking_flags: string[] = [];

    if (text_length < 50) blocking_flags.push('input_too_short_for_meaningful_analysis');

    // Detect filing type heuristically
    let filing_type_detected = 'unknown';
    const lower = inputStr.toLowerCase();
    if (lower.includes('annual report') || lower.includes('form 10-k') || lower.includes('10-k')) filing_type_detected = '10-K';
    else if (lower.includes('10-q') || lower.includes('quarterly report')) filing_type_detected = '10-Q';
    else if (lower.includes('8-k') || lower.includes('current report')) filing_type_detected = '8-K';
    else if (lower.includes('s-1') || lower.includes('registration statement')) filing_type_detected = 'S-1';
    else if (lower.includes('proxy') || lower.includes('def 14a')) filing_type_detected = 'DEF 14A';
    else if (lower.includes('insider') || lower.includes('form 4')) filing_type_detected = 'Form 4';
    else if (text_length > 100) filing_type_detected = 'general_filing';

    // Recommend endpoint based on detected filing type
    let recommended_endpoint = '/sec-filing-intelligence/analyze';
    if (filing_type_detected === 'Form 4') recommended_endpoint = '/sec-filing-intelligence/insider-activity';
    else if (filing_type_detected === 'DEF 14A') recommended_endpoint = '/sec-filing-intelligence/management-changes';
    else if (filing_type_detected === '8-K') recommended_endpoint = '/sec-filing-intelligence/management-changes';

    res.json({
      execution_ready: blocking_flags.length === 0,
      filing_type_detected,
      text_length,
      recommended_endpoint,
      blocking_flags,
      recommended_next_api: 'risk-event-forecast',
      execution_priority: 'high',
      automation_safe: true,
      trace_id: traceId(),
      confidence_per_section: { filing_detection: filing_type_detected !== 'unknown' ? 0.85 : 0.4, readiness: blocking_flags.length === 0 ? 1.0 : 0.0 },
      privacy: { data_stored: false, retention: 'none' },
      computed_at: new Date().toISOString()
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /analyze (ONE-CALL full analysis)
router.post('/analyze', async (req: Request, res: Response) => {
  const { filing_text } = req.body;
  if (!filing_text) return res.status(400).json({ error: 'filing_text is required' });
  try {
    const raw = await callClaude(`You are a senior investment analyst with expertise in SEC filings, forensic accounting, and equity research. Perform a comprehensive one-call analysis of the following SEC filing covering all critical dimensions: financial metrics, risk factors, insider activity indicators, liquidity health, accounting quality, management stability, and an overall investment signal.

Filing Text: "${String(filing_text).slice(0, 4000)}"

Provide a thorough, integrated analysis that connects all dimensions. The investment_signal should be based on the totality of findings. The agent_summary should be a professional 3-4 sentence synthesis suitable for a portfolio manager briefing.

Return JSON:
{
  "metrics": {
    "revenue": "string",
    "eps": "string",
    "gross_margin": "string",
    "operating_margin": "string",
    "net_margin": "string",
    "yoy_revenue_growth": "string",
    "yoy_eps_growth": "string"
  },
  "top_risks": ["string"],
  "insider_sentiment": "bullish|bearish|neutral|insufficient_data",
  "liquidity_score": 0,
  "accounting_flags": ["string"],
  "management_stability": "stable|moderate_churn|high_churn|insufficient_data",
  "investment_signal": "strong_buy|buy|hold|sell|strong_sell",
  "agent_summary": "string",
  "confidence_per_section": { "metrics": 0.0, "risks": 0.0, "insider": 0.0, "liquidity": 0.0, "accounting": 0.0, "management": 0.0, "signal": 0.0 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Governance + Workflow
const eventStore: Record<string, any[]> = {};
const REQUIRED_SCOPES = ['filing:read', 'filing:analyze', 'filing:compare'];
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
  const defaultSteps = ['fetch_filing', 'extract_metrics', 'analyze_risks', 'compare_periods', 'generate_signals'];
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
