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
  res.json({ name: 'Agent Observability & Telemetry API', info: '/agent-observability/info', openapi: '/agent-observability/openapi.json', health: 'ok' });
});

router.post('/log-tool-call', async (req: Request, res: Response) => {
  const { agent_id, tool_name, input, output, duration_ms, session_id, success, cost_usdc } = req.body;
  if (!agent_id) return res.status(400).json({ error: 'agent_id is required' });
  if (!tool_name) return res.status(400).json({ error: 'tool_name is required' });
  if (!input) return res.status(400).json({ error: 'input is required' });
  if (!output) return res.status(400).json({ error: 'output is required' });
  try {
    const raw = await callClaude(`Process and enrich this tool call log entry. Classify the call, detect anomalies, assess cost efficiency, and generate structured telemetry.
Agent ID: "${agent_id}" Tool: "${tool_name}" Duration ms: ${duration_ms ?? 'unknown'} Success: ${success ?? 'unknown'} Cost USDC: ${cost_usdc ?? 'unknown'} Session ID: "${session_id || 'none'}"
Input: ${JSON.stringify(input).slice(0, 1000)}
Output: ${JSON.stringify(output).slice(0, 1000)}

Return concise JSON:
{
  "log_id": "string (uuid-style)",
  "agent_id": "string",
  "tool_name": "string",
  "call_type": "api|function|browser|database|llm",
  "duration_ms": number,
  "success": true|false,
  "cost_usdc": number,
  "efficiency_score": 0-100,
  "anomaly_detected": true|false,
  "anomaly_flags": ["string"],
  "input_size_tokens": number,
  "output_size_tokens": number,
  "session_id": "string",
  "timestamp": "string (ISO8601)",
  "telemetry": { "p50_benchmark_ms": number, "cost_percentile": "string", "retry_count": number },
  "confidence_per_section": { "classification": 0-1, "anomaly_detection": 0-1, "cost_efficiency": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/trace-workflow', async (req: Request, res: Response) => {
  const { workflow_id, steps, agent_id, goal, total_duration_ms } = req.body;
  if (!workflow_id) return res.status(400).json({ error: 'workflow_id is required' });
  if (!steps) return res.status(400).json({ error: 'steps is required' });
  try {
    const raw = await callClaude(`Generate a complete workflow trace analysis. Identify bottlenecks, cost hotspots, failure patterns, and optimization opportunities across the step sequence.
Workflow ID: "${workflow_id}" Agent ID: "${agent_id || 'unknown'}" Goal: "${goal || 'not specified'}" Total duration ms: ${total_duration_ms ?? 'unknown'}
Steps: ${JSON.stringify(steps.slice(0, 50))}

Return concise JSON:
{
  "workflow_id": "string",
  "agent_id": "string",
  "goal": "string",
  "total_steps": number,
  "successful_steps": number,
  "failed_steps": number,
  "total_duration_ms": number,
  "total_cost_usdc": number,
  "bottlenecks": [{ "step": number, "tool": "string", "duration_ms": number, "pct_of_total": number, "recommendation": "string" }],
  "cost_breakdown": [{ "tool": "string", "cost_usdc": number, "pct_of_total": number }],
  "failure_analysis": [{ "step": number, "tool": "string", "likely_cause": "string" }],
  "optimization_opportunities": [{ "opportunity": "string", "estimated_savings": "string" }],
  "workflow_health": "healthy|degraded|failing",
  "confidence_per_section": { "bottlenecks": 0-1, "cost_breakdown": 0-1, "failure_analysis": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/replay-agent', async (req: Request, res: Response) => {
  const { session_id, steps, replay_from_step, highlight_failures, compare_to_session } = req.body;
  if (!session_id) return res.status(400).json({ error: 'session_id is required' });
  if (!steps) return res.status(400).json({ error: 'steps is required' });
  try {
    const raw = await callClaude(`Analyze and replay this agent session. Reconstruct the decision path, identify divergence points, and generate a replay report with step-by-step commentary.
Session ID: "${session_id}" Replay from step: ${replay_from_step ?? 0} Highlight failures: ${highlight_failures ?? true} Compare to session: "${compare_to_session || 'none'}"
Steps: ${JSON.stringify(steps.slice(0, 30).map((s: any) => ({ ...s, input: JSON.stringify(s.input).slice(0, 200), output: JSON.stringify(s.output).slice(0, 200) })))}

Return concise JSON:
{
  "session_id": "string",
  "replay_id": "string (uuid-style)",
  "total_steps": number,
  "replayed_steps": number,
  "decision_path": [{ "step": number, "action": "string", "reasoning": "string", "alternatives_considered": ["string"] }],
  "failure_points": [{ "step": number, "failure_type": "string", "root_cause": "string", "prevention": "string" }],
  "key_decisions": [{ "step": number, "decision": "string", "impact": "high|medium|low" }],
  "session_summary": "string",
  "divergence_analysis": "string or null",
  "replay_insights": ["string"],
  "confidence_per_section": { "decision_path": 0-1, "failure_points": 0-1, "key_decisions": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/cost-analysis', async (req: Request, res: Response) => {
  const { agent_id, usage_records, budget_usdc, compare_period, breakdown_by } = req.body;
  if (!agent_id) return res.status(400).json({ error: 'agent_id is required' });
  if (!usage_records) return res.status(400).json({ error: 'usage_records is required' });
  try {
    const raw = await callClaude(`Analyze agent cost patterns. Identify cost drivers, budget burn rate, inefficiencies, and optimization opportunities with projected savings.
Agent ID: "${agent_id}" Budget USDC: ${budget_usdc ?? 'none'} Compare period: "${compare_period || 'not specified'}" Breakdown by: "${breakdown_by || 'tool'}"
Usage records: ${JSON.stringify(usage_records.slice(0, 50))}

Return concise JSON:
{
  "agent_id": "string",
  "total_cost_usdc": number,
  "budget_usdc": number or null,
  "budget_utilization_pct": number,
  "burn_rate": { "daily_usdc": number, "monthly_projected_usdc": number },
  "cost_by_tool": [{ "tool": "string", "cost_usdc": number, "calls": number, "avg_cost_per_call": number, "pct_of_total": number }],
  "cost_anomalies": [{ "tool": "string", "expected_usdc": number, "actual_usdc": number, "deviation_pct": number }],
  "optimization_opportunities": [{ "opportunity": "string", "estimated_monthly_savings_usdc": number, "effort": "low|medium|high" }],
  "efficiency_score": 0-100,
  "confidence_per_section": { "burn_rate": 0-1, "cost_anomalies": 0-1, "optimization_opportunities": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/failure-analysis', async (req: Request, res: Response) => {
  const { failures, agent_id, session_id, include_patterns } = req.body;
  if (!failures) return res.status(400).json({ error: 'failures is required' });
  try {
    const raw = await callClaude(`Diagnose agent failures. Identify root causes, classify failure types, detect patterns, and generate actionable remediation steps.
Agent ID: "${agent_id || 'unknown'}" Session ID: "${session_id || 'none'}" Include patterns: ${include_patterns ?? true}
Failures: ${JSON.stringify(failures.slice(0, 30).map((f: any) => ({ ...f, input: JSON.stringify(f.input).slice(0, 300) })))}

Return concise JSON:
{
  "total_failures": number,
  "failure_types": { "api_error": number, "timeout": number, "validation": number, "auth": number, "logic": number, "unknown": number },
  "root_causes": [{ "failure_index": number, "root_cause": "string", "category": "string", "confidence": 0-1 }],
  "patterns": [{ "pattern": "string", "frequency": "high|medium|low", "affected_tools": ["string"], "recommendation": "string" }],
  "critical_failures": [{ "index": number, "why_critical": "string" }],
  "remediation_steps": [{ "for_pattern": "string", "steps": ["string"] }],
  "mttr_estimate": "string",
  "confidence_per_section": { "root_causes": 0-1, "patterns": 0-1, "remediation_steps": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/performance-score', async (req: Request, res: Response) => {
  const { agent_id, metrics, benchmark, evaluation_period, goal_context } = req.body;
  if (!agent_id) return res.status(400).json({ error: 'agent_id is required' });
  if (!metrics) return res.status(400).json({ error: 'metrics is required' });
  try {
    const raw = await callClaude(`Score this agent's overall performance. Benchmark against industry standards, identify strengths and weaknesses, and recommend optimization priorities.
Agent ID: "${agent_id}" Evaluation period: "${evaluation_period || 'not specified'}" Goal context: "${goal_context || 'general'}"
Metrics: ${JSON.stringify(metrics)}
Benchmark: ${JSON.stringify(benchmark || {})}

Return concise JSON:
{
  "agent_id": "string",
  "overall_score": 0-100,
  "grade": "A+|A|B|C|D",
  "dimension_scores": { "reliability": 0-100, "speed": 0-100, "cost_efficiency": 0-100, "task_completion": 0-100 },
  "vs_benchmark": [{ "metric": "string", "agent_value": "string", "benchmark_value": "string", "delta": "string", "assessment": "above|at|below" }],
  "strengths": ["string"],
  "weaknesses": [{ "area": "string", "recommendation": "string" }],
  "optimization_priority": ["string"],
  "projected_improvement": "string",
  "confidence_per_section": { "dimension_scores": 0-1, "vs_benchmark": 0-1, "weaknesses": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/anomaly-detect', async (req: Request, res: Response) => {
  const { agent_id, recent_behavior, baseline_behavior, sensitivity } = req.body;
  if (!agent_id) return res.status(400).json({ error: 'agent_id is required' });
  if (!recent_behavior) return res.status(400).json({ error: 'recent_behavior is required' });
  try {
    const raw = await callClaude(`Detect behavioral anomalies in this agent's recent activity. Compare against baseline or expected patterns, classify anomalies, and assess security/reliability risk.
Agent ID: "${agent_id}" Sensitivity: "${sensitivity || 'medium'}"
Recent behavior: ${JSON.stringify(recent_behavior.slice(0, 50))}
Baseline behavior: ${JSON.stringify((baseline_behavior || []).slice(0, 50))}

Return concise JSON:
{
  "agent_id": "string",
  "anomalies_detected": number,
  "anomalies": [{ "timestamp": "string", "action": "string", "type": "cost_spike|latency_spike|failure_cluster|unusual_tool|off_hours|repetition", "severity": "critical|high|medium|low", "description": "string", "baseline_expected": "string", "actual": "string" }],
  "risk_level": "high|medium|low|none",
  "security_flags": ["string"],
  "reliability_flags": ["string"],
  "recommended_action": "monitor|investigate|pause_agent|alert_human",
  "confidence_per_section": { "anomaly_classification": 0-1, "risk_assessment": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { agent_id, action, observability_context, performance_threshold, cost_budget_remaining_usdc } = req.body;
  if (!agent_id) return res.status(400).json({ error: 'agent_id is required' });
  if (!action) return res.status(400).json({ error: 'action is required' });
  if (!observability_context) return res.status(400).json({ error: 'observability_context is required' });
  try {
    const raw = await callClaude(`Gate agent execution based on observability signals. Check performance health, cost budget, failure rate, and anomaly status before allowing continuation.
Agent ID: "${agent_id}" Action: "${action}" Performance threshold: ${performance_threshold ?? 0.8} Cost budget remaining USDC: ${cost_budget_remaining_usdc ?? 'unknown'}
Observability context: ${JSON.stringify(observability_context)}

Return concise JSON:
{
  "execute": true|false,
  "confidence": 0-1,
  "performance_healthy": true|false,
  "budget_available": true|false,
  "anomaly_free": true|false,
  "risk_score": 0-1,
  "blocking_flags": ["string"],
  "warnings": ["string"],
  "recommended_action": "proceed|throttle|pause|alert_and_proceed|stop",
  "chain_to": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/ingest-event', async (req: Request, res: Response) => {
  const { event_type, agent_id, payload, session_id, timestamp, severity, tags } = req.body;
  if (!event_type) return res.status(400).json({ error: 'event_type is required' });
  if (!agent_id) return res.status(400).json({ error: 'agent_id is required' });
  if (!payload) return res.status(400).json({ error: 'payload is required' });
  try {
    const raw = await callClaude(`Ingest and normalize this agent observability event. Validate the event, normalize the payload, detect anomalies, and return structured telemetry.
Event type: "${event_type}" Agent ID: "${agent_id}" Session ID: "${session_id || 'none'}" Severity: "${severity || 'info'}" Timestamp: "${timestamp || new Date().toISOString()}"
Tags: ${JSON.stringify(tags || [])}
Payload: ${JSON.stringify(payload).slice(0, 2000)}

Return concise JSON:
{
  "event_id": "string (uuid-style)",
  "event_type": "string",
  "agent_id": "string",
  "ingested": true,
  "normalized_payload": {},
  "session_id": "string",
  "timestamp_utc": "string (ISO8601)",
  "severity": "string",
  "anomaly_flag": true|false,
  "anomaly_reason": "string or null",
  "confidence_per_section": { "normalization": 0-1, "anomaly": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/session-summary', async (req: Request, res: Response) => {
  const { session_id, events, include_cost, include_timeline, output_format } = req.body;
  if (!session_id) return res.status(400).json({ error: 'session_id is required' });
  if (!events) return res.status(400).json({ error: 'events is required' });
  try {
    const raw = await callClaude(`Summarize this agent session from its event log. Calculate duration, costs, tool usage, success rates, and generate a timeline and key decisions.
Session ID: "${session_id}" Include cost: ${include_cost ?? true} Include timeline: ${include_timeline ?? true} Output format: "${output_format || 'json'}"
Events: ${JSON.stringify(events.slice(0, 100))}

Return concise JSON:
{
  "session_id": "string",
  "duration_ms": number,
  "total_events": number,
  "agents_involved": ["string"],
  "tool_calls_made": number,
  "llm_requests_made": number,
  "errors_encountered": number,
  "success_rate": number,
  "cost_usd": number,
  "tokens_used": number,
  "timeline": [{ "timestamp": "string (ISO8601)", "event_type": "string", "agent_id": "string", "summary": "string" }],
  "key_decisions": ["string"],
  "outcome": "success|partial|failure|unknown",
  "confidence_per_section": { "timeline": 0-1, "cost": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/error-budget', async (req: Request, res: Response) => {
  const { service_name, slo_target, window_days, current_error_rate, incidents, budget_policy } = req.body;
  if (!service_name) return res.status(400).json({ error: 'service_name is required' });
  if (slo_target === undefined) return res.status(400).json({ error: 'slo_target is required' });
  if (!window_days) return res.status(400).json({ error: 'window_days is required' });
  try {
    const raw = await callClaude(`Calculate the error budget status for this service. Compute total budget, remaining budget, burn rate, and project exhaustion date.
Service: "${service_name}" SLO target: ${slo_target} Window days: ${window_days} Current error rate: ${current_error_rate ?? 'unknown'} Budget policy: "${budget_policy || 'standard'}"
Incidents: ${JSON.stringify(incidents || [])}

Return concise JSON:
{
  "service_name": "string",
  "slo_target": number,
  "window_days": number,
  "error_budget_total_minutes": number,
  "error_budget_remaining_minutes": number,
  "error_budget_consumed_pct": number,
  "burn_rate": number,
  "burn_rate_status": "healthy|elevated|critical|exhausted",
  "projected_exhaustion_days": number,
  "incidents_in_window": number,
  "recommended_action": "maintain|throttle|alert|freeze_deploys|incident",
  "confidence_per_section": { "budget_calc": 0-1, "projection": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/slo-report', async (req: Request, res: Response) => {
  const { service_name, slo_definitions, measurement_window_days, include_recommendations, breakdown_by } = req.body;
  if (!service_name) return res.status(400).json({ error: 'service_name is required' });
  if (!slo_definitions) return res.status(400).json({ error: 'slo_definitions is required' });
  if (!measurement_window_days) return res.status(400).json({ error: 'measurement_window_days is required' });
  try {
    const raw = await callClaude(`Generate a comprehensive SLO compliance report for this service. Evaluate each SLO, determine health status, and provide recommendations.
Service: "${service_name}" Window days: ${measurement_window_days} Include recommendations: ${include_recommendations ?? true} Breakdown by: "${breakdown_by || 'slo'}"
SLO definitions: ${JSON.stringify(slo_definitions)}

Return concise JSON:
{
  "service_name": "string",
  "window_days": number,
  "slos": [{ "name": "string", "target": number, "current": number, "status": "met|at_risk|breached", "remaining_budget_minutes": number, "trend": "improving|stable|degrading" }],
  "overall_health": "green|yellow|red",
  "slos_met": number,
  "slos_at_risk": number,
  "slos_breached": number,
  "top_recommendations": ["string"],
  "report_generated_at": "string (ISO8601)",
  "confidence_per_section": { "slos": 0-1, "recommendations": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/export-traces', async (req: Request, res: Response) => {
  const { session_ids, format, include_payloads, compress, date_range, filter_by_agent } = req.body;
  if (!session_ids) return res.status(400).json({ error: 'session_ids is required' });
  if (!format) return res.status(400).json({ error: 'format is required' });
  try {
    const raw = await callClaude(`Generate trace export instructions and sample for these agent sessions. Provide step-by-step export guidance, sample trace structure, and size estimate.
Session IDs: ${JSON.stringify(session_ids)} Format: "${format}" Include payloads: ${include_payloads ?? false} Compress: ${compress ?? false} Filter by agent: "${filter_by_agent || 'all'}"
Date range: ${JSON.stringify(date_range || {})}

Return concise JSON:
{
  "export_id": "string (uuid-style)",
  "sessions_exported": number,
  "format": "string",
  "total_spans": number,
  "total_events": number,
  "export_instructions": [{ "step": number, "action": "string" }],
  "sample_trace": {},
  "file_size_estimate_kb": number,
  "compressed": true|false,
  "payloads_included": true|false,
  "confidence_per_section": { "export": 0-1, "sample_trace": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/webhook-alert', async (req: Request, res: Response) => {
  const { alert_condition, webhook_url, agent_id, threshold, cooldown_ms, payload_template, severity_filter } = req.body;
  if (!alert_condition) return res.status(400).json({ error: 'alert_condition is required' });
  if (!webhook_url) return res.status(400).json({ error: 'webhook_url is required' });
  if (!agent_id) return res.status(400).json({ error: 'agent_id is required' });
  try {
    const raw = await callClaude(`Configure and validate a webhook alert for this agent. Generate the webhook configuration, validate the URL and condition, and produce a test payload.
Alert condition: "${alert_condition}" Webhook URL: "${webhook_url}" Agent ID: "${agent_id}" Threshold: ${threshold ?? 'default'} Cooldown ms: ${cooldown_ms ?? 60000}
Severity filter: ${JSON.stringify(severity_filter || ['warning', 'error', 'critical'])}
Payload template: ${JSON.stringify(payload_template || {})}

Return concise JSON:
{
  "webhook_id": "string (uuid-style)",
  "alert_condition": "string",
  "agent_id": "string",
  "webhook_url": "string",
  "configuration": { "threshold": number, "cooldown_ms": number, "severity_filter": ["string"] },
  "payload_template": {},
  "test_payload": {},
  "activation_status": "active|pending|invalid",
  "validation_errors": ["string"],
  "confidence_per_section": { "configuration": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/monitor-agent-session', async (req: Request, res: Response) => {
  const { agent_id, session_id, events, slo_targets, alert_thresholds, include_replay } = req.body;
  if (!agent_id) return res.status(400).json({ error: 'agent_id is required' });
  if (!session_id) return res.status(400).json({ error: 'session_id is required' });
  if (!events) return res.status(400).json({ error: 'events is required' });
  try {
    const raw = await callClaude(`Perform comprehensive monitoring analysis for this agent session. Evaluate performance, detect anomalies, check SLO compliance, analyze costs and failures, and determine overall health.
Agent ID: "${agent_id}" Session ID: "${session_id}" Include replay: ${include_replay ?? false}
SLO targets: ${JSON.stringify(slo_targets || [])}
Alert thresholds: ${JSON.stringify(alert_thresholds || {})}
Events: ${JSON.stringify(events.slice(0, 100))}

Return concise JSON:
{
  "run_id": "string (uuid-style)",
  "agent_id": "string",
  "session_id": "string",
  "session_summary": { "duration_ms": number, "total_events": number, "outcome": "string", "cost_usd": number },
  "performance_score": number,
  "anomalies_detected": [{ "type": "string", "severity": "string", "at_event": number, "description": "string" }],
  "slo_status": [{ "name": "string", "target": number, "actual": number, "status": "string" }],
  "failure_analysis": { "failures": number, "root_causes": ["string"], "prevention": ["string"] },
  "cost_analysis": { "total_usd": number, "by_tool": {}, "optimization_potential_usd": number },
  "alerts_triggered": [{ "condition": "string", "severity": "string", "at_ms": number }],
  "replay_available": true|false,
  "overall_health": "green|yellow|red",
  "confidence_per_section": { "performance": 0-1, "anomalies": 0-1, "slo": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
