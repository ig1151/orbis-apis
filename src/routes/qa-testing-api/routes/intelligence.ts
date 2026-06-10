import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';
import { buildRuntime } from '../../../shared/ai';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';

function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return `qa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

// GET / discovery
router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'QA Testing API', info: '/qa-testing/info', openapi: '/qa-testing/openapi.json', health: 'ok' });
});

// POST /test-workflow
router.post('/test-workflow', async (req: Request, res: Response) => {
  const { workflow_description, steps_text } = req.body;
  if (!workflow_description && !steps_text) return res.status(400).json({ error: 'workflow_description or steps_text is required' });
  try {
    const input = (workflow_description || steps_text).slice(0, 4000);
    const raw = await callClaude(`Generate a comprehensive test plan for this workflow or process.

Workflow: "${input}"

Return JSON:
{
  "test_cases": [{ "test_id": "string", "step": "string", "input": "string", "expected_output": "string", "edge_case": true|false, "priority": "high|medium|low" }],
  "coverage_assessment": "complete|partial|minimal",
  "missing_test_areas": ["string"],
  "recommended_test_count": number,
  "confidence_per_section": { "test_cases": 0-1, "coverage_assessment": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /detect-regression
router.post('/detect-regression', async (req: Request, res: Response) => {
  const { baseline_output, current_output } = req.body;
  if (!baseline_output || !current_output) return res.status(400).json({ error: 'baseline_output and current_output are required' });
  try {
    const baselineStr = typeof baseline_output === 'string' ? baseline_output.slice(0, 2000) : JSON.stringify(baseline_output).slice(0, 2000);
    const currentStr = typeof current_output === 'string' ? current_output.slice(0, 2000) : JSON.stringify(current_output).slice(0, 2000);
    const raw = await callClaude(`Detect regressions by comparing baseline and current outputs.

Baseline output: "${baselineStr}"
Current output: "${currentStr}"

Return JSON:
{
  "regression_detected": true|false,
  "regression_severity": "critical|major|minor|none",
  "changed_fields": [{ "field": "string", "baseline_value": "string", "current_value": "string", "change_type": "added|removed|modified" }],
  "breaking_changes": ["string"],
  "confidence_score": 0-1,
  "root_cause_hypothesis": "string",
  "confidence_per_section": { "regression_detected": 0-1, "changed_fields": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /test-api-chain
router.post('/test-api-chain', async (req: Request, res: Response) => {
  const { api_chain } = req.body;
  if (!api_chain) return res.status(400).json({ error: 'api_chain is required' });
  try {
    const chainStr = typeof api_chain === 'string' ? api_chain.slice(0, 3000) : JSON.stringify(api_chain).slice(0, 3000);
    const raw = await callClaude(`Analyze this API chain for validity, data flow issues, and contract violations.

API chain: "${chainStr}"

Return JSON:
{
  "chain_valid": true|false,
  "broken_links": [{ "step": "string", "issue": "string", "severity": "string" }],
  "data_flow_issues": ["string"],
  "contract_violations": ["string"],
  "recommended_fixes": ["string"],
  "chain_health_score": 0-100,
  "confidence_per_section": { "chain_valid": 0-1, "broken_links": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /validate-output
router.post('/validate-output', async (req: Request, res: Response) => {
  const { output, schema_or_expectations } = req.body;
  if (!output || !schema_or_expectations) return res.status(400).json({ error: 'output and schema_or_expectations are required' });
  try {
    const outputStr = typeof output === 'string' ? output.slice(0, 2000) : JSON.stringify(output).slice(0, 2000);
    const schemaStr = typeof schema_or_expectations === 'string' ? schema_or_expectations.slice(0, 2000) : JSON.stringify(schema_or_expectations).slice(0, 2000);
    const raw = await callClaude(`Validate this AI or API output against the given schema or expectations.

Output to validate: "${outputStr}"
Schema/Expectations: "${schemaStr}"

Return JSON:
{
  "valid": true|false,
  "validation_score": 0-100,
  "violations": [{ "field": "string", "rule": "string", "actual_value": "string", "expected": "string" }],
  "hallucination_signals": ["string"],
  "completeness_score": 0-100,
  "accuracy_signals": ["string"],
  "recommended_corrections": ["string"],
  "confidence_per_section": { "valid": 0-1, "violations": 0-1, "hallucination_signals": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /generate-test-cases
router.post('/generate-test-cases', async (req: Request, res: Response) => {
  const { endpoint_spec, function_description, test_type } = req.body;
  if ((!endpoint_spec && !function_description) || !test_type) return res.status(400).json({ error: 'endpoint_spec or function_description, and test_type are required' });
  try {
    const specStr = (endpoint_spec || function_description).slice(0, 3000);
    const raw = await callClaude(`Generate test cases for this endpoint or function.

Spec/Description: "${specStr}"
Test type: "${test_type}" (unit|integration|edge_case|load|security)

Return JSON:
{
  "test_cases": [{ "name": "string", "description": "string", "input": "string", "expected": "string", "assertion_logic": "string", "category": "string" }],
  "edge_cases": ["string"],
  "boundary_tests": ["string"],
  "negative_tests": ["string"],
  "estimated_coverage_pct": number,
  "confidence_per_section": { "test_cases": 0-1, "edge_cases": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /run-suite
router.post('/run-suite', async (req: Request, res: Response) => {
  const { test_suite } = req.body;
  if (!test_suite) return res.status(400).json({ error: 'test_suite is required' });
  try {
    const suiteStr = typeof test_suite === 'string' ? test_suite.slice(0, 3000) : JSON.stringify(test_suite).slice(0, 3000);
    const raw = await callClaude(`Analyze and score this test suite execution results.

Test suite with results: "${suiteStr}"

Return JSON:
{
  "passed": number,
  "failed": number,
  "skipped": number,
  "pass_rate_pct": number,
  "failures": [{ "test_name": "string", "actual": "string", "expected": "string", "diff": "string" }],
  "critical_failures": ["string"],
  "time_estimate_ms": number,
  "grade": "A|B|C|D|F",
  "confidence_per_section": { "pass_rate_pct": 0-1, "failures": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { workflow_description, test_suite } = req.body;
  if (!workflow_description && !test_suite) return res.status(400).json({ error: 'workflow_description or test_suite is required' });
  const hasWorkflow = !!workflow_description;
  const testCountEstimate = test_suite
    ? (Array.isArray(test_suite) ? test_suite.length : Math.ceil((test_suite.length || 0) / 200))
    : 0;
  res.json({
    execution_ready: true,
    test_count_estimate: testCountEstimate,
    recommended_endpoint: hasWorkflow ? '/test-workflow' : '/run-suite',
    blocking_flags: [],
    recommended_next_api: 'knowledge-graph',
    execution_priority: 'low',
    automation_safe: true,
    trace_id: traceId(),
    confidence_per_section: { execution_ready: 0.95 },
    privacy: { data_stored: false, retention: 'none' },
    computed_at: new Date().toISOString(),
  });
});

// POST /test (one-call workflow)
router.post('/test', async (req: Request, res: Response) => {
  const { spec_or_workflow } = req.body;
  if (!spec_or_workflow) return res.status(400).json({ error: 'spec_or_workflow is required' });
  try {
    const inputStr = typeof spec_or_workflow === 'string' ? spec_or_workflow.slice(0, 4000) : JSON.stringify(spec_or_workflow).slice(0, 4000);
    const raw = await callClaude(`ONE-CALL QA testing. Generate test cases, identify regression risks, validate coverage, and grade the specification.

Spec/Workflow: "${inputStr}"

Return JSON:
{
  "test_cases": [{ "test_id": "string", "step": "string", "input": "string", "expected_output": "string", "priority": "high|medium|low" }],
  "regression_risks": ["string"],
  "validation_score": 0-100,
  "coverage_estimate_pct": number,
  "critical_gaps": ["string"],
  "qa_grade": "A|B|C|D|F",
  "recommended_actions": ["string"],
  "confidence_per_section": { "test_cases": 0-1, "validation_score": 0-1, "critical_gaps": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Governance + Workflow ─────────────────────────────────────────────────────
const eventStore: Record<string, any[]> = {};
const REQUIRED_SCOPES = ['qa:read', 'qa:test', 'qa:validate'];
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
router.post('/workflow/start', (req: any, res: any) => { const { goal, steps } = req.body || {}; const id = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; workflowStore[id] = { workflow_id: id, goal: goal || 'default goal', steps: steps || ['analyze_spec', 'generate_tests', 'run_validations', 'detect_regressions', 'generate_report'], step_index: 0, status: 'running', created_at: new Date().toISOString() }; const wf = workflowStore[id]; res.json({ ...buildRuntime(req, { workflow_state: 'running' }), success: true, workflow_id: id, status: wf.status, current_step: wf.steps[0], steps: wf.steps, computed_at: new Date().toISOString() }); });
router.get('/workflow/:id', (req: any, res: any) => { const wf = workflowStore[req.params.id]; if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' }); res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true, ...wf, computed_at: new Date().toISOString() }); });
router.post('/workflow/:id/resume', (req: any, res: any) => { const wf = workflowStore[req.params.id]; if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' }); if (wf.step_index < wf.steps.length - 1) { wf.step_index++; wf.status = wf.step_index === wf.steps.length - 1 ? 'complete' : 'running'; } else { wf.status = 'complete'; } wf.updated_at = new Date().toISOString(); res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true, workflow_id: wf.workflow_id, status: wf.status, current_step: wf.steps[wf.step_index], computed_at: new Date().toISOString() }); });
router.get('/workflow/:id/state', (req: any, res: any) => { const wf = workflowStore[req.params.id]; if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' }); res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true, workflow_id: wf.workflow_id, state_machine: { current_state: wf.steps[wf.step_index], terminal: wf.status === 'complete', transitions: wf.steps.map((s: string, i: number) => ({ step: i + 1, state: s, status: i < wf.step_index ? 'complete' : i === wf.step_index ? 'active' : 'pending' })) }, computed_at: new Date().toISOString() }); });
export default router;
