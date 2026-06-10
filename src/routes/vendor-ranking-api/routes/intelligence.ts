import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';
import { buildRuntime } from '../../../shared/ai';

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

function traceId() { return `vnd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Vendor Ranking API', info: '/vendor-ranking/info', openapi: '/vendor-ranking/openapi.json', health: 'ok' });
});

// POST /rank-vendors
router.post('/rank-vendors', async (req: Request, res: Response) => {
  const { vendors, criteria, use_case, budget } = req.body;
  if (!vendors) return res.status(400).json({ error: 'vendors is required' });
  try {
    const vendorsStr = typeof vendors === 'string' ? vendors : JSON.stringify(vendors).slice(0, 4000);
    const criteriaList = criteria ? (Array.isArray(criteria) ? criteria.join(', ') : criteria) : 'pricing, reviews, reliability, features, support, integrations, geographic_fit, risk';
    const raw = await callClaude(`Rank these vendors based on the specified criteria for this use case.

Use case: "${use_case || 'general'}", Budget: "${budget || 'not specified'}"
Criteria: ${criteriaList}
Vendors: ${vendorsStr.slice(0, 4000)}

Return JSON:
{
  "rankings": [{ "rank": number, "vendor": "string", "overall_score": 0-100, "scores": { "pricing": 0-100, "reviews": 0-100, "reliability": 0-100, "features": 0-100, "support": 0-100, "integrations": 0-100, "geographic_fit": 0-100, "risk": 0-100 }, "pros": ["string"], "cons": ["string"], "best_for": "string", "avoid_if": "string" }],
  "top_pick": "string",
  "runner_up": "string",
  "best_value": "string",
  "ranking_rationale": "string",
  "confidence_per_section": { "rankings": 0-1, "top_pick": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /score-vendor
router.post('/score-vendor', async (req: Request, res: Response) => {
  const { vendor, vendor_data, use_case, criteria } = req.body;
  if (!vendor) return res.status(400).json({ error: 'vendor is required' });
  try {
    const dataStr = vendor_data ? (typeof vendor_data === 'string' ? vendor_data : JSON.stringify(vendor_data).slice(0, 3000)) : 'analyze from vendor name and context';
    const criteriaList = criteria ? (Array.isArray(criteria) ? criteria.join(', ') : criteria) : 'pricing, reliability, support, features, integrations, risk';
    const raw = await callClaude(`Score this vendor comprehensively across all dimensions.

Vendor: "${vendor}", Use case: "${use_case || 'general'}"
Criteria: ${criteriaList}
Vendor data: "${dataStr.slice(0, 3000)}"

Return JSON:
{
  "vendor": "string",
  "overall_score": 0-100,
  "grade": "A+|A|A-|B+|B|B-|C|D|F",
  "scores": { "pricing": 0-100, "reliability": 0-100, "support": 0-100, "features": 0-100, "integrations": 0-100, "geographic_fit": 0-100, "security": 0-100, "scalability": 0-100 },
  "strengths": ["string"],
  "weaknesses": ["string"],
  "red_flags": ["string"],
  "green_flags": ["string"],
  "recommended_tier": "enterprise|mid-market|smb|startup",
  "price_range": "string",
  "confidence_per_section": { "overall_score": 0-1, "scores": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /compare-vendors
router.post('/compare-vendors', async (req: Request, res: Response) => {
  const { vendor_a, vendor_b, use_case, criteria } = req.body;
  if (!vendor_a || !vendor_b) return res.status(400).json({ error: 'vendor_a and vendor_b are required' });
  try {
    const criteriaList = criteria ? (Array.isArray(criteria) ? criteria.join(', ') : criteria) : 'pricing, features, reliability, support, integrations';
    const raw = await callClaude(`Head-to-head comparison of two vendors for a specific use case.

Vendor A: "${typeof vendor_a === 'string' ? vendor_a : JSON.stringify(vendor_a).slice(0, 1500)}"
Vendor B: "${typeof vendor_b === 'string' ? vendor_b : JSON.stringify(vendor_b).slice(0, 1500)}"
Use case: "${use_case || 'general'}", Criteria: ${criteriaList}

Return JSON:
{
  "winner": "string",
  "verdict": "clear_winner|slight_edge|too_close|depends_on_use_case",
  "comparison": [{ "criterion": "string", "vendor_a_score": 0-100, "vendor_b_score": 0-100, "winner": "string", "notes": "string" }],
  "vendor_a_wins_on": ["string"],
  "vendor_b_wins_on": ["string"],
  "choose_vendor_a_if": ["string"],
  "choose_vendor_b_if": ["string"],
  "price_difference": "string",
  "migration_complexity": "easy|moderate|hard",
  "confidence_per_section": { "winner": 0-1, "comparison": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /check-reviews
router.post('/check-reviews', async (req: Request, res: Response) => {
  const { vendor, reviews } = req.body;
  if (!vendor) return res.status(400).json({ error: 'vendor is required' });
  try {
    const reviewsStr = reviews ? (typeof reviews === 'string' ? reviews : JSON.stringify(reviews).slice(0, 4000)) : `analyze known reviews for ${vendor}`;
    const raw = await callClaude(`Analyze vendor reviews for signal extraction and trust scoring.

Vendor: "${vendor}"
Reviews (first 4000 chars): "${reviewsStr.slice(0, 4000)}"

Return JSON:
{
  "vendor": "string",
  "avg_rating": 0-5,
  "review_count_estimate": number,
  "sentiment": "very_positive|positive|neutral|negative|very_negative",
  "trust_score": 0-100,
  "top_praise": ["string"],
  "top_complaints": ["string"],
  "red_flags_from_reviews": ["string"],
  "fake_review_risk": "high|medium|low",
  "review_authenticity_score": 0-100,
  "recency_bias": "recent_worse|consistent|recent_better",
  "recommended_sources": ["string"],
  "confidence_per_section": { "trust_score": 0-1, "fake_review_risk": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /assess-risk
router.post('/assess-risk', async (req: Request, res: Response) => {
  const { vendor, vendor_data } = req.body;
  if (!vendor) return res.status(400).json({ error: 'vendor is required' });
  try {
    const dataStr = vendor_data ? (typeof vendor_data === 'string' ? vendor_data : JSON.stringify(vendor_data).slice(0, 3000)) : `assess risk for ${vendor} from known information`;
    const raw = await callClaude(`Assess vendor risk across operational, financial, legal, and strategic dimensions.

Vendor: "${vendor}"
Vendor data: "${dataStr.slice(0, 3000)}"

Return JSON:
{
  "vendor": "string",
  "overall_risk": "critical|high|medium|low|minimal",
  "risk_score": 0-100,
  "risks": [{ "risk": "string", "category": "financial|operational|legal|strategic|security|compliance|concentration", "severity": "critical|high|medium|low", "likelihood": "high|medium|low", "mitigation": "string" }],
  "vendor_stability": "stable|uncertain|at_risk",
  "single_vendor_dependency_risk": "high|medium|low",
  "data_security_risk": "high|medium|low",
  "compliance_risk": "high|medium|low",
  "exit_complexity": "easy|moderate|hard|locked_in",
  "red_flags": ["string"],
  "due_diligence_items": ["string"],
  "confidence_per_section": { "overall_risk": 0-1, "risks": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /match-requirements
router.post('/match-requirements', async (req: Request, res: Response) => {
  const { vendors, requirements } = req.body;
  if (!vendors || !requirements) return res.status(400).json({ error: 'vendors and requirements are required' });
  try {
    const vendorsStr = typeof vendors === 'string' ? vendors : JSON.stringify(vendors).slice(0, 3000);
    const reqStr = typeof requirements === 'string' ? requirements : JSON.stringify(requirements).slice(0, 2000);
    const raw = await callClaude(`Match vendors against specific requirements and score fit.

Requirements: "${reqStr.slice(0, 2000)}"
Vendors: ${vendorsStr.slice(0, 3000)}

Return JSON:
{
  "matches": [{ "vendor": "string", "fit_score": 0-100, "requirements_met": ["string"], "requirements_missing": ["string"], "partial_requirements": ["string"], "recommendation": "strong_fit|good_fit|partial_fit|poor_fit" }],
  "best_match": "string",
  "no_perfect_match": true|false,
  "gap_analysis": "string",
  "custom_requirements_feasibility": "high|medium|low",
  "confidence_per_section": { "matches": 0-1, "best_match": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /due-diligence
router.post('/due-diligence', async (req: Request, res: Response) => {
  const { vendor, vendor_data, use_case } = req.body;
  if (!vendor) return res.status(400).json({ error: 'vendor is required' });
  try {
    const dataStr = vendor_data ? (typeof vendor_data === 'string' ? vendor_data : JSON.stringify(vendor_data).slice(0, 3000)) : `perform due diligence on ${vendor}`;
    const raw = await callClaude(`Comprehensive vendor due diligence report.

Vendor: "${vendor}", Use case: "${use_case || 'general'}"
Vendor data: "${dataStr.slice(0, 3000)}"

Return JSON:
{
  "vendor": "string",
  "due_diligence_score": 0-100,
  "recommendation": "proceed|proceed_with_caution|negotiate|avoid",
  "financial_health": { "assessment": "string", "score": 0-100, "concerns": ["string"] },
  "product_quality": { "assessment": "string", "score": 0-100, "concerns": ["string"] },
  "support_quality": { "assessment": "string", "score": 0-100, "concerns": ["string"] },
  "contract_risks": ["string"],
  "pricing_transparency": "high|medium|low",
  "sla_strength": "strong|adequate|weak|unknown",
  "reference_check_recommended": true|false,
  "pilot_recommended": true|false,
  "negotiation_leverage": ["string"],
  "deal_breakers": ["string"],
  "confidence_per_section": { "due_diligence_score": 0-1, "recommendation": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { vendors, vendor } = req.body;
  const hasInput = vendors || vendor;
  if (!hasInput) return res.status(400).json({ error: 'vendors or vendor is required' });
  const vendorCount = Array.isArray(vendors) ? vendors.length : vendors ? 1 : vendor ? 1 : 0;
  res.json({
    execution_ready: vendorCount > 0,
    vendor_count: vendorCount,
    recommended_endpoint: vendorCount > 2 ? '/rank-vendors' : vendorCount === 2 ? '/compare-vendors' : '/score-vendor',
    next_api: 'deep-research',
    next_endpoint: '/research',
    blocking_flags: vendorCount === 0 ? ['NO_VENDORS'] : [],
    flag_definitions: { NO_VENDORS: 'No vendors provided — cannot evaluate empty input' },
    trace_id: traceId(),
    confidence_per_section: { execution_ready: 0.95 },
    privacy: { data_stored: false, retention: 'none' },
    computed_at: new Date().toISOString(),
  });
});

// POST /evaluate (ONE-CALL)
router.post('/evaluate', async (req: Request, res: Response) => {
  const { vendors, use_case, requirements, budget, criteria } = req.body;
  if (!vendors) return res.status(400).json({ error: 'vendors is required' });
  try {
    const vendorsStr = typeof vendors === 'string' ? vendors : JSON.stringify(vendors).slice(0, 4000);
    const criteriaList = criteria ? (Array.isArray(criteria) ? criteria.join(', ') : criteria) : 'pricing, reliability, reviews, features, support, risk, integrations, geographic_fit';
    const raw = await callClaude(`ONE-CALL full vendor evaluation. Rank vendors, score each, assess risk, check review signals, and generate procurement recommendation.

Use case: "${use_case || 'general'}", Budget: "${budget || 'not specified'}"
Requirements: "${requirements ? (typeof requirements === 'string' ? requirements : JSON.stringify(requirements).slice(0, 1000)) : 'not specified'}"
Criteria: ${criteriaList}
Vendors: ${vendorsStr.slice(0, 4000)}

Return JSON:
{
  "top_pick": "string",
  "runner_up": "string",
  "avoid": ["string"],
  "rankings": [{ "rank": number, "vendor": "string", "overall_score": 0-100, "grade": "A+|A|B|C|D|F", "pros": ["string"], "cons": ["string"], "risk_level": "low|medium|high" }],
  "procurement_recommendation": "string",
  "negotiation_tips": ["string"],
  "red_flags": ["string"],
  "total_cost_of_ownership_note": "string",
  "pilot_suggestion": "string",
  "one_line_summary": "string",
  "confidence_per_section": { "rankings": 0-1, "top_pick": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Governance + Workflow ─────────────────────────────────────────────────────
const eventStore: Record<string, any[]> = {};
const REQUIRED_SCOPES = ['vendor:read', 'vendor:analyze', 'vendor:rank'];
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
  const defaultSteps = ['collect_vendor_data', 'score_vendors', 'assess_risks', 'check_reviews', 'rank_and_recommend'];
  workflowStore[id] = { workflow_id: id, goal: goal || 'evaluate vendors', steps: steps || defaultSteps, step_index: 0, status: 'running', created_at: new Date().toISOString() };
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
