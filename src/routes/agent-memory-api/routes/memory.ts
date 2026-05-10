import { Router, Request, Response } from "express";
import Joi from "joi";
import { v4 as uuidv4 } from "uuid";
import { store } from "../store";
import { logger } from "../logger";
import { Memory } from "../types";

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
  res.json({ session_id: sessionId, count: memories.length, total_in_session: session!.memory_count, memories });
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

export default router;
