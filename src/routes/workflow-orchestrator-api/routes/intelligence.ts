import { Router, Request, Response } from 'express';
import axios from 'axios';

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

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Workflow Orchestrator API', info: '/workflow-orchestrator/info', openapi: '/workflow-orchestrator/openapi.json', health: 'ok' });
});

router.post('/build-workflow', async (req: Request, res: Response) => {
  const { goal, available_apis = [], constraints, context, max_steps } = req.body;
  if (!goal) return res.status(400).json({ error: 'goal is required' });
  try {
    const raw = await callClaude(`Build a multi-step agent workflow from this goal. Goal: "${goal}" Available APIs: ${JSON.stringify(available_apis)} Constraints: ${JSON.stringify(constraints || {})} Context: "${context || 'none'}" Max steps: ${max_steps || 'unlimited'}

Return concise JSON:
{
  "workflow_id": "string",
  "goal": "string",
  "steps": [{ "step_number": number, "api": "string", "endpoint": "string", "purpose": "string", "inputs_from_prev": ["string"], "outputs_to_next": ["string"], "estimated_cost": number, "estimated_ms": number }],
  "total_steps": number,
  "estimated_total_cost": number,
  "estimated_total_ms": number,
  "parallel_opportunities": [{ "steps": [number], "reason": "string" }],
  "critical_path": [number],
  "fallback_strategies": [{ "step": number, "fallback": "string" }],
  "confidence_per_section": { "steps": 0-1, "cost_estimate": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execute-workflow', async (req: Request, res: Response) => {
  const { workflow_id, steps, dry_run } = req.body;
  if (!workflow_id) return res.status(400).json({ error: 'workflow_id is required' });
  if (!steps) return res.status(400).json({ error: 'steps is required' });
  try {
    const raw = await callClaude(`Execute a multi-step workflow with result tracking. Workflow ID: "${workflow_id}" Dry run: ${dry_run || false}

Steps: ${JSON.stringify(steps)}

Return concise JSON:
{
  "workflow_id": "string",
  "execution_id": "string",
  "dry_run": true|false,
  "status": "completed|partial|failed",
  "steps_executed": number,
  "steps_total": number,
  "results": [{ "step_number": number, "api": "string", "status": "success|failed|skipped", "output_summary": "string", "error": "string" }],
  "overall_output": {},
  "execution_time_ms": number,
  "total_cost": number,
  "next_steps": ["string"],
  "confidence_per_section": { "results": 0-1, "overall_output": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/retry-failed-step', async (req: Request, res: Response) => {
  const { workflow_id, execution_id, failed_step, error_message, attempt_number, max_attempts } = req.body;
  if (!workflow_id) return res.status(400).json({ error: 'workflow_id is required' });
  if (!execution_id) return res.status(400).json({ error: 'execution_id is required' });
  if (failed_step === undefined) return res.status(400).json({ error: 'failed_step is required' });
  if (!error_message) return res.status(400).json({ error: 'error_message is required' });
  try {
    const raw = await callClaude(`Determine retry strategy for a failed workflow step. Workflow ID: "${workflow_id}" Execution ID: "${execution_id}" Failed step: ${failed_step} Error: "${error_message}" Attempt: ${attempt_number || 1} Max attempts: ${max_attempts || 3}

Return concise JSON:
{
  "workflow_id": "string",
  "failed_step": number,
  "retry_recommended": true|false,
  "strategy": "immediate|backoff|alternative|skip|abort",
  "delay_ms": number,
  "max_attempts": number,
  "alternative_step": { "api": "string", "endpoint": "string", "reason": "string" } | null,
  "root_cause_analysis": "string",
  "prevention_tips": ["string"],
  "escalation_required": true|false,
  "confidence_per_section": { "strategy": 0-1, "root_cause": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/parallel-execution', async (req: Request, res: Response) => {
  const { workflow_id, parallel_branches, merge_strategy } = req.body;
  if (!workflow_id) return res.status(400).json({ error: 'workflow_id is required' });
  if (!parallel_branches) return res.status(400).json({ error: 'parallel_branches is required' });
  try {
    const raw = await callClaude(`Plan and execute parallel workflow branches. Workflow ID: "${workflow_id}" Merge strategy: "${merge_strategy || 'all_complete'}"

Parallel branches: ${JSON.stringify(parallel_branches)}

Return concise JSON:
{
  "workflow_id": "string",
  "branches_planned": number,
  "execution_plan": [{ "branch_id": "string", "steps": number, "estimated_ms": number, "dependencies": ["string"] }],
  "merge_strategy": "first_complete|all_complete|majority|weighted",
  "expected_speedup": number,
  "resource_contention": [{ "resource": "string", "branches": ["string"], "resolution": "string" }],
  "merge_logic": "string",
  "estimated_total_ms": number,
  "confidence_per_section": { "execution_plan": 0-1, "resource_contention": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/cost-estimator', async (req: Request, res: Response) => {
  const { workflow_steps, runs_per_month, context } = req.body;
  if (!workflow_steps) return res.status(400).json({ error: 'workflow_steps is required' });
  try {
    const raw = await callClaude(`Estimate cost and time for a workflow before execution. Runs per month: ${runs_per_month || 1} Context: "${context || 'none'}"

Workflow steps: ${JSON.stringify(workflow_steps)}

Return concise JSON:
{
  "per_run_cost": number,
  "per_run_time_ms": number,
  "monthly_cost": number,
  "cost_breakdown": [{ "step": "string", "api": "string", "endpoint": "string", "cost_per_call": number, "calls": number, "subtotal": number }],
  "optimization_opportunities": [{ "change": "string", "savings_per_run": number, "tradeoff": "string" }],
  "cost_tier": "ultra_low|low|medium|high",
  "roi_indicators": [{ "metric": "string", "expected_value": "string" }],
  "confidence_per_section": { "cost_breakdown": 0-1, "optimization": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/workflow-health', async (req: Request, res: Response) => {
  const { workflow_id, execution_history = [], current_status, metrics } = req.body;
  if (!workflow_id) return res.status(400).json({ error: 'workflow_id is required' });
  try {
    const raw = await callClaude(`Analyze health and status of a workflow. Workflow ID: "${workflow_id}" Current status: "${current_status || 'unknown'}" Metrics: ${JSON.stringify(metrics || {})}

Execution history (last 10): ${JSON.stringify(execution_history.slice(0, 10))}

Return concise JSON:
{
  "workflow_id": "string",
  "health_score": number,
  "status": "healthy|degraded|critical|unknown",
  "success_rate": number,
  "avg_execution_time_ms": number,
  "failure_patterns": [{ "pattern": "string", "frequency": number, "impact": "high|medium|low" }],
  "bottlenecks": [{ "step": "string", "avg_ms": number, "recommendation": "string" }],
  "alerts": [{ "severity": "critical|warning|info", "message": "string", "action": "string" }],
  "trend": "improving|stable|degrading",
  "confidence_per_section": { "health_score": 0-1, "failure_patterns": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { workflow_context, intended_workflow, resource_constraints } = req.body;
  if (!workflow_context) return res.status(400).json({ error: 'workflow_context is required' });
  if (!intended_workflow) return res.status(400).json({ error: 'intended_workflow is required' });
  try {
    const raw = await callClaude(`Gate workflow execution based on readiness and constraints. Intended workflow: "${intended_workflow}" Resource constraints: ${JSON.stringify(resource_constraints || {})}

Workflow context: ${JSON.stringify(workflow_context)}

Return concise JSON:
{
  "execute": true|false,
  "confidence": number,
  "blocking_flags": ["string"],
  "warnings": ["string"],
  "risk_score": number,
  "recommended_action": "string",
  "chain_to": ["string"],
  "resource_check": { "sufficient": true|false, "missing": ["string"] },
  "retry_after": "string" | null,
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/run-workflow', async (req: Request, res: Response) => {
  const { goal, context, available_apis = [], dry_run } = req.body;
  if (!goal) return res.status(400).json({ error: 'goal is required' });
  try {
    const raw = await callClaude(`Build and execute a complete multi-step workflow in one call. Goal: "${goal}" Context: "${context || 'none'}" Available APIs: ${JSON.stringify(available_apis)} Dry run: ${dry_run || false}

Return concise JSON:
{
  "workflow_id": "string",
  "goal": "string",
  "built_steps": number,
  "execution_id": "string",
  "status": "completed|partial|failed",
  "step_results": [{ "step": number, "api": "string", "status": "success|failed|skipped", "summary": "string" }],
  "final_output": {},
  "total_cost": number,
  "total_time_ms": number,
  "success_rate": number,
  "next_workflow_suggestions": ["string"],
  "confidence_per_section": { "step_results": 0-1, "final_output": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
