import { Router, Request, Response } from 'express';
import axios from 'axios';
import { buildRuntime } from '../../../shared/ai';

// ── Universal Runtime Envelope ────────────────────────────────────────────────


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
  res.json({ name: 'Multi-Agent Coordination API', info: '/multi-agent/info', openapi: '/multi-agent/openapi.json', health: 'ok' });
});

router.post('/create-team', async (req: Request, res: Response) => {
  const { team_name, goal, agents, coordination_style, shared_memory, max_parallel_tasks } = req.body;
  if (!team_name) return res.status(400).json({ error: 'team_name is required' });
  if (!goal) return res.status(400).json({ error: 'goal is required' });
  if (!agents) return res.status(400).json({ error: 'agents is required' });
  try {
    const raw = await callClaude(`Design a multi-agent team structure for this goal. Assign roles, define communication protocols, set up coordination hierarchy, and identify capability gaps.

Team name: "${team_name}"
Goal: "${goal}"
Coordination style: "${coordination_style || 'hierarchical'}"
Shared memory: ${shared_memory ?? false}
Max parallel tasks: ${max_parallel_tasks || 5}
Agents: ${JSON.stringify(agents)}

Return concise JSON:
{
  "team_id": "string (uuid-style)",
  "team_name": "string",
  "goal": "string",
  "coordination_style": "hierarchical|flat|consensus",
  "agents": [{ "id": "string", "role": "string", "primary_responsibilities": ["string"], "reports_to": "string or null", "communicates_with": ["string"] }],
  "planner_agent": "string",
  "executor_agents": ["string"],
  "evaluator_agent": "string or null",
  "capability_gaps": ["string"],
  "communication_protocol": { "channel": "string", "frequency": "string", "format": "string" },
  "confidence_per_section": { "team_structure": 0-1, "capability_gaps": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/assign-task', async (req: Request, res: Response) => {
  const { team_id, task, available_agents, priority, deadline, dependencies } = req.body;
  if (!team_id) return res.status(400).json({ error: 'team_id is required' });
  if (!task) return res.status(400).json({ error: 'task is required' });
  if (!available_agents) return res.status(400).json({ error: 'available_agents is required' });
  try {
    const raw = await callClaude(`Assign this task to the optimal agent based on capabilities, current load, and role fit. Break into subtasks if needed and set dependencies.

Team ID: "${team_id}"
Task: "${task}"
Priority: "${priority || 'medium'}"
Deadline: "${deadline || 'not specified'}"
Dependencies: ${JSON.stringify(dependencies || [])}
Available agents: ${JSON.stringify(available_agents)}

Return concise JSON:
{
  "task_id": "string",
  "task": "string",
  "assigned_to": "string (agent id)",
  "assignment_reason": "string",
  "priority": "critical|high|medium|low",
  "subtasks": [{ "subtask": "string", "assigned_to": "string", "estimated_ms": number, "depends_on": ["string"] }],
  "total_estimated_ms": number,
  "load_after_assignment": { "agent_id": { "load_pct": number } },
  "backup_agent": "string or null",
  "escalation_trigger": "string",
  "confidence_per_section": { "assignment": 0-1, "subtasks": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/route-work', async (req: Request, res: Response) => {
  const { work_item, team_id, agent_roster, routing_strategy, context } = req.body;
  if (!work_item) return res.status(400).json({ error: 'work_item is required' });
  if (!team_id) return res.status(400).json({ error: 'team_id is required' });
  if (!agent_roster) return res.status(400).json({ error: 'agent_roster is required' });
  try {
    const raw = await callClaude(`Route this work item to the best available agent. Consider specialization fit, availability, load balancing, and routing strategy.

Work item: "${work_item}"
Team ID: "${team_id}"
Routing strategy: "${routing_strategy || 'capability'}"
Context: "${context || 'none'}"
Agent roster: ${JSON.stringify(agent_roster)}

Return concise JSON:
{
  "work_item_id": "string",
  "routed_to": "string (agent id)",
  "routing_strategy": "capability|load|round_robin|priority",
  "routing_score": 0-1,
  "routing_reasoning": "string",
  "alternative_agents": [{ "id": "string", "score": 0-1, "reason": "string" }],
  "estimated_start": "string",
  "estimated_completion": "string",
  "queue_position": number,
  "load_balanced": true|false,
  "confidence_per_section": { "routing": 0-1, "alternatives": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/merge-results', async (req: Request, res: Response) => {
  const { results, merge_goal, merge_strategy, conflict_resolution } = req.body;
  if (!results) return res.status(400).json({ error: 'results is required' });
  if (!merge_goal) return res.status(400).json({ error: 'merge_goal is required' });
  try {
    const raw = await callClaude(`Merge outputs from multiple agents into a coherent result. Handle conflicts, weight by confidence, identify agreements and disagreements, and produce a unified output.

Merge goal: "${merge_goal}"
Merge strategy: "${merge_strategy || 'weighted'}"
Conflict resolution: "${conflict_resolution || 'highest_confidence'}"
Results: ${JSON.stringify(results)}

Return concise JSON:
{
  "merge_id": "string",
  "merge_goal": "string",
  "merged_output": "string",
  "merge_strategy": "union|intersection|weighted|consensus",
  "agreements": [{ "point": "string", "agents_agreeing": ["string"], "confidence": 0-1 }],
  "conflicts": [{ "point": "string", "positions": [{ "agent_id": "string", "position": "string" }], "resolution": "string", "resolution_method": "string" }],
  "contributing_agents": ["string"],
  "coverage_score": 0-1,
  "merge_confidence": 0-1,
  "confidence_per_section": { "agreements": 0-1, "conflicts": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/consensus', async (req: Request, res: Response) => {
  const { proposals, decision_topic, consensus_threshold, voting_weights, rounds } = req.body;
  if (!proposals) return res.status(400).json({ error: 'proposals is required' });
  if (!decision_topic) return res.status(400).json({ error: 'decision_topic is required' });
  try {
    const raw = await callClaude(`Facilitate consensus among agents on this decision topic. Identify areas of agreement, surface key disagreements, apply voting weights, and determine if consensus is reached.

Decision topic: "${decision_topic}"
Consensus threshold: ${consensus_threshold ?? 0.7}
Voting weights: ${JSON.stringify(voting_weights || {})}
Rounds: ${rounds || 1}
Proposals: ${JSON.stringify(proposals)}

Return concise JSON:
{
  "decision_topic": "string",
  "consensus_reached": true|false,
  "consensus_level": 0-1,
  "winning_proposal": "string or null",
  "vote_breakdown": [{ "agent_id": "string", "proposal_supported": "string", "weight": number, "reasoning": "string" }],
  "areas_of_agreement": ["string"],
  "areas_of_disagreement": [{ "point": "string", "positions": [{ "agent_id": "string", "position": "string" }] }],
  "recommended_resolution": "string",
  "next_round_needed": true|false,
  "confidence_per_section": { "vote_breakdown": 0-1, "areas_of_agreement": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/escalate', async (req: Request, res: Response) => {
  const { issue, team_id, escalation_reason, failed_agents, attempts, severity, context } = req.body;
  if (!issue) return res.status(400).json({ error: 'issue is required' });
  if (!team_id) return res.status(400).json({ error: 'team_id is required' });
  if (!escalation_reason) return res.status(400).json({ error: 'escalation_reason is required' });
  try {
    const raw = await callClaude(`Process this escalation request. Determine escalation path, identify the right escalation target, draft escalation message, and recommend resolution approach.

Issue: "${issue}"
Team ID: "${team_id}"
Escalation reason: "${escalation_reason}"
Severity: "${severity || 'high'}"
Attempts: ${attempts || 1}
Failed agents: ${JSON.stringify(failed_agents || [])}
Context: "${context || 'none'}"

Return concise JSON:
{
  "escalation_id": "string",
  "issue": "string",
  "severity": "critical|high|medium",
  "escalate_to": { "type": "human|senior_agent|team_lead", "id": "string", "role": "string" },
  "escalation_message": "string",
  "context_summary": "string",
  "failed_attempts": [{ "agent": "string", "reason": "string", "timestamp": "string" }],
  "recommended_resolution": "string",
  "estimated_resolution_time": "string",
  "human_required": true|false,
  "confidence_per_section": { "escalation_path": 0-1, "resolution": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/evaluate-agent', async (req: Request, res: Response) => {
  const { agent_id, task_history, evaluation_period, benchmark_against, dimensions } = req.body;
  if (!agent_id) return res.status(400).json({ error: 'agent_id is required' });
  if (!task_history) return res.status(400).json({ error: 'task_history is required' });
  try {
    const raw = await callClaude(`Evaluate this agent's performance across tasks. Score on accuracy, speed, reliability, and specialization fit. Identify improvement areas and strengths.

Agent ID: "${agent_id}"
Evaluation period: "${evaluation_period || 'last 30 days'}"
Benchmark against: ${JSON.stringify(benchmark_against || [])}
Dimensions: ${JSON.stringify(dimensions || ['accuracy','speed','reliability','specialization_fit','collaboration'])}
Task history: ${JSON.stringify(task_history)}

Return concise JSON:
{
  "agent_id": "string",
  "evaluation_period": "string",
  "overall_score": 0-100,
  "grade": "A+|A|B|C|D",
  "dimension_scores": { "accuracy": 0-100, "speed": 0-100, "reliability": 0-100, "specialization_fit": 0-100, "collaboration": 0-100 },
  "task_success_rate": 0-1,
  "avg_duration_ms": number,
  "strengths": ["string"],
  "improvement_areas": [{ "area": "string", "recommendation": "string" }],
  "ranking_vs_peers": "string or null",
  "recommended_role_adjustments": ["string"],
  "confidence_per_section": { "dimension_scores": 0-1, "improvement_areas": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/shared-state', async (req: Request, res: Response) => {
  const { team_id, action, state_key, value, merge_strategy, ttl_seconds } = req.body;
  if (!team_id) return res.status(400).json({ error: 'team_id is required' });
  if (!action) return res.status(400).json({ error: 'action is required' });
  if (!state_key) return res.status(400).json({ error: 'state_key is required' });
  try {
    const raw = await callClaude(`Manage shared state between agents in a team. Handle reads, writes, conflict detection, and state snapshots for coordination.

Team ID: "${team_id}"
Action: "${action}"
State key: "${state_key}"
Value: ${JSON.stringify(value ?? null)}
Merge strategy: "${merge_strategy || 'union'}"
TTL seconds: ${ttl_seconds ?? null}

Return concise JSON:
{
  "team_id": "string",
  "state_key": "string",
  "action": "read|write|merge|snapshot",
  "current_value": "any",
  "previous_value": "any",
  "conflict_detected": true|false,
  "conflict_resolution": "string or null",
  "last_modified_by": "string",
  "last_modified_at": "string",
  "version": number,
  "ttl_remaining_seconds": "number or null",
  "subscribers": ["string"],
  "state_health": "consistent|stale|conflicted",
  "confidence_per_section": { "state": 0-1, "conflict": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { coordination_action, team_context, risk_threshold, require_consensus } = req.body;
  if (!coordination_action) return res.status(400).json({ error: 'coordination_action is required' });
  if (!team_context) return res.status(400).json({ error: 'team_context is required' });
  try {
    const raw = await callClaude(`Gate a multi-agent coordination action. Check team readiness, consensus requirements, risk level, and authority before proceeding.

Coordination action: "${coordination_action}"
Risk threshold: ${risk_threshold ?? 0.7}
Require consensus: ${require_consensus ?? false}
Team context: ${JSON.stringify(team_context)}

Return concise JSON:
{
  "execute": true|false,
  "confidence": 0-1,
  "team_ready": true|false,
  "consensus_met": true|false,
  "risk_score": 0-1,
  "blocking_flags": ["string"],
  "warnings": ["string"],
  "recommended_action": "proceed|wait_for_consensus|escalate|abort",
  "chain_to": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/create-plan', async (req: Request, res: Response) => {
  const { goal, team_id, phases, dependencies, deadline, priority } = req.body;
  if (!goal) return res.status(400).json({ error: 'goal is required' });
  if (!team_id) return res.status(400).json({ error: 'team_id is required' });
  try {
    const raw = await callClaude(`Create a detailed execution plan for a multi-agent team to achieve this goal. Define phases, tasks per phase, parallelism, critical path, and risk flags.

Goal: "${goal}"
Team ID: "${team_id}"
Phases: ${JSON.stringify(phases || [])}
Dependencies: ${JSON.stringify(dependencies || [])}
Deadline: "${deadline || 'not specified'}"
Priority: "${priority || 'high'}"

Return concise JSON:
{
  "plan_id": "string (uuid-style)",
  "goal": "string",
  "team_id": "string",
  "phases": [{ "phase": number, "name": "string", "tasks": ["string"], "parallel": true|false, "duration_estimate_ms": number }],
  "total_tasks": number,
  "critical_path": ["string"],
  "risk_flags": ["string"],
  "dependencies_mapped": number,
  "confidence_per_section": { "phases": 0-1, "critical_path": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/update-task-status', async (req: Request, res: Response) => {
  const { task_id, status, agent_id, result, error, retry_count, metadata } = req.body;
  if (!task_id) return res.status(400).json({ error: 'task_id is required' });
  if (!status) return res.status(400).json({ error: 'status is required' });
  if (!agent_id) return res.status(400).json({ error: 'agent_id is required' });
  try {
    const raw = await callClaude(`Process a task status update in a multi-agent plan. Validate the transition, identify unblocked downstream tasks, compute plan progress, and determine if escalation is needed.

Task ID: "${task_id}"
New status: "${status}"
Agent ID: "${agent_id}"
Result: ${JSON.stringify(result ?? null)}
Error: "${error || 'none'}"
Retry count: ${retry_count ?? 0}
Metadata: ${JSON.stringify(metadata || {})}

Return concise JSON:
{
  "task_id": "string",
  "previous_status": "string",
  "new_status": "string",
  "agent_id": "string",
  "transition_valid": true|false,
  "downstream_tasks_unblocked": ["string"],
  "plan_progress_pct": number,
  "requires_escalation": true|false,
  "confidence_per_section": { "transition": 0-1, "downstream": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/retry-task', async (req: Request, res: Response) => {
  const { task_id, agent_id, failure_reason, max_retries, backoff_strategy, alternative_agent } = req.body;
  if (!task_id) return res.status(400).json({ error: 'task_id is required' });
  if (!agent_id) return res.status(400).json({ error: 'agent_id is required' });
  if (!failure_reason) return res.status(400).json({ error: 'failure_reason is required' });
  try {
    const raw = await callClaude(`Evaluate whether to retry a failed task and plan the retry strategy. Consider failure reason, retry count, backoff, and whether an alternative agent should be used.

Task ID: "${task_id}"
Agent ID: "${agent_id}"
Failure reason: "${failure_reason}"
Max retries: ${max_retries ?? 3}
Backoff strategy: "${backoff_strategy || 'exponential'}"
Alternative agent: "${alternative_agent || 'none'}"

Return concise JSON:
{
  "task_id": "string",
  "retry_approved": true|false,
  "retry_number": number,
  "assigned_agent": "string",
  "backoff_ms": number,
  "strategy": "string",
  "modifications": ["string"],
  "abort_recommended": true|false,
  "abort_reason": "string or null",
  "confidence_per_section": { "retry_plan": 0-1, "agent_selection": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/resolve-conflict', async (req: Request, res: Response) => {
  const { conflict_type, agents_involved, conflicting_outputs, resolution_strategy, arbiter_agent, context } = req.body;
  if (!conflict_type) return res.status(400).json({ error: 'conflict_type is required' });
  if (!agents_involved) return res.status(400).json({ error: 'agents_involved is required' });
  if (!conflicting_outputs) return res.status(400).json({ error: 'conflicting_outputs is required' });
  try {
    const raw = await callClaude(`Resolve a conflict between agents. Analyze the conflicting outputs, apply the resolution strategy, pick the winning output, and explain the rationale.

Conflict type: "${conflict_type}"
Agents involved: ${JSON.stringify(agents_involved)}
Resolution strategy: "${resolution_strategy || 'highest_confidence'}"
Arbiter agent: "${arbiter_agent || 'none'}"
Context: "${context || 'none'}"
Conflicting outputs: ${JSON.stringify(conflicting_outputs)}

Return concise JSON:
{
  "conflict_type": "string",
  "resolution": "string",
  "winning_output": {},
  "rationale": "string",
  "agents_involved": ["string"],
  "resolution_strategy_used": "string",
  "confidence_in_resolution": number,
  "dissenting_views": ["string"],
  "confidence_per_section": { "resolution": 0-1, "rationale": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/agent-heartbeat', async (req: Request, res: Response) => {
  const { agent_id, status, current_task, memory_mb, tokens_used, uptime_ms, error_rate } = req.body;
  if (!agent_id) return res.status(400).json({ error: 'agent_id is required' });
  if (!status) return res.status(400).json({ error: 'status is required' });
  try {
    const raw = await callClaude(`Evaluate this agent heartbeat report and determine health score, alerts, recommended action and capacity estimate.

Agent ID: "${agent_id}"
Status: "${status}"
Current task: "${current_task || 'none'}"
Memory MB: ${memory_mb ?? null}
Tokens used: ${tokens_used ?? null}
Uptime MS: ${uptime_ms ?? null}
Error rate: ${error_rate ?? null}

Return concise JSON:
{
  "agent_id": "string",
  "status": "string",
  "health_score": number,
  "alerts": ["string"],
  "recommended_action": "continue|throttle|reassign|restart|retire",
  "workload_assessment": "string",
  "estimated_capacity_pct": number,
  "next_check_ms": number,
  "confidence_per_section": { "health": 0-1, "capacity": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/run-agent-team', async (req: Request, res: Response) => {
  const { goal, context, team_size, available_agents, max_parallel_tasks, budget_tokens, dry_run } = req.body;
  if (!goal) return res.status(400).json({ error: 'goal is required' });
  if (!context) return res.status(400).json({ error: 'context is required' });
  try {
    const raw = await callClaude(`Orchestrate a full multi-agent team run to achieve the goal. Assemble the team, create an execution plan, simulate task execution, merge results into a final output, and report on performance.

Goal: "${goal}"
Context: "${context}"
Team size: ${team_size || 3}
Available agents: ${JSON.stringify(available_agents || [])}
Max parallel tasks: ${max_parallel_tasks || 3}
Budget tokens: ${budget_tokens || 10000}
Dry run: ${dry_run ?? false}

Return concise JSON:
{
  "run_id": "string (uuid-style)",
  "goal": "string",
  "team_assembled": [{ "agent_id": "string", "role": "string", "assigned_tasks": ["string"] }],
  "execution_plan": [{ "phase": number, "tasks": ["string"], "parallel": true|false }],
  "results": [{ "task": "string", "agent": "string", "status": "success|failed|skipped", "output_summary": "string" }],
  "final_output": {},
  "total_tokens_used": number,
  "total_cost_usd": number,
  "success_rate": number,
  "duration_ms": number,
  "confidence_per_section": { "team_assembly": 0-1, "results": 0-1, "final_output": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});


// ── Event Store + Governance ──────────────────────────────────────────────────
const eventStore: Record<string, any[]> = {};
function emitEvent(execution_id: string, event: string, step: string, data: any = {}) {
  if (!eventStore[execution_id]) eventStore[execution_id] = [];
  eventStore[execution_id].push({ event_id: `evt_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    event, step, timestamp: new Date().toISOString(), execution_id, data });
}
const REQUIRED_SCOPES: string[] = ["agent:read", "agent:write", "agent:govern", "agent:observe"];
const EXECUTION_AUTHORITY: string = "high";
function evaluateGovernance(req: any) {
  const agent_id        = req.headers?.['x-agent-id']    || req.body?.agent_id    || null;
  const provided_scopes = (req.headers?.['x-agent-scopes'] || '').split(',').filter(Boolean);
  const trust_score     = Math.min(1.0, Math.max(0.0, parseFloat(req.headers?.['x-agent-trust-score'] || '1.0') || 1.0));
  const sandbox_mode    = req.headers?.['x-sandbox-mode'] === 'true' || trust_score < 0.5;
  const violations: string[] = [];
  if (trust_score < 0.3) violations.push('trust_score_below_threshold');
  const permitted = violations.filter((v: string) => v.includes('trust_score_below_threshold')).length === 0;
  return { permitted, agent_id, scopes: provided_scopes.length > 0 ? provided_scopes : REQUIRED_SCOPES,
    trust_score, execution_authority: EXECUTION_AUTHORITY, sandbox_mode, violations,
    audit_entry: { agent_id, timestamp: new Date().toISOString(), endpoint: req.path,
      method: req.method, permitted, trust_score, sandbox_mode } };
}
router.get('/events/:execution_id', (req: any, res: any) => {
  const events = eventStore[req.params.execution_id] || [];
  res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true,
    execution_id: req.params.execution_id, events, total: events.length,
    computed_at: new Date().toISOString() });
});
router.get('/events/:execution_id/stream', (req: any, res: any) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();
  let index = 0;
  const existing = eventStore[req.params.execution_id] || [];
  existing.forEach((evt: any) => { res.write(`data: ${JSON.stringify(evt)}

`); index++; });
  const interval = setInterval(() => {
    const current = eventStore[req.params.execution_id] || [];
    while (index < current.length) { res.write(`data: ${JSON.stringify(current[index])}

`); index++; }
  }, 500);
  req.on('close', () => clearInterval(interval));
});
router.post('/governance/check', (req: any, res: any) => {
  const gov = evaluateGovernance(req);
  res.json({ ...buildRuntime(req, { workflow_state: gov.permitted ? 'complete' : 'blocked',
    retryable: !gov.permitted && !gov.violations.includes('trust_score_below_threshold') }),
    success: gov.permitted, permitted: gov.permitted, agent_id: gov.agent_id,
    scopes: gov.scopes, required_scopes: REQUIRED_SCOPES, trust_score: gov.trust_score,
    execution_authority: gov.execution_authority, sandbox_mode: gov.sandbox_mode,
    violations: gov.violations, audit_entry: gov.audit_entry,
    computed_at: new Date().toISOString() });
});
router.get('/governance/scopes', (req: any, res: any) => {
  res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true,
    required_scopes: REQUIRED_SCOPES, execution_authority: EXECUTION_AUTHORITY,
    scope_descriptions: REQUIRED_SCOPES.reduce((acc: any, s: string) => {
      acc[s] = `Permission to ${s.replace(':', ' ')} on this API`; return acc; }, {}),
    computed_at: new Date().toISOString() });
});
router.post('/governance/audit', (req: any, res: any) => {
  const { execution_id } = req.body || {};
  const events = execution_id ? (eventStore[execution_id] || []) : [];
  const gov    = evaluateGovernance(req);
  res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true,
    audit_trail: events, total_events: events.length, agent_id: gov.agent_id,
    trust_score: gov.trust_score, sandbox_mode: gov.sandbox_mode,
    audit_summary: { governance_checks: events.filter((e: any) => e.event === 'governance_check').length,
      step_completions: events.filter((e: any) => e.event === 'step_completed').length,
      violations: gov.violations, permitted: gov.permitted },
    computed_at: new Date().toISOString() });
});


// ── Workflow Runtime Layer ────────────────────────────────────────────────────
const workflowStore: Record<string, any> = {};
function createWorkflow(id: string, goal: string, steps: string[], meta: any) {
  const now = new Date().toISOString();
  workflowStore[id] = { workflow_id: id, goal, steps, current_step: steps[0], step_index: 0,
    status: 'running', created_at: now, updated_at: now,
    completed_steps: [], pending_steps: steps.slice(1), results: {}, meta };
  return workflowStore[id];
}
function advanceWorkflow(id: string) {
  const wf = workflowStore[id];
  if (!wf) return null;
  if (wf.step_index < wf.steps.length - 1) {
    wf.completed_steps.push(wf.current_step);
    wf.step_index += 1;
    wf.current_step  = wf.steps[wf.step_index];
    wf.pending_steps = wf.steps.slice(wf.step_index + 1);
    wf.status        = wf.step_index === wf.steps.length - 1 ? 'complete' : 'running';
  } else {
    wf.completed_steps.push(wf.current_step); wf.status = 'complete'; wf.pending_steps = [];
  }
  wf.updated_at = new Date().toISOString();
  return wf;
}
router.post('/workflow/start', (req: any, res: any) => {
  const { goal, steps, meta } = req.body || {};
  const workflow_id = `wf_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const wf = createWorkflow(workflow_id, goal || 'execute', steps || ["validate_inputs", "authenticate_agent", "process_telemetry", "update_state", "finalize"], meta || {});
  res.json({ ...buildRuntime(req, { workflow_state: 'running', orchestration_hints: { can_chain: true, suggested_next: ['GET /workflow/' + workflow_id], requires_review: false } }),
    success: true, workflow_id, goal: wf.goal, status: wf.status, current_step: wf.current_step,
    steps: wf.steps, pending_steps: wf.pending_steps, created_at: wf.created_at,
    estimated_steps: wf.steps.length, computed_at: new Date().toISOString() });
});
router.get('/workflow/:id', (req: any, res: any) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true,
    workflow_id: wf.workflow_id, goal: wf.goal, status: wf.status, current_step: wf.current_step,
    step_index: wf.step_index, total_steps: wf.steps.length, completed_steps: wf.completed_steps,
    pending_steps: wf.pending_steps, progress_pct: Math.round((wf.step_index / wf.steps.length) * 100),
    created_at: wf.created_at, updated_at: wf.updated_at, results: wf.results,
    computed_at: new Date().toISOString() });
});
router.post('/workflow/:id/resume', (req: any, res: any) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  if (wf.status === 'complete') return res.json({ ...buildRuntime(req, { workflow_state: 'complete' }),
    success: true, workflow_id: wf.workflow_id, status: 'complete', message: 'Already complete' });
  const advanced = advanceWorkflow(req.params.id);
  res.json({ ...buildRuntime(req, { workflow_state: advanced!.status, retryable: advanced!.status !== 'complete',
    orchestration_hints: { can_chain: true, suggested_next: advanced!.status === 'complete' ? [] : ['POST /workflow/' + req.params.id + '/resume'], requires_review: false } }),
    success: true, workflow_id: advanced!.workflow_id, status: advanced!.status,
    current_step: advanced!.current_step, completed_steps: advanced!.completed_steps,
    pending_steps: advanced!.pending_steps, progress_pct: Math.round((advanced!.step_index / advanced!.steps.length) * 100),
    updated_at: advanced!.updated_at, computed_at: new Date().toISOString() });
});
router.get('/workflow/:id/state', (req: any, res: any) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true,
    workflow_id: wf.workflow_id,
    state_machine: { current_state: wf.current_step, previous_states: wf.completed_steps,
      next_states: wf.pending_steps, terminal: wf.status === 'complete',
      transitions: wf.steps.map((s: string, i: number) => ({ step: i+1, state: s,
        status: i < wf.step_index ? 'complete' : i === wf.step_index ? 'active' : 'pending' })) },
    meta: wf.meta, created_at: wf.created_at, updated_at: wf.updated_at,
    computed_at: new Date().toISOString() });
});

export default router;
