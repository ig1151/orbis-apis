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
  res.json({ name: 'Real-Time Monitoring & Alerting API', info: '/real-time-monitor/info', openapi: '/real-time-monitor/openapi.json', health: 'ok' });
});

router.post('/anomaly-detect', async (req: Request, res: Response) => {
  const { metrics, sensitivity, context, baseline_period } = req.body;
  if (!metrics) return res.status(400).json({ error: 'metrics is required' });
  try {
    const raw = await callClaude(`Detect anomalies in these time-series metrics. Identify outliers, trend breaks, sudden spikes or drops, and seasonal deviations. Sensitivity: "${sensitivity || 'medium'}" Context: "${context || 'not provided'}" Baseline period: "${baseline_period || 'not specified'}" Metrics: ${JSON.stringify(metrics.slice(0, 20))}

Return concise JSON:
{
  "anomalies_found": number,
  "anomalies": [{ "metric_name": "string", "timestamp": "string", "value": number, "anomaly_type": "spike|drop|trend_break|missing|plateau", "severity": "critical|high|medium|low", "expected_range": { "min": number, "max": number }, "deviation_pct": number, "possible_cause": "string" }],
  "metrics_analyzed": number,
  "healthy_metrics": ["string"],
  "summary": "string",
  "alert_level": "critical|warning|info|healthy",
  "confidence_per_section": { "anomalies": 0-1, "healthy_metrics": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/check-status', async (req: Request, res: Response) => {
  const { system_name, current_metrics, thresholds, sla_requirements, dependencies } = req.body;
  if (!system_name) return res.status(400).json({ error: 'system_name is required' });
  if (!current_metrics) return res.status(400).json({ error: 'current_metrics is required' });
  try {
    const raw = await callClaude(`Evaluate current system status based on provided metrics. Assess against thresholds and SLAs. Classify overall health and identify at-risk components. System: "${system_name}" Thresholds: ${JSON.stringify(thresholds || {})} SLA requirements: ${JSON.stringify(sla_requirements || {})} Dependencies: ${JSON.stringify(dependencies || [])} Current metrics: ${JSON.stringify(current_metrics)}

Return concise JSON:
{
  "system_name": "string",
  "status": "healthy|degraded|critical|unknown",
  "health_score": number (0-100),
  "components": [{ "name": "string", "status": "healthy|degraded|critical", "metric_value": "string", "threshold": "string", "in_breach": true|false }],
  "sla_compliance": { "compliant": true|false, "breached_slas": ["string"], "at_risk_slas": ["string"] },
  "immediate_actions": ["string"],
  "time_to_breach": "string or null",
  "confidence_per_section": { "components": 0-1, "sla_compliance": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/incident-detect', async (req: Request, res: Response) => {
  const { events, system_context, known_incidents, detection_window, correlation_rules } = req.body;
  if (!events) return res.status(400).json({ error: 'events is required' });
  if (!system_context) return res.status(400).json({ error: 'system_context is required' });
  try {
    const raw = await callClaude(`Analyze these events to detect and classify incidents. Correlate related events, identify root causes, assess impact, and prioritize response. System context: "${system_context}" Known incidents: ${JSON.stringify(known_incidents || [])} Detection window: "${detection_window || '1h'}" Correlation rules: ${JSON.stringify(correlation_rules || [])} Events: ${JSON.stringify(events.slice(0, 100))}

Return concise JSON:
{
  "incidents_detected": number,
  "incidents": [{ "incident_id": "string", "type": "outage|performance|security|data|dependency", "severity": "P1|P2|P3|P4", "start_time": "string", "affected_systems": ["string"], "root_cause_hypothesis": "string", "contributing_events": ["string"], "impact_assessment": "string", "recommended_response": "string", "escalate": true|false }],
  "noise_events": number,
  "signal_events": number,
  "correlation_patterns": ["string"],
  "confidence_per_section": { "incidents": 0-1, "correlation_patterns": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/alert-config', async (req: Request, res: Response) => {
  const { metric_definitions, sla_targets, alert_channels, environment } = req.body;
  if (!metric_definitions) return res.status(400).json({ error: 'metric_definitions is required' });
  if (!sla_targets) return res.status(400).json({ error: 'sla_targets is required' });
  try {
    const raw = await callClaude(`Generate optimized alerting configuration for these metrics and SLA targets. Set appropriate thresholds, eliminate alert fatigue, and configure escalation paths. Alert channels: ${JSON.stringify(alert_channels || ['email'])} Environment: "${environment || 'production'}" SLA targets: ${JSON.stringify(sla_targets)} Metric definitions: ${JSON.stringify(metric_definitions.slice(0, 30))}

Return concise JSON:
{
  "alert_rules": [{ "metric": "string", "condition": "string", "threshold_warning": "string", "threshold_critical": "string", "evaluation_window": "string", "frequency": "string", "auto_resolve": true|false, "suppress_if": "string or null" }],
  "escalation_policy": [{ "level": number, "trigger": "string", "notify": ["string"], "timeout_minutes": number }],
  "estimated_alert_volume": { "daily": "string", "weekly": "string" },
  "noise_reduction_tips": ["string"],
  "recommended_dashboards": [{ "panel_name": "string", "metrics": ["string"], "chart_type": "string" }],
  "confidence_per_section": { "alert_rules": 0-1, "escalation_policy": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/uptime-report', async (req: Request, res: Response) => {
  const { events, period, sla_target, service_name } = req.body;
  if (!events) return res.status(400).json({ error: 'events is required' });
  if (!period) return res.status(400).json({ error: 'period is required' });
  try {
    const raw = await callClaude(`Calculate uptime metrics and generate an uptime report. Compute availability percentage, MTTR, MTBF, and incident breakdown. Service: "${service_name || 'unknown'}" Period: "${period}" SLA target: ${sla_target || null} Events: ${JSON.stringify(events.slice(0, 200))}

Return concise JSON:
{
  "service_name": "string",
  "period": "string",
  "uptime_pct": number,
  "downtime_minutes": number,
  "sla_target_pct": number or null,
  "sla_met": true|false,
  "incidents": [{ "start": "string", "duration_minutes": number, "type": "outage|degradation" }],
  "mttr_minutes": number,
  "mtbf_hours": number,
  "longest_outage_minutes": number,
  "trending": "improving|stable|degrading",
  "report_summary": "string",
  "confidence_per_section": { "uptime_pct": 0-1, "incidents": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/performance-baseline', async (req: Request, res: Response) => {
  const { metrics_history, window, exclude_anomalies } = req.body;
  if (!metrics_history) return res.status(400).json({ error: 'metrics_history is required' });
  try {
    const raw = await callClaude(`Establish performance baselines from historical metrics. Calculate normal ranges, detect seasonality patterns, and define threshold recommendations. Window: "${window || '30d'}" Exclude anomalies: ${exclude_anomalies !== undefined ? exclude_anomalies : true} Metrics history: ${JSON.stringify(metrics_history.slice(0, 20).map((m: any) => ({ ...m, values: m.values?.slice(0, 100), timestamps: m.timestamps?.slice(0, 100) })))}

Return concise JSON:
{
  "baselines": [{ "metric": "string", "mean": number, "median": number, "p95": number, "p99": number, "std_dev": number, "normal_range": { "min": number, "max": number }, "seasonality_detected": true|false, "seasonality_pattern": "string or null", "recommended_warning_threshold": number, "recommended_critical_threshold": number }],
  "data_quality": { "total_points": number, "anomalies_excluded": number, "coverage_pct": number },
  "baseline_confidence": number (0-1),
  "review_date": "string",
  "confidence_per_section": { "baselines": 0-1, "data_quality": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/root-cause-analysis', async (req: Request, res: Response) => {
  const { incident_description, symptoms, timeline, system_diagram, recent_changes, logs_sample } = req.body;
  if (!incident_description) return res.status(400).json({ error: 'incident_description is required' });
  if (!symptoms) return res.status(400).json({ error: 'symptoms is required' });
  if (!timeline) return res.status(400).json({ error: 'timeline is required' });
  try {
    const raw = await callClaude(`Perform root cause analysis for this incident. Apply the 5-Whys methodology, identify contributing factors, and recommend corrective actions. Incident: "${incident_description}" Symptoms: ${JSON.stringify(symptoms)} System diagram: "${system_diagram || 'not provided'}" Recent changes: ${JSON.stringify(recent_changes || [])} Logs sample (first 2000 chars): "${(logs_sample || '').slice(0, 2000)}" Timeline: ${JSON.stringify(timeline.slice(0, 50))}

Return concise JSON:
{
  "primary_root_cause": "string",
  "contributing_factors": [{ "factor": "string", "type": "direct|indirect|environmental", "evidence": "string" }],
  "five_whys": [{ "why": "string", "answer": "string" }],
  "timeline_analysis": [{ "event": "string", "significance": "high|medium|low", "related_to_root_cause": true|false }],
  "change_correlation": [{ "change": "string", "correlation": "likely|possible|unlikely", "reasoning": "string" }],
  "immediate_fix": "string",
  "long_term_fix": "string",
  "prevention_measures": ["string"],
  "risk_of_recurrence": "high|medium|low",
  "confidence_per_section": { "primary_root_cause": 0-1, "contributing_factors": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/capacity-forecast', async (req: Request, res: Response) => {
  const { usage_history, growth_rate, forecast_horizon, headroom_target } = req.body;
  if (!usage_history) return res.status(400).json({ error: 'usage_history is required' });
  try {
    const raw = await callClaude(`Forecast future capacity needs based on historical usage trends. Identify when limits will be hit and recommend scaling actions. Growth rate override: ${growth_rate || 'auto-detect'} Forecast horizon: "${forecast_horizon || '90d'}" Headroom target: ${headroom_target || 20}% Usage history: ${JSON.stringify(usage_history.slice(0, 20).map((m: any) => ({ ...m, values: m.values?.slice(0, 100), timestamps: m.timestamps?.slice(0, 100) })))}

Return concise JSON:
{
  "forecasts": [{ "metric": "string", "current_value": number, "forecast_30d": number, "forecast_60d": number, "forecast_90d": number, "trend": "growing|stable|declining", "growth_rate_pct": number, "capacity_limit_estimate": number or null, "days_until_limit": number or null, "urgency": "critical|soon|monitor|ok" }],
  "overall_capacity_health": "healthy|monitor|act_now|critical",
  "recommended_actions": [{ "action": "string", "timeline": "immediate|within_30d|within_90d", "expected_impact": "string" }],
  "cost_implications": "string",
  "confidence_per_section": { "forecasts": 0-1, "recommended_actions": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { monitor_action, system_context, risk_threshold, approval_required, change_window } = req.body;
  if (!monitor_action) return res.status(400).json({ error: 'monitor_action is required' });
  if (!system_context) return res.status(400).json({ error: 'system_context is required' });
  try {
    const raw = await callClaude(`Evaluate whether this monitoring action or remediation should be executed now. Check change windows, risk levels, and system health before proceeding. Monitor action: "${monitor_action}" Risk threshold: ${risk_threshold || 0.7} Approval required: ${approval_required !== undefined ? approval_required : false} Change window: "${change_window || 'not specified'}" System context: ${JSON.stringify(system_context)}

Return concise JSON:
{
  "execute": true|false,
  "confidence": 0-1,
  "risk_score": 0-1,
  "in_change_window": true|false,
  "system_health_gate": "passed|failed",
  "blocking_flags": ["string"],
  "warnings": ["string"],
  "recommended_action": "proceed|wait_for_change_window|escalate|cancel",
  "chain_to": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
