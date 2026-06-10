import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';
import { buildRuntime } from '../../../shared/ai';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';

function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return `kge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

// GET / discovery
router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Knowledge Graph API', info: '/knowledge-graph/info', openapi: '/knowledge-graph/openapi.json', health: 'ok' });
});

// POST /extract-entities
router.post('/extract-entities', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Extract all named entities from the following text. Be thorough and precise.

Text (first 4000 chars): "${text.slice(0, 4000)}"

Return JSON:
{
  "entities": [{ "entity": "string", "type": "person|org|location|product|concept|event|date|amount", "confidence": 0-1, "mentions": number, "aliases": ["string"], "context_snippet": "string" }],
  "entity_count": number,
  "top_entities": ["string"],
  "entity_types_found": ["string"],
  "confidence_per_section": { "entities": 0-1, "top_entities": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /extract-relationships
router.post('/extract-relationships', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Extract all relationships between entities from the following text.

Text (first 4000 chars): "${text.slice(0, 4000)}"

Return JSON:
{
  "relationships": [{ "subject": "string", "predicate": "string", "object": "string", "relationship_type": "owns|employs|partners_with|competes_with|acquired|invested_in|located_in|reports_to|other", "strength": "strong|moderate|weak", "bidirectional": true|false, "evidence_quote": "string" }],
  "relationship_count": number,
  "strongest_relationships": ["string"],
  "graph_density": "low|medium|high",
  "confidence_per_section": { "relationships": 0-1, "strongest_relationships": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /build-graph
router.post('/build-graph', async (req: Request, res: Response) => {
  const { text, entities_and_relationships } = req.body;
  if (!text && !entities_and_relationships) return res.status(400).json({ error: 'text or entities_and_relationships is required' });
  try {
    const input = text ? text.slice(0, 4000) : JSON.stringify(entities_and_relationships).slice(0, 4000);
    const raw = await callClaude(`Build a structured knowledge graph from the following input.

Input (first 4000 chars): "${input}"

Return JSON:
{
  "nodes": [{ "id": "string", "label": "string", "type": "string", "weight": number }],
  "edges": [{ "source": "string", "target": "string", "label": "string", "weight": number }],
  "clusters": [{ "cluster_id": "string", "members": ["string"], "theme": "string" }],
  "central_nodes": ["string"],
  "isolated_nodes": ["string"],
  "graph_stats": { "node_count": number, "edge_count": number, "avg_degree": number, "diameter_estimate": number },
  "confidence_per_section": { "nodes": 0-1, "edges": 0-1, "clusters": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /query-graph
router.post('/query-graph', async (req: Request, res: Response) => {
  const { graph_data, query } = req.body;
  if (!graph_data || !query) return res.status(400).json({ error: 'graph_data and query are required' });
  try {
    const graphStr = typeof graph_data === 'string' ? graph_data : JSON.stringify(graph_data).slice(0, 3000);
    const raw = await callClaude(`Answer this natural language query using the provided knowledge graph.

Graph data: "${graphStr}"
Query: "${query}"

Return JSON:
{
  "query": "${query}",
  "answer": "string",
  "relevant_nodes": ["string"],
  "relevant_edges": ["string"],
  "reasoning_path": ["string"],
  "confidence": 0-1,
  "confidence_per_section": { "answer": 0-1, "reasoning_path": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /find-paths
router.post('/find-paths', async (req: Request, res: Response) => {
  const { graph_data, source_entity, target_entity } = req.body;
  if (!graph_data || !source_entity || !target_entity) return res.status(400).json({ error: 'graph_data, source_entity, and target_entity are required' });
  try {
    const graphStr = typeof graph_data === 'string' ? graph_data : JSON.stringify(graph_data).slice(0, 3000);
    const raw = await callClaude(`Find all paths between source and target in this knowledge graph.

Graph data: "${graphStr}"
Source: "${source_entity}"
Target: "${target_entity}"

Return JSON:
{
  "paths": [{ "nodes": ["string"], "edges": ["string"], "length": number, "strength": number }],
  "shortest_path": { "nodes": ["string"], "edges": ["string"], "length": number },
  "strongest_path": { "nodes": ["string"], "edges": ["string"], "strength": number },
  "no_path_found": true|false,
  "indirect_connections": ["string"],
  "confidence_per_section": { "paths": 0-1, "shortest_path": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /cluster-entities
router.post('/cluster-entities', async (req: Request, res: Response) => {
  const { text, entities } = req.body;
  if (!text && !entities) return res.status(400).json({ error: 'text or entities is required' });
  try {
    const input = text ? text.slice(0, 4000) : JSON.stringify(entities).slice(0, 4000);
    const raw = await callClaude(`Cluster entities into thematic groups from the following input.

Input: "${input}"

Return JSON:
{
  "clusters": [{ "cluster_id": "string", "theme": "string", "entities": ["string"], "size": number, "cohesion_score": 0-1, "dominant_entity": "string" }],
  "outliers": ["string"],
  "cross_cluster_links": ["string"],
  "community_structure": "hierarchical|flat|star|network",
  "confidence_per_section": { "clusters": 0-1, "community_structure": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /update-graph
router.post('/update-graph', async (req: Request, res: Response) => {
  const { existing_graph, new_text, merge_strategy = 'additive' } = req.body;
  if (!existing_graph || !new_text) return res.status(400).json({ error: 'existing_graph and new_text are required' });
  try {
    const graphStr = typeof existing_graph === 'string' ? existing_graph.slice(0, 2000) : JSON.stringify(existing_graph).slice(0, 2000);
    const raw = await callClaude(`You are a knowledge graph update specialist. Update an existing knowledge graph by incorporating new information from additional text. Identify new entities and relationships, resolve conflicts with existing nodes, and return the updated graph.

Existing graph: "${graphStr}"
New text: "${String(new_text).slice(0, 2000)}"
Merge strategy: "${merge_strategy}" (additive = add new nodes/edges | replace = update existing nodes | full = rebuild)

Identify what is new vs. already in the graph. Return the delta (added/modified/removed nodes and edges) plus the full updated graph.

Return JSON:
{
  "delta": {
    "nodes_added": [{ "id": "string", "label": "string", "type": "string" }],
    "nodes_modified": [{ "id": "string", "label": "string", "change": "string" }],
    "edges_added": [{ "source": "string", "target": "string", "label": "string" }],
    "conflicts_resolved": ["string"]
  },
  "updated_graph": {
    "nodes": [{ "id": "string", "label": "string", "type": "string", "weight": 0.0 }],
    "edges": [{ "source": "string", "target": "string", "label": "string", "weight": 0.0 }],
    "clusters": [{ "cluster_id": "string", "theme": "string", "entities": ["string"] }]
  },
  "graph_version": "string (e.g. v2, v3)",
  "knowledge_gain": "high|medium|low",
  "confidence_per_section": { "delta": 0.0, "updated_graph": 0.0 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /merge-graphs
router.post('/merge-graphs', async (req: Request, res: Response) => {
  const { graph_a, graph_b, dedup_strategy = 'similarity' } = req.body;
  if (!graph_a || !graph_b) return res.status(400).json({ error: 'graph_a and graph_b are required' });
  try {
    const graphAStr = typeof graph_a === 'string' ? graph_a.slice(0, 1500) : JSON.stringify(graph_a).slice(0, 1500);
    const graphBStr = typeof graph_b === 'string' ? graph_b.slice(0, 1500) : JSON.stringify(graph_b).slice(0, 1500);
    const raw = await callClaude(`You are a knowledge graph merge specialist. Merge two knowledge graphs into a unified graph, resolving entity duplicates, merging overlapping relationships, and producing a coherent combined graph.

Graph A: "${graphAStr}"
Graph B: "${graphBStr}"
Dedup strategy: "${dedup_strategy}" (similarity = merge similar entities | exact = merge only exact matches | aggressive = merge liberally)

Identify overlapping entities, merge them, combine edges, and produce the unified graph. Report what was merged and what remained distinct.

Return JSON:
{
  "merged_entities": ["string (entity pairs that were merged)"],
  "unique_to_a": ["string (entities only in graph A)"],
  "unique_to_b": ["string (entities only in graph B)"],
  "merged_graph": {
    "nodes": [{ "id": "string", "label": "string", "type": "string", "weight": 0.0, "source": "A|B|both" }],
    "edges": [{ "source": "string", "target": "string", "label": "string", "weight": 0.0 }],
    "clusters": [{ "cluster_id": "string", "theme": "string", "entities": ["string"] }],
    "central_nodes": ["string"]
  },
  "merge_quality": "high|medium|low",
  "conflict_resolutions": ["string"],
  "confidence_per_section": { "merged_entities": 0.0, "merged_graph": 0.0 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  const textLength = (text || '').length;
  const wordCount = text.trim().split(/\s+/).length;
  const entityDensityEstimate = wordCount > 100 ? 'high' : wordCount > 30 ? 'medium' : 'low';
  res.json({
    execution_ready: textLength > 50,
    text_length: textLength,
    entity_density_estimate: entityDensityEstimate,
    recommended_endpoint: textLength > 2000 ? '/extract' : '/extract-entities',
    blocking_flags: textLength < 50 ? ['TEXT_TOO_SHORT'] : [],
    recommended_next_api: 'due-diligence',
    execution_priority: 'medium',
    automation_safe: true,
    trace_id: traceId(),
    confidence_per_section: { execution_ready: 0.95, entity_density_estimate: 0.8 },
    privacy: { data_stored: false, retention: 'none' },
    computed_at: new Date().toISOString(),
  });
});

// POST /extract (one-call workflow)
router.post('/extract', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`ONE-CALL knowledge graph extraction. Extract entities, relationships, clusters, central entities, and key insights from the following text.

Text (first 4000 chars): "${text.slice(0, 4000)}"

Return JSON:
{
  "entities": [{ "entity": "string", "type": "person|org|location|product|concept|event|date|amount", "confidence": 0-1 }],
  "relationships": [{ "subject": "string", "predicate": "string", "object": "string", "relationship_type": "string", "strength": "strong|moderate|weak" }],
  "top_clusters": [{ "cluster_id": "string", "theme": "string", "entities": ["string"] }],
  "central_entities": ["string"],
  "key_insights": ["string"],
  "knowledge_density": "low|medium|high",
  "confidence_per_section": { "entities": 0-1, "relationships": 0-1, "top_clusters": 0-1, "key_insights": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Governance + Workflow ─────────────────────────────────────────────────────
const eventStore: Record<string, any[]> = {};
const REQUIRED_SCOPES = ['graph:read', 'graph:extract', 'graph:build'];
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
router.post('/workflow/start', (req: any, res: any) => { const { goal, steps } = req.body || {}; const id = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; workflowStore[id] = { workflow_id: id, goal: goal || 'default goal', steps: steps || ['extract_entities', 'extract_relationships', 'build_graph', 'find_clusters', 'generate_insights'], step_index: 0, status: 'running', created_at: new Date().toISOString() }; const wf = workflowStore[id]; res.json({ ...buildRuntime(req, { workflow_state: 'running' }), success: true, workflow_id: id, status: wf.status, current_step: wf.steps[0], steps: wf.steps, computed_at: new Date().toISOString() }); });
router.get('/workflow/:id', (req: any, res: any) => { const wf = workflowStore[req.params.id]; if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' }); res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true, ...wf, computed_at: new Date().toISOString() }); });
router.post('/workflow/:id/resume', (req: any, res: any) => { const wf = workflowStore[req.params.id]; if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' }); if (wf.step_index < wf.steps.length - 1) { wf.step_index++; wf.status = wf.step_index === wf.steps.length - 1 ? 'complete' : 'running'; } else { wf.status = 'complete'; } wf.updated_at = new Date().toISOString(); res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true, workflow_id: wf.workflow_id, status: wf.status, current_step: wf.steps[wf.step_index], computed_at: new Date().toISOString() }); });
router.get('/workflow/:id/state', (req: any, res: any) => { const wf = workflowStore[req.params.id]; if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' }); res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true, workflow_id: wf.workflow_id, state_machine: { current_state: wf.steps[wf.step_index], terminal: wf.status === 'complete', transitions: wf.steps.map((s: string, i: number) => ({ step: i + 1, state: s, status: i < wf.step_index ? 'complete' : i === wf.step_index ? 'active' : 'pending' })) }, computed_at: new Date().toISOString() }); });
export default router;
