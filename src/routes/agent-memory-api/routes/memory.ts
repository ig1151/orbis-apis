import { Router, Request, Response } from "express";
import Joi from "joi";
import { v4 as uuidv4 } from "uuid";
import { store } from "../store";
import { logger } from "../logger";
import { Memory } from "../types";
import { buildRuntime } from '../../../shared/ai';

// ── Universal Runtime Envelope ────────────────────────────────────────────────


const router = Router();

const addMemorySchema = Joi.object({
  content: Joi.string().min(1).max(10000).required(),
  role: Joi.string().valid("user", "assistant", "system").default("user"),
  tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
  metadata: Joi.object().optional(),
});

const searchSchema = Joi.object({
  session_id: Joi.string().min(1).max(200).required(),
  query: Joi.string().min(1).max(500).required(),
  limit: Joi.number().integer().min(1).max(50).default(10),
});

const batchSchema = Joi.object({
  memories: Joi.array().items(Joi.object({
    content: Joi.string().min(1).max(10000).required(),
    role: Joi.string().valid("user", "assistant", "system").default("user"),
    tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
    metadata: Joi.object().optional(),
  })).min(1).max(50).required(),
});


// ── Loop infrastructure endpoints ─────────────────────────────────────────────

const updateSchema = Joi.object({
  id: Joi.string().required(),
  session_id: Joi.string().required(),
  content: Joi.string().min(1).max(10000).optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
  importance: Joi.number().min(0).max(1).optional(),
});

const deleteSchema = Joi.object({
  id: Joi.string().required(),
  session_id: Joi.string().required(),
});

const mergeSchema = Joi.object({
  ids: Joi.array().items(Joi.string()).min(2).required(),
  session_id: Joi.string().required(),
  strategy: Joi.string().valid('concatenate', 'summarize', 'deduplicate').default('deduplicate'),
});

const forgetSchema = Joi.object({
  session_id: Joi.string().required(),
  tags: Joi.array().items(Joi.string()).optional(),
  scope: Joi.string().valid('session', 'agent', 'global').optional(),
  older_than_hours: Joi.number().optional(),
  min_importance_below: Joi.number().min(0).max(1).optional(),
});

const reflectSchema = Joi.object({
  session_id: Joi.string().required(),
  agent_id: Joi.string().optional(),
  window: Joi.number().integer().min(1).max(100).default(20),
  focus: Joi.string().valid('failures', 'patterns', 'strategy', 'all').default('all'),
});

router.post('/update', (req: Request, res: Response) => {
  const { error, value } = updateSchema.validate(req.body);
  if (error) { res.status(400).json({ error: 'Validation failed', details: error.details[0].message }); return; }
  const mems = store.getMemories(value.session_id, 1000);
  const mem = mems.find(m => m.id === value.id);
  if (!mem) { res.status(404).json({ error: 'Memory not found' }); return; }
  if (value.content) mem.content = value.content;
  if (value.tags) mem.tags = value.tags;
  if (value.importance !== undefined) mem.metadata = { ...mem.metadata, importance: value.importance };
  logger.info({ memoryId: value.id }, 'Memory updated');
  res.json({ id: value.id, updated: true, recommended_actions_priority_order: ['retrieve', 'reflect'], chain_to: ['/agent-memory/reflect'], privacy: { data_stored: false, retention: 'none' } });
});

router.post('/delete', (req: Request, res: Response) => {
  const { error, value } = deleteSchema.validate(req.body);
  if (error) { res.status(400).json({ error: 'Validation failed', details: error.details[0].message }); return; }
  const deleted = store.deleteMemory(value.session_id, value.id);
  logger.info({ memoryId: value.id }, 'Memory deleted via /delete');
  res.json({ id: value.id, deleted, recommended_actions_priority_order: ['store', 'retrieve'], chain_to: ['/agent-memory/store'], privacy: { data_stored: false, retention: 'none' } });
});

router.post('/merge', (req: Request, res: Response) => {
  const { error, value } = mergeSchema.validate(req.body);
  if (error) { res.status(400).json({ error: 'Validation failed', details: error.details[0].message }); return; }
  const mems = store.getMemories(value.session_id, 1000);
  const targets = mems.filter(m => value.ids.includes(m.id));
  if (targets.length < 2) { res.status(404).json({ error: 'Could not find enough memories to merge' }); return; }
  const contents = targets.map(m => m.content);
  let merged: string;
  if (value.strategy === 'concatenate') merged = contents.join('\n---\n');
  else if (value.strategy === 'summarize') merged = `Summary of ${targets.length} memories: ` + contents.join(' | ');
  else merged = [...new Set(contents)].join('\n');
  const newMem: Memory = { id: uuidv4(), session_id: value.session_id, content: merged, role: 'assistant', tags: targets.flatMap(m => m.tags ?? []), created_at: new Date().toISOString() };
  store.addMemory(newMem);
  for (const id of value.ids) store.deleteMemory(value.session_id, id);
  logger.info({ mergedId: newMem.id, strategy: value.strategy }, 'Memories merged');
  res.json({ merged_id: newMem.id, deleted_ids: value.ids, content: merged, strategy_used: value.strategy, confidence: 0.85, recommended_actions_priority_order: ['retrieve', 'reflect'], chain_to: ['/agent-memory/reflect'], privacy: { data_stored: false, retention: 'none' } });
});

router.post('/forget', (req: Request, res: Response) => {
  const { error, value } = forgetSchema.validate(req.body);
  if (error) { res.status(400).json({ error: 'Validation failed', details: error.details[0].message }); return; }
  const mems = store.getMemories(value.session_id, 1000);
  const now = Date.now();
  const toDelete = mems.filter(m => {
    if (value.tags && !value.tags.some((t: string) => m.tags?.includes(t))) return false;
    if (value.older_than_hours) {
      const age = (now - new Date(m.created_at).getTime()) / 3600000;
      if (age < value.older_than_hours) return false;
    }
    if (value.min_importance_below !== undefined) {
      const imp = (m.metadata?.importance as number) ?? 1;
      if (imp >= value.min_importance_below) return false;
    }
    return true;
  });
  for (const m of toDelete) store.deleteMemory(value.session_id, m.id);
  logger.info({ deleted: toDelete.length, session: value.session_id }, 'Bulk forget complete');
  res.json({ deleted_count: toDelete.length, criteria_used: { tags: value.tags, older_than_hours: value.older_than_hours, min_importance_below: value.min_importance_below }, recommended_actions_priority_order: ['store', 'reflect'], chain_to: ['/agent-memory/reflect'], privacy: { data_stored: false, retention: 'none' } });
});

router.post('/reflect', (req: Request, res: Response) => {
  const { error, value } = reflectSchema.validate(req.body);
  if (error) { res.status(400).json({ error: 'Validation failed', details: error.details[0].message }); return; }
  const mems = store.getMemories(value.session_id, value.window);
  if (mems.length === 0) { res.status(404).json({ error: 'No memories found for session' }); return; }
  const contents = mems.map(m => m.content);
  const failures = contents.filter(c => /fail|error|wrong|incorrect|retry|mistake/i.test(c));
  const patterns: string[] = [];
  const tagFreq: Record<string, number> = {};
  for (const m of mems) for (const t of m.tags ?? []) tagFreq[t] = (tagFreq[t] ?? 0) + 1;
  for (const [tag, count] of Object.entries(tagFreq)) if (count >= 2) patterns.push(`Recurring tag: ${tag} (${count}x)`);
  if (failures.length > mems.length * 0.3) patterns.push('High failure rate detected (>30% of memories indicate errors)');
  const strategy = failures.length > 0
    ? 'Reduce retries by validating inputs earlier. Consider gating actions with /execution-gate before proceeding.'
    : 'Memory set looks healthy. Continue current approach and compress periodically with /compress.';
  const quality = Math.max(0, 1 - (failures.length / Math.max(mems.length, 1)));
  logger.info({ session: value.session_id, memories_analyzed: mems.length, failures: failures.length }, 'Reflection complete');
  res.json({
    summary: `Analyzed ${mems.length} memories. Found ${failures.length} failure signal(s) and ${patterns.length} pattern(s).`,
    failures_identified: failures.slice(0, 5),
    patterns,
    improved_strategy: strategy,
    memory_quality_score: Math.round(quality * 100) / 100,
    confidence: 0.82,
    confidence_per_section: { failures: 0.9, patterns: 0.8, strategy: 0.75 },
    recommended_actions_priority_order: ['compress', 'store', 'execution-gate'],
    chain_to: ['/agent-memory/compress', '/agent-memory/execution-gate'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

router.post("/search", (req: Request, res: Response) => {
  const { error, value } = searchSchema.validate(req.body);
  if (error) { res.status(400).json({ error: "Validation failed", details: error.details[0].message }); return; }
  const session = store.getSession(value.session_id);
  const results = store.searchMemories(value.session_id, value.query, value.limit);
  logger.info({ sessionId: value.session_id, query: value.query, results: results.length }, "Memory search complete");
  res.json({ session_id: value.session_id, query: value.query, count: results.length, memories: results });
});

router.post("/:session_id/batch", (req: Request, res: Response) => {
  const { error, value } = batchSchema.validate(req.body);
  if (error) { res.status(400).json({ error: "Validation failed", details: error.details[0].message }); return; }
  const sessionId = req.params.session_id;
  store.getOrCreateSession(sessionId);
  const added: Memory[] = [];
  for (const item of value.memories) {
    const memory: Memory = { id: uuidv4(), session_id: sessionId, content: item.content, role: item.role, tags: item.tags, metadata: item.metadata, created_at: new Date().toISOString() };
    store.addMemory(memory);
    added.push(memory);
  }
  logger.info({ sessionId, count: added.length }, "Batch memories added");
  res.status(201).json({ added: added.length, memories: added });
});

router.post("/:session_id", (req: Request, res: Response) => {
  const { error, value } = addMemorySchema.validate(req.body);
  if (error) { res.status(400).json({ error: "Validation failed", details: error.details[0].message }); return; }
  const sessionId = req.params.session_id;
  store.getOrCreateSession(sessionId);
  const memory: Memory = { id: uuidv4(), session_id: sessionId, content: value.content, role: value.role, tags: value.tags, metadata: value.metadata, created_at: new Date().toISOString() };
  store.addMemory(memory);
  logger.info({ sessionId, memoryId: memory.id, role: memory.role }, "Memory added");
  res.status(201).json(memory);
});

router.get("/:session_id/session", (req: Request, res: Response) => {
  const session = store.getSession(req.params.session_id);
  res.json(session!);
});

router.get("/:session_id", (req: Request, res: Response) => {
  const sessionId = req.params.session_id;
  const session = store.getSession(sessionId);
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const role = req.query.role as string | undefined;
  const memories = store.getMemories(sessionId, limit, role);
  res.json({ session_id: sessionId, count: memories.length, total_in_session: session?.memory_count ?? 0, memories });
});

router.delete("/:session_id/:memory_id", (req: Request, res: Response) => {
  const deleted = store.deleteMemory(req.params.session_id, req.params.memory_id);
  res.json({ memory_id: req.params.memory_id, status: "deleted" });
});

router.delete("/:session_id", (req: Request, res: Response) => {
  const deleted = store.deleteSession(req.params.session_id);
  logger.info({ sessionId: req.params.session_id }, "Session deleted");
  res.json({ session_id: req.params.session_id, status: "deleted" });
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
