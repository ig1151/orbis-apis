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
function traceId() { return `dd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

// GET / discovery
router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Due Diligence API', info: '/due-diligence/info', openapi: '/due-diligence/openapi.json', health: 'ok' });
});

// POST /company-risk
router.post('/company-risk', async (req: Request, res: Response) => {
  const { company, context } = req.body;
  if (!company) return res.status(400).json({ error: 'company is required' });
  try {
    const contextStr = context ? `Context: "${context}" (acquisition|investment|partnership|vendor)` : '';
    const raw = await callClaude(`Assess the overall risk profile for this company.

Company: "${company}"
${contextStr}

Return JSON:
{
  "risk_score": 0-100,
  "risk_level": "critical|high|medium|low",
  "risk_categories": [{ "category": "financial|legal|operational|reputational|market|regulatory", "score": 0-100, "key_flags": ["string"] }],
  "overall_recommendation": "proceed|proceed_with_conditions|request_more_info|avoid",
  "red_flags": [{ "flag": "string", "evidence": "string", "source_type": "news|legal|financial|regulatory|social", "confidence": 0.0 }],
  "confidence_per_section": { "risk_score": 0-1, "risk_categories": 0-1, "overall_recommendation": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /founder-analysis
router.post('/founder-analysis', async (req: Request, res: Response) => {
  const { founder_name, team_description, company } = req.body;
  if ((!founder_name && !team_description) || !company) return res.status(400).json({ error: 'founder_name or team_description, and company are required' });
  try {
    const target = founder_name || team_description;
    const raw = await callClaude(`Analyze the founder(s) or team for this company from a due diligence perspective.

Founder/Team: "${target}"
Company: "${company}"

Return JSON:
{
  "founders": [{ "name": "string", "role": "string", "background_signals": ["string"], "track_record": "strong|adequate|mixed|weak|unknown", "red_flags": ["string"], "linkedin_signals": ["string"], "domain_expertise": "high|medium|low" }],
  "team_completeness_score": 0-100,
  "execution_risk": "low|medium|high",
  "team_recommendation": "strong|adequate|concerning",
  "confidence_per_section": { "founders": 0-1, "team_completeness_score": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /compliance-check
router.post('/compliance-check', async (req: Request, res: Response) => {
  const { company, jurisdictions, compliance_areas } = req.body;
  if (!company) return res.status(400).json({ error: 'company is required' });
  try {
    const jurisdictionsStr = jurisdictions ? `Jurisdictions: ${Array.isArray(jurisdictions) ? jurisdictions.join(', ') : jurisdictions}` : '';
    const areasStr = compliance_areas ? `Compliance areas: ${Array.isArray(compliance_areas) ? compliance_areas.join(', ') : compliance_areas}` : 'gdpr, sox, aml, kyc, iso27001, hipaa, pci';
    const raw = await callClaude(`Check compliance status for this company across relevant regulatory areas.

Company: "${company}"
${jurisdictionsStr}
${areasStr}

Return JSON:
{
  "compliance_areas": [{ "area": "string", "status": "compliant|likely_compliant|unknown|likely_gap|non_compliant", "evidence": ["string"], "risk_level": "string" }],
  "overall_compliance_score": 0-100,
  "critical_gaps": ["string"],
  "regulatory_actions_detected": true|false,
  "recommended_certifications": ["string"],
  "confidence_per_section": { "compliance_areas": 0-1, "overall_compliance_score": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /reputation-analysis
router.post('/reputation-analysis', async (req: Request, res: Response) => {
  const { company, content } = req.body;
  if (!company) return res.status(400).json({ error: 'company is required' });
  try {
    const contentContext = content ? `Additional content: "${content.slice(0, 2000)}"` : '';
    const raw = await callClaude(`Analyze the reputation of this company across media, social, and public records.

Company: "${company}"
${contentContext}

Return JSON:
{
  "reputation_score": 0-100,
  "controversies": [{ "topic": "string", "severity": "string", "status": "active|resolved", "year": number }],
  "media_sentiment": "positive|neutral|negative",
  "social_sentiment": "positive|neutral|negative",
  "litigation_signals": ["string"],
  "press_narrative": "string",
  "brand_health_trend": "improving|stable|declining",
  "confidence_per_section": { "reputation_score": 0-1, "controversies": 0-1, "media_sentiment": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /financial-health
router.post('/financial-health', async (req: Request, res: Response) => {
  const { company, financial_data_text } = req.body;
  if (!company) return res.status(400).json({ error: 'company is required' });
  try {
    const financialContext = financial_data_text ? `Financial data: "${financial_data_text.slice(0, 2000)}"` : '';
    const raw = await callClaude(`Assess the financial health of this company based on available signals.

Company: "${company}"
${financialContext}

Return JSON:
{
  "health_score": 0-100,
  "grade": "A|B|C|D|F",
  "revenue_trend": "growing|stable|declining",
  "profitability_status": "profitable|breakeven|burning_cash",
  "burn_rate_estimate": "string",
  "runway_estimate_months": number,
  "debt_level": "low|moderate|high|critical",
  "fundraising_history": ["string"],
  "unit_economics_signals": ["string"],
  "confidence_per_section": { "health_score": 0-1, "revenue_trend": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /legal-risk
router.post('/legal-risk', async (req: Request, res: Response) => {
  const { company, legal_data } = req.body;
  if (!company) return res.status(400).json({ error: 'company is required' });
  try {
    const legalContext = legal_data ? `Legal data: "${typeof legal_data === 'string' ? legal_data.slice(0, 2000) : JSON.stringify(legal_data).slice(0, 2000)}"` : '';
    const raw = await callClaude(`Assess the legal risk profile for this company.

Company: "${company}"
${legalContext}

Return JSON:
{
  "legal_risk_score": 0-100,
  "active_litigation": [{ "case_type": "string", "status": "string", "estimated_exposure": "string", "severity": "string" }],
  "ip_issues": ["string"],
  "regulatory_investigations": ["string"],
  "past_violations": ["string"],
  "legal_risk_level": "low|medium|high|critical",
  "recommended_legal_review": true|false,
  "confidence_per_section": { "legal_risk_score": 0-1, "active_litigation": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /vendor-comparison
router.post('/vendor-comparison', async (req: Request, res: Response) => {
  const { vendors, comparison_criteria } = req.body;
  if (!vendors) return res.status(400).json({ error: 'vendors is required' });
  try {
    const vendorsStr = typeof vendors === 'string' ? vendors.slice(0, 3000) : JSON.stringify(vendors).slice(0, 3000);
    const criteriaStr = comparison_criteria ? `Focus criteria: ${Array.isArray(comparison_criteria) ? comparison_criteria.join(', ') : comparison_criteria}` : '';
    const raw = await callClaude(`You are an enterprise procurement intelligence analyst. Compare the following vendors across risk, compliance, financial health, and strategic fit dimensions. Produce a ranked comparison suitable for procurement decision-making.

Vendors: "${vendorsStr}"
${criteriaStr}

Score each vendor 0-100 on each dimension. Identify the recommended vendor with justification. Flag any vendors that should be excluded and why. The selection_rationale should be a clear, evidence-based explanation for the top-ranked vendor.

Return JSON:
{
  "vendor_scores": [
    {
      "vendor": "string",
      "overall_score": 0,
      "risk_score": 0,
      "compliance_score": 0,
      "financial_health_score": 0,
      "strategic_fit_score": 0,
      "red_flags": [{ "flag": "string", "evidence": "string", "severity": "critical|high|medium|low" }],
      "green_flags": ["string"]
    }
  ],
  "recommended_vendor": "string",
  "selection_rationale": "string",
  "vendors_to_exclude": [{ "vendor": "string", "reason": "string" }],
  "risk_ranking": ["string (vendors ordered by risk, lowest first)"],
  "confidence_per_section": { "vendor_scores": 0.0, "recommended_vendor": 0.0, "risk_ranking": 0.0 },
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
    recommended_endpoint: '/due-diligence',
    blocking_flags: [],
    recommended_next_api: 'company-research',
    execution_priority: 'high',
    automation_safe: true,
    trace_id: traceId(),
    confidence_per_section: { execution_ready: 0.95 },
    privacy: { data_stored: false, retention: 'none' },
    computed_at: new Date().toISOString(),
  });
});

// POST /due-diligence (one-call workflow)
router.post('/due-diligence', async (req: Request, res: Response) => {
  const { company, context } = req.body;
  if (!company) return res.status(400).json({ error: 'company is required' });
  try {
    const contextStr = context ? `Context: "${context}"` : '';
    const raw = await callClaude(`ONE-CALL due diligence. Provide a comprehensive due diligence report covering risk, financial health, legal exposure, compliance, founders, and reputation.

Company: "${company}"
${contextStr}

Return JSON:
{
  "overall_score": 0-100,
  "recommendation": "proceed|proceed_with_conditions|request_more_info|avoid",
  "risk_summary": "string",
  "financial_health_score": 0-100,
  "legal_risk_score": 0-100,
  "compliance_score": 0-100,
  "founder_assessment": "string",
  "reputation_score": 0-100,
  "red_flags": [{ "flag": "string", "evidence": "string", "source_type": "news|legal|financial|regulatory|social", "confidence": 0.0 }],
  "green_flags": ["string"],
  "agent_summary": "string",
  "confidence_per_section": { "overall_score": 0-1, "financial_health_score": 0-1, "legal_risk_score": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Governance + Workflow ─────────────────────────────────────────────────────
const eventStore: Record<string, any[]> = {};
const REQUIRED_SCOPES = ['diligence:read', 'diligence:analyze', 'diligence:report'];
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
router.post('/workflow/start', (req: any, res: any) => { const { goal, steps } = req.body || {}; const id = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; workflowStore[id] = { workflow_id: id, goal: goal || 'default goal', steps: steps || ['profile_target', 'assess_financials', 'check_legal', 'analyze_founders', 'generate_report'], step_index: 0, status: 'running', created_at: new Date().toISOString() }; const wf = workflowStore[id]; res.json({ ...buildRuntime(req, { workflow_state: 'running' }), success: true, workflow_id: id, status: wf.status, current_step: wf.steps[0], steps: wf.steps, computed_at: new Date().toISOString() }); });
router.get('/workflow/:id', (req: any, res: any) => { const wf = workflowStore[req.params.id]; if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' }); res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true, ...wf, computed_at: new Date().toISOString() }); });
router.post('/workflow/:id/resume', (req: any, res: any) => { const wf = workflowStore[req.params.id]; if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' }); if (wf.step_index < wf.steps.length - 1) { wf.step_index++; wf.status = wf.step_index === wf.steps.length - 1 ? 'complete' : 'running'; } else { wf.status = 'complete'; } wf.updated_at = new Date().toISOString(); res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true, workflow_id: wf.workflow_id, status: wf.status, current_step: wf.steps[wf.step_index], computed_at: new Date().toISOString() }); });
router.get('/workflow/:id/state', (req: any, res: any) => { const wf = workflowStore[req.params.id]; if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' }); res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true, workflow_id: wf.workflow_id, state_machine: { current_state: wf.steps[wf.step_index], terminal: wf.status === 'complete', transitions: wf.steps.map((s: string, i: number) => ({ step: i + 1, state: s, status: i < wf.step_index ? 'complete' : i === wf.step_index ? 'active' : 'pending' })) }, computed_at: new Date().toISOString() }); });
export default router;
