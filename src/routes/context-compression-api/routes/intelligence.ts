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

function compressionMeta(originalLen: number, compressedLen: number) {
  const ratio = originalLen > 0 ? compressedLen / originalLen : 1;
  return {
    compression_provenance: {
      strategy_selected: ratio < 0.3 ? 'aggressive' : ratio < 0.6 ? 'balanced' : 'light',
      irreversible_loss_warning: ratio < 0.4,
      inferred_vs_stated_ratio: Math.round((1 - ratio) * 100) / 100,
      reconstruction_fidelity: ratio < 0.3 ? 'low' : ratio < 0.6 ? 'medium' : 'high',
    },
    retrieval_embeddings_ready: false,
    retry_policy: {
      max_attempts: 3,
      backoff_strategy: 'exponential',
      backoff_base_ms: 500,
      safe_to_retry: true,
    },
  };
}

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Context Compression API', info: '/context-compression/info', openapi: '/context-compression/openapi.json', health: 'ok' });
});

// POST /compress-transcript
router.post('/compress-transcript', async (req: Request, res: Response) => {
  const { transcript, target_tokens, focus = 'all', format = 'summary' } = req.body;
  if (!transcript) return res.status(400).json({ error: 'transcript is required' });
  const origLen = transcript.length;
  try {
    const raw = await callClaude(`Compress this transcript into a dense, information-rich format. Target: ${target_tokens || 500} tokens. Focus: "${focus}" (all|actions|decisions|facts). Output format: "${format}" (summary|bullets|structured).

Transcript (first 4000 chars): "${transcript.slice(0, 4000)}"

Return concise JSON:
{
  "compressed_text": "string (the compressed output)",
  "original_tokens_estimate": number,
  "compressed_tokens_estimate": number,
  "compression_ratio": number,
  "information_retained_pct": number,
  "key_facts_preserved": ["string"],
  "information_lost": ["string (what was deliberately dropped)"],
  "reconstruction_hints": ["string (clues for reconstruction if needed)"],
  "confidence_per_section": { "compressed_text": 0-1, "key_facts_preserved": 0-1, "information_lost": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    const compressedLen = (parsed.compressed_text || '').length;
    res.json({ ...parsed, ...compressionMeta(origLen, compressedLen) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /compress-agent-chain
router.post('/compress-agent-chain', async (req: Request, res: Response) => {
  const { chain, goal, preserve_decisions = true } = req.body;
  if (!chain) return res.status(400).json({ error: 'chain is required' });
  try {
    const chainStr = typeof chain === 'string' ? chain : JSON.stringify(chain).slice(0, 4000);
    const raw = await callClaude(`Compress this agent execution chain into reusable compact state. Goal: "${goal || 'not specified'}". Preserve decisions: ${preserve_decisions}.

Agent chain: "${chainStr.slice(0, 4000)}"

Return concise JSON:
{
  "compact_state": "string (compressed chain representation)",
  "goal_achieved": true|false,
  "critical_decisions": [{ "step": "string", "decision": "string", "outcome": "string" }],
  "tool_calls_summary": [{ "tool": "string", "count": number, "avg_result": "string" }],
  "dropped_steps": ["string (redundant/failed steps removed)"],
  "reusable_context": "string (what future agents can reuse from this chain)",
  "original_steps_estimate": number,
  "compressed_steps": number,
  "tokens_saved_estimate": number,
  "confidence_per_section": { "compact_state": 0-1, "critical_decisions": 0-1, "reusable_context": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /compress-memory
router.post('/compress-memory', async (req: Request, res: Response) => {
  const { memory_logs, retention_strategy = 'semantic', max_entries } = req.body;
  if (!memory_logs) return res.status(400).json({ error: 'memory_logs is required' });
  try {
    const logsStr = typeof memory_logs === 'string' ? memory_logs : JSON.stringify(memory_logs).slice(0, 4000);
    const raw = await callClaude(`Compress episodic memory logs into a retrievable snapshot. Retention strategy: "${retention_strategy}" (semantic|temporal|importance). Max output entries: ${max_entries || 20}.

Memory logs: "${logsStr.slice(0, 4000)}"

Return concise JSON:
{
  "compressed_memory": [{ "id": "string", "summary": "string", "importance": "high|medium|low", "tags": ["string"], "timestamp_range": "string" }],
  "total_input_entries": number,
  "total_output_entries": number,
  "compression_ratio": number,
  "semantic_clusters": [{ "cluster": "string", "entry_count": number, "summary": "string" }],
  "forgotten_entries": ["string (what was dropped and why)"],
  "retrieval_index": [{ "keyword": "string", "relevant_entry_ids": ["string"] }],
  "confidence_per_section": { "compressed_memory": 0-1, "semantic_clusters": 0-1, "retrieval_index": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    const meta = compressionMeta(
      typeof memory_logs === 'string' ? memory_logs.length : JSON.stringify(memory_logs).length,
      JSON.stringify(parsed.compressed_memory || []).length
    );
    res.json({ ...parsed, ...meta, retrieval_embeddings_ready: true, semantic_index: { cluster_count: (parsed.semantic_clusters || []).length, indexed_keywords: (parsed.retrieval_index || []).length, embedding_model: 'none — keyword index only' } });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /extract-keypoints
router.post('/extract-keypoints', async (req: Request, res: Response) => {
  const { content, max_points = 10, content_type = 'document' } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  try {
    const raw = await callClaude(`Extract only the essential key points from this ${content_type}. Maximum ${max_points} points. Every word must earn its place.

Content (first 4000 chars): "${content.slice(0, 4000)}"

Return concise JSON:
{
  "key_points": [{ "point": "string", "importance": "critical|high|medium", "category": "string", "supports": ["string (other points this supports)"] }],
  "one_line_summary": "string (the entire content in one sentence)",
  "core_argument": "string (central thesis or finding)",
  "supporting_evidence": ["string"],
  "actionable_items": ["string"],
  "tokens_in": number,
  "tokens_out": number,
  "confidence_per_section": { "key_points": 0-1, "core_argument": 0-1, "actionable_items": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /token-estimate
router.post('/token-estimate', async (req: Request, res: Response) => {
  const { content, target_compression_pct = 70 } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  try {
    const charCount = content.length;
    const estimatedTokens = Math.round(charCount / 4);
    const compressedTokens = Math.round(estimatedTokens * (1 - target_compression_pct / 100));
    const savedTokens = estimatedTokens - compressedTokens;
    const costPerToken = 0.000003;
    res.json({
      original_chars: charCount,
      original_tokens_estimate: estimatedTokens,
      target_compression_pct,
      compressed_tokens_estimate: compressedTokens,
      tokens_saved: savedTokens,
      cost_saved_usd: parseFloat((savedTokens * costPerToken).toFixed(6)),
      cost_saved_per_1000_calls_usd: parseFloat((savedTokens * costPerToken * 1000).toFixed(4)),
      recommended_strategy: estimatedTokens > 8000 ? 'compress-transcript' : estimatedTokens > 2000 ? 'extract-keypoints' : 'already_compact',
      compression_worthwhile: savedTokens > 200,
      confidence_per_section: { token_estimate: 0.85, cost_estimate: 0.9 },
      recommended_actions_priority_order: ['POST /compress-transcript', 'POST /extract-keypoints'],
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /compress-document
router.post('/compress-document', async (req: Request, res: Response) => {
  const { document, document_type = 'general', target_length = 'medium', preserve_structure = true } = req.body;
  if (!document) return res.status(400).json({ error: 'document is required' });
  const origLen = document.length;
  try {
    const raw = await callClaude(`Compress this ${document_type} document into structured essentials. Target length: "${target_length}" (short|medium|long). Preserve structure: ${preserve_structure}.

Document (first 4000 chars): "${document.slice(0, 4000)}"

Return concise JSON:
{
  "compressed_document": "string",
  "document_type": "${document_type}",
  "sections_preserved": ["string"],
  "sections_dropped": ["string"],
  "entities_extracted": [{ "type": "person|org|date|amount|concept", "value": "string" }],
  "key_numbers": [{ "value": "string", "context": "string" }],
  "compression_ratio": number,
  "readability_score": 0-100,
  "confidence_per_section": { "compressed_document": 0-1, "entities_extracted": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    const compressedLen = (parsed.compressed_document || '').length;
    res.json({ ...parsed, ...compressionMeta(origLen, compressedLen) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /decompress
router.post('/decompress', async (req: Request, res: Response) => {
  const { compressed_text, reconstruction_goal, original_format = 'prose' } = req.body;
  if (!compressed_text) return res.status(400).json({ error: 'compressed_text is required' });
  try {
    const raw = await callClaude(`Reconstruct a full, coherent document from this compressed text. Goal: "${reconstruction_goal || 'restore readability'}". Target format: "${original_format}".

Compressed text: "${compressed_text.slice(0, 3000)}"

Return concise JSON:
{
  "reconstructed_text": "string",
  "inferred_context": ["string (what was inferred vs. stated)"],
  "uncertainty_flags": ["string (sections where reconstruction is uncertain)"],
  "reconstruction_quality": "high|medium|low",
  "tokens_in": number,
  "tokens_out": number,
  "confidence_per_section": { "reconstructed_text": 0-1, "inferred_context": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { content, compression_type } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  const charCount = (content || '').length;
  res.json({
    execution_ready: charCount > 100,
    compression_type: compression_type || 'auto',
    content_length: charCount,
    recommended_endpoint: charCount > 8000 ? '/compress-transcript' : charCount > 2000 ? '/compress-document' : '/extract-keypoints',
    next_api: 'agent-memory',
    next_endpoint: '/store',
    blocking_flags: charCount < 100 ? ['CONTENT_TOO_SHORT'] : [],
    flag_definitions: {
      CONTENT_TOO_SHORT: 'Content under 100 characters — compression not worthwhile',
      NO_CONTENT: 'No content provided',
    },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /compress (one-call workflow)
router.post('/compress', async (req: Request, res: Response) => {
  const { content, content_type = 'document', goal, max_tokens } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  const origLen = content.length;
  try {
    const raw = await callClaude(`ONE-CALL compression workflow. Content type: "${content_type}". Goal: "${goal || 'maximize information density'}". Max output tokens: ${max_tokens || 500}.

Content (first 4000 chars): "${content.slice(0, 4000)}"

Return concise JSON:
{
  "compressed_output": "string (the final compressed content)",
  "compression_strategy_used": "string",
  "original_tokens_estimate": number,
  "compressed_tokens_estimate": number,
  "compression_ratio": number,
  "tokens_saved": number,
  "cost_saved_usd": number,
  "key_facts": ["string"],
  "dropped_content": ["string"],
  "reconstruction_possible": true|false,
  "next_step": "string (suggested next action with this compressed content)",
  "confidence_per_section": { "compressed_output": 0-1, "key_facts": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    const compressedLen = (parsed.compressed_output || '').length;
    res.json({ ...parsed, ...compressionMeta(origLen, compressedLen) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});


// ── Event Store + Governance ──────────────────────────────────────────────────
const eventStore: Record<string, any[]> = {};
function emitEvent(execution_id: string, event: string, step: string, data: any = {}) {
  if (!eventStore[execution_id]) eventStore[execution_id] = [];
  eventStore[execution_id].push({ event_id: `evt_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    event, step, timestamp: new Date().toISOString(), execution_id, data });
}
const REQUIRED_SCOPES: string[] = ["compression:read", "compression:write", "compression:execute"];
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
  existing.forEach((evt: any) => { res.write(`data: ${JSON.stringify(evt)}\n\n`); index++; });
  const interval = setInterval(() => {
    const current = eventStore[req.params.execution_id] || [];
    while (index < current.length) { res.write(`data: ${JSON.stringify(current[index])}\n\n`); index++; }
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
  const wf = createWorkflow(workflow_id, goal || 'compress', steps || ["estimate_tokens", "select_strategy", "compress_content", "validate_output", "store_result"], meta || {});
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
