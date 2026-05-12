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
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Data Connector API', info: '/data-connector/info', openapi: '/data-connector/openapi.json', health: 'ok' });
});

router.post('/transform', async (req: Request, res: Response) => {
  const { data, from_format, to_format, options } = req.body;
  if (data === undefined || data === null) return res.status(400).json({ error: 'data is required' });
  if (!from_format) return res.status(400).json({ error: 'from_format is required' });
  if (!to_format) return res.status(400).json({ error: 'to_format is required' });
  try {
    const raw = await callClaude(`Transform this data from one format to another. Handle nested structures, arrays, and special characters. From format: "${from_format}" To format: "${to_format}" Options: ${JSON.stringify(options || {})}

Data: ${JSON.stringify(data).slice(0, 4000)}

Return concise JSON:
{
  "transformed_data": "string (the output data serialized as string)",
  "from_format": "string",
  "to_format": "string",
  "record_count": number,
  "field_count": number,
  "transformation_notes": ["string"],
  "data_types_detected": { "field_name": "detected_type" },
  "confidence_per_section": { "transformation": 0-1, "type_detection": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/validate', async (req: Request, res: Response) => {
  const { data, schema, strict_mode, coerce_types } = req.body;
  if (data === undefined || data === null) return res.status(400).json({ error: 'data is required' });
  if (!schema) return res.status(400).json({ error: 'schema is required' });
  try {
    const raw = await callClaude(`Validate this data against the provided schema. Identify all violations, type mismatches, missing required fields, and format errors. Strict mode: ${strict_mode || false} Coerce types: ${coerce_types || false}

Schema: ${JSON.stringify(schema).slice(0, 2000)}

Data (first 3000 chars): ${JSON.stringify(data).slice(0, 3000)}

Return concise JSON:
{
  "valid": true|false,
  "error_count": number,
  "warning_count": number,
  "errors": [{ "field": "string", "error_type": "missing_required|type_mismatch|format_error|constraint_violation|extra_field", "message": "string", "value_provided": "string" }],
  "warnings": [{ "field": "string", "message": "string" }],
  "valid_records": number,
  "invalid_records": number,
  "suggestions": [{ "field": "string", "suggestion": "string" }],
  "confidence_per_section": { "validation": 0-1, "suggestions": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/map-fields', async (req: Request, res: Response) => {
  const { source_data, source_schema, target_schema, mapping_hints, fuzzy_match } = req.body;
  if (!source_data) return res.status(400).json({ error: 'source_data is required' });
  if (!source_schema) return res.status(400).json({ error: 'source_schema is required' });
  if (!target_schema) return res.status(400).json({ error: 'target_schema is required' });
  try {
    const raw = await callClaude(`Map fields from source schema to target schema. Handle naming differences, nested paths, type conversions, and derived fields. Fuzzy match: ${fuzzy_match || false} Mapping hints: ${JSON.stringify(mapping_hints || {})}

Source schema: ${JSON.stringify(source_schema).slice(0, 1500)}
Target schema: ${JSON.stringify(target_schema).slice(0, 1500)}
Source data sample: ${JSON.stringify(source_data).slice(0, 1000)}

Return concise JSON:
{
  "field_mapping": [{ "source_field": "string", "target_field": "string", "transform": "none|rename|type_cast|concatenate|split|derive", "confidence": 0-1, "notes": "string" }],
  "unmapped_source_fields": ["string"],
  "unmapped_target_fields": ["string"],
  "required_target_fields_missing": ["string"],
  "mapping_confidence": 0-1,
  "transformed_sample": {},
  "manual_review_needed": [{ "field": "string", "reason": "string" }],
  "confidence_per_section": { "field_mapping": 0-1, "transformed_sample": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/merge', async (req: Request, res: Response) => {
  const { datasets, merge_strategy, conflict_resolution } = req.body;
  if (!datasets) return res.status(400).json({ error: 'datasets is required' });
  try {
    const raw = await callClaude(`Merge multiple datasets intelligently. Identify join keys, resolve conflicts, handle missing values, and preserve data integrity. Merge strategy: "${merge_strategy || 'outer'}" Conflict resolution: "${conflict_resolution || 'last'}"

Datasets: ${JSON.stringify(datasets.map((d: any) => ({ id: d.id, key_field: d.key_field, sample: Array.isArray(d.data) ? d.data.slice(0, 3) : d.data, count: Array.isArray(d.data) ? d.data.length : 1 }))).slice(0, 3000)}

Return concise JSON:
{
  "merge_strategy": "string",
  "record_count_before": { "dataset_id": number },
  "record_count_after": number,
  "conflicts_detected": number,
  "conflicts_resolved": [{ "key": "string", "field": "string", "values": ["string"], "resolution": "string" }],
  "data_quality_issues": [{ "issue": "string", "count": number, "recommendation": "string" }],
  "merged_data": [],
  "merge_summary": "string",
  "confidence_per_section": { "merge": 0-1, "conflict_resolution": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/enrich', async (req: Request, res: Response) => {
  const { records, enrich_fields, enrichment_type, context } = req.body;
  if (!records) return res.status(400).json({ error: 'records is required' });
  if (!enrich_fields) return res.status(400).json({ error: 'enrich_fields is required' });
  try {
    const raw = await callClaude(`Enrich these data records by deriving new fields, normalizing values, classifying records, and adding computed scores. Enrichment type: "${enrichment_type || 'derive'}" Fields to enrich: ${JSON.stringify(enrich_fields)} Context: "${context || 'general'}"

Records sample (first 5): ${JSON.stringify(Array.isArray(records) ? records.slice(0, 5) : records).slice(0, 3000)}
Total records: ${Array.isArray(records) ? records.length : 1}

Return concise JSON:
{
  "enriched_records": [],
  "enrichment_summary": { "field_name": { "type": "string", "values_enriched": number, "method": "string" } },
  "derived_fields": [{ "field": "string", "formula_or_logic": "string", "data_type": "string" }],
  "data_quality_improvements": [{ "before": "string", "after": "string", "impact": "string" }],
  "total_records": number,
  "enrichment_coverage": 0-1,
  "confidence_per_section": { "enrichment": 0-1, "derived_fields": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/deduplicate', async (req: Request, res: Response) => {
  const { records, match_fields, fuzzy_threshold, keep_strategy } = req.body;
  if (!records) return res.status(400).json({ error: 'records is required' });
  try {
    const raw = await callClaude(`Identify and remove duplicate records. Use exact and fuzzy matching on key fields, score match confidence, and preserve the best version of each record. Match fields: ${JSON.stringify(match_fields || [])} Fuzzy threshold: ${fuzzy_threshold || 0.85} Keep strategy: "${keep_strategy || 'highest_quality'}"

Records (first 20): ${JSON.stringify(Array.isArray(records) ? records.slice(0, 20) : records).slice(0, 3000)}
Total records: ${Array.isArray(records) ? records.length : 1}

Return concise JSON:
{
  "original_count": number,
  "duplicate_groups": [{ "records": [number], "match_type": "exact|fuzzy", "match_score": 0-1, "fields_matched": ["string"], "recommended_keep": number }],
  "duplicates_found": number,
  "unique_records": number,
  "deduplication_rate": 0-1,
  "sample_deduped_records": [],
  "match_field_analysis": [{ "field": "string", "uniqueness_score": 0-1, "null_rate": 0-1 }],
  "confidence_per_section": { "duplicate_detection": 0-1, "field_analysis": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/normalize', async (req: Request, res: Response) => {
  const { records, normalization_rules, auto_detect } = req.body;
  if (!records) return res.status(400).json({ error: 'records is required' });
  try {
    const raw = await callClaude(`Normalize and standardize data fields. Fix date formats, phone numbers, emails, addresses, currencies, and names to consistent formats. Auto-detect field types: ${auto_detect !== false} Normalization rules: ${JSON.stringify(normalization_rules || [])}

Records sample (first 5): ${JSON.stringify(Array.isArray(records) ? records.slice(0, 5) : records).slice(0, 3000)}
Total records: ${Array.isArray(records) ? records.length : 1}

Return concise JSON:
{
  "normalized_records": [],
  "normalizations_applied": [{ "field": "string", "from_format": "string", "to_format": "string", "records_affected": number, "examples": ["string"] }],
  "fields_auto_detected": [{ "field": "string", "detected_type": "string", "confidence": 0-1 }],
  "errors": [{ "field": "string", "value": "string", "error": "string" }],
  "normalization_coverage": 0-1,
  "data_quality_delta": { "before": 0-1, "after": 0-1 },
  "confidence_per_section": { "normalization": 0-1, "auto_detection": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/extract-schema', async (req: Request, res: Response) => {
  const { data, sample_size, include_stats } = req.body;
  if (!data) return res.status(400).json({ error: 'data is required' });
  try {
    const sample = Array.isArray(data) ? data.slice(0, sample_size || 100) : [data];
    const raw = await callClaude(`Infer the schema from sample data. Detect field types, required vs optional fields, value ranges, cardinality, and relationships between fields. Include stats: ${include_stats !== false}

Data sample (first ${Math.min(sample.length, 10)} records): ${JSON.stringify(sample.slice(0, 10)).slice(0, 3000)}
Total records analyzed: ${sample.length}

Return concise JSON:
{
  "schema": {
    "field_name": { "type": "string|number|boolean|array|object|date|null", "nullable": true|false, "required": true|false, "format": "string or null", "example_values": ["string"], "cardinality": "high|medium|low" }
  },
  "total_fields": number,
  "record_count_analyzed": number,
  "relationships": [{ "field_a": "string", "field_b": "string", "relationship": "foreign_key|correlated|derived" }],
  "data_quality_summary": [{ "field": "string", "null_rate": 0-1, "unique_rate": 0-1, "issues": ["string"] }],
  "recommended_schema_name": "string",
  "confidence_per_section": { "schema": 0-1, "relationships": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/sync-check', async (req: Request, res: Response) => {
  const { source_records, target_records, key_field, compare_fields, tolerance } = req.body;
  if (!source_records) return res.status(400).json({ error: 'source_records is required' });
  if (!target_records) return res.status(400).json({ error: 'target_records is required' });
  if (!key_field) return res.status(400).json({ error: 'key_field is required' });
  try {
    const raw = await callClaude(`Compare two datasets to identify sync status — records only in source, only in target, in both but different, and truly matching. Key field: "${key_field}" Compare fields: ${JSON.stringify(compare_fields || [])} Tolerance: ${JSON.stringify(tolerance || {})}

Source records (first 10 of ${Array.isArray(source_records) ? source_records.length : 1}): ${JSON.stringify(Array.isArray(source_records) ? source_records.slice(0, 10) : source_records).slice(0, 2000)}
Target records (first 10 of ${Array.isArray(target_records) ? target_records.length : 1}): ${JSON.stringify(Array.isArray(target_records) ? target_records.slice(0, 10) : target_records).slice(0, 2000)}

Return concise JSON:
{
  "total_source": number,
  "total_target": number,
  "in_sync": number,
  "only_in_source": number,
  "only_in_target": number,
  "differs": number,
  "sync_rate": 0-1,
  "differences": [{ "key": "string", "field": "string", "source_value": "string", "target_value": "string", "diff_type": "missing|added|changed" }],
  "sync_health": "healthy|degraded|critical",
  "recommended_actions": [{ "action": "string", "records_affected": number, "priority": "high|medium|low" }],
  "confidence_per_section": { "sync_analysis": 0-1, "differences": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { data_operation, data_context, quality_threshold, risk_level } = req.body;
  if (!data_operation) return res.status(400).json({ error: 'data_operation is required' });
  if (!data_context) return res.status(400).json({ error: 'data_context is required' });
  try {
    const raw = await callClaude(`Evaluate whether this data operation should be executed based on data quality, completeness, and risk level. Data operation: "${data_operation}" Quality threshold: ${quality_threshold || 0.7} Risk level: "${risk_level || 'medium'}" Data context: ${JSON.stringify(data_context).slice(0, 2000)}

Return concise JSON:
{
  "execute": true|false,
  "confidence": 0-1,
  "risk_score": 0-1,
  "data_quality_score": 0-1,
  "blocking_flags": ["string"],
  "warnings": ["string"],
  "recommended_action": "proceed|validate_first|enrich_first|cancel",
  "chain_to": ["string"],
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
const REQUIRED_SCOPES: string[] = ["data:read", "data:extract", "data:monitor"];
const EXECUTION_AUTHORITY: string = "low";
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
  const wf = createWorkflow(workflow_id, goal || 'execute', steps || ["validate_inputs", "fetch_source", "extract_structure", "score_confidence", "finalize"], meta || {});
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
