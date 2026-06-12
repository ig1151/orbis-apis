import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { num, str, intIn, round, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';
import {
  lookupModel, estimateTokens, costFor, TOKEN_ESTIMATOR_CONFIDENCE,
  PRICING_TABLE_VERSION, PRICING_TABLE_UPDATED_AT, PRICING_INVALIDATORS,
} from '../../_aplus/llm-pricing';

// Deterministic multi-agent fan-out cost estimator. Given a DAG of agent calls
// (each with a model + per-call tokens + call count + dependencies), it sums the
// TOTAL spend across the whole graph, prices each node from a static table, and
// finds the most-expensive dependency chain (critical path by cost) and the single
// most expensive node. Cost is total (you pay for every call regardless of
// parallelism). Cycles are rejected. Cost given tokens is exact; text → estimate.

const router = Router();
const MAX_NODES = 1000;

export interface NodeRow { id: string; model: string | null; found: boolean; calls: number; input_tokens: number; output_tokens: number; cost_usd: number | null; }
export interface FanoutCore {
  node_count: number; edge_count: number; total_calls: number;
  total_input_tokens: number; total_output_tokens: number;
  total_cost_usd: number; cost_complete: boolean; unknown_models: string[]; is_estimate: boolean;
  per_node: NodeRow[];
  critical_path: { nodes: string[]; cost_usd: number; length: number };
  max_cost_node: { id: string; cost_usd: number } | null;
  pricing_table_version: string; pricing_table_updated_at: string;
}

export function estimate(body: any): { error: string } | { result: FanoutCore } {
  const raw = body?.nodes;
  if (!Array.isArray(raw) || raw.length === 0) return { error: '"nodes" must be a non-empty array of {id, model, input_tokens|text, output_tokens?, calls?, depends_on?}.' };
  if (raw.length > MAX_NODES) return { error: `"nodes" exceeds the ${MAX_NODES}-node limit (${raw.length}).` };

  // Parse nodes
  const ids = new Set<string>();
  const rows: NodeRow[] = [];
  const deps: Record<string, string[]> = {};
  const nodeCost: Record<string, number> = {}; // null cost treated as 0 for path math
  const unknown_models: string[] = [];
  let anyEstimated = false;
  let total_input_tokens = 0, total_output_tokens = 0, total_calls = 0, edge_count = 0;

  for (let i = 0; i < raw.length; i++) {
    const n = raw[i] ?? {};
    const id = str(n.id);
    if (id === undefined) return { error: `nodes[${i}] needs a non-empty string "id".` };
    if (ids.has(id)) return { error: `Duplicate node id "${id}".` };
    ids.add(id);

    const calls = intIn(n.calls) ?? 1;
    if (calls < 1) return { error: `nodes[${i}] "calls" must be a positive integer.` };

    const inTok = intIn(n.input_tokens);
    let input_tokens: number;
    if (inTok !== undefined) { if (inTok < 0) return { error: `nodes[${i}] "input_tokens" must be 0 or greater.` }; input_tokens = inTok; }
    else if (typeof n.text === 'string') { input_tokens = estimateTokens(n.text); anyEstimated = true; }
    else input_tokens = 0;
    const outTok = intIn(n.output_tokens);
    if (outTok !== undefined && outTok < 0) return { error: `nodes[${i}] "output_tokens" must be 0 or greater.` };
    const output_tokens = outTok ?? 0;

    const modelIn = n.model;
    if (modelIn !== undefined && typeof modelIn !== 'string') return { error: `nodes[${i}] "model" must be a string.` };
    const price = modelIn !== undefined ? lookupModel(modelIn) : null;
    const found = price !== null;
    if (modelIn !== undefined && !found) unknown_models.push(modelIn);

    let cost_usd: number | null = null;
    if (price) cost_usd = round(costFor(price, input_tokens, output_tokens).total_cost_usd * calls, 6);

    rows.push({ id, model: price ? price.model : (typeof modelIn === 'string' ? modelIn : null), found, calls, input_tokens, output_tokens, cost_usd });
    nodeCost[id] = cost_usd ?? 0;
    deps[id] = Array.isArray(n.depends_on) ? n.depends_on.map((d: any) => String(d)) : [];

    total_input_tokens += input_tokens * calls;
    total_output_tokens += output_tokens * calls;
    total_calls += calls;
  }

  // Validate dependency references
  for (const id of ids) for (const d of deps[id]) {
    if (!ids.has(d)) return { error: `Node "${id}" depends on unknown node "${d}".` };
    edge_count++;
  }

  // Kahn topological sort + longest path (by cost). Cycle → error.
  const indeg: Record<string, number> = {}; const adj: Record<string, string[]> = {};
  for (const id of ids) { indeg[id] = 0; adj[id] = []; }
  for (const id of ids) for (const d of deps[id]) { adj[d].push(id); indeg[id]++; }
  const queue: string[] = [];
  for (const id of ids) if (indeg[id] === 0) queue.push(id);
  queue.sort(); // deterministic order
  const cum: Record<string, number> = {}; const pred: Record<string, string | null> = {};
  for (const id of ids) { cum[id] = nodeCost[id]; pred[id] = null; }
  let processed = 0;
  while (queue.length) {
    const u = queue.shift()!; processed++;
    for (const v of adj[u]) {
      if (cum[u] + nodeCost[v] > cum[v]) { cum[v] = cum[u] + nodeCost[v]; pred[v] = u; }
      if (--indeg[v] === 0) { queue.push(v); queue.sort(); }
    }
  }
  if (processed < ids.size) return { error: 'Dependency graph contains a cycle — fan-out graphs must be a DAG.' };

  // Critical path = path with max cumulative cost
  let endId: string | null = null; let best = -Infinity;
  for (const id of ids) if (cum[id] > best) { best = cum[id]; endId = id; }
  const pathNodes: string[] = [];
  let cur = endId;
  while (cur) { pathNodes.unshift(cur); cur = pred[cur]; }

  const total_cost_usd = round(rows.reduce((s, r) => s + (r.cost_usd ?? 0), 0), 6);
  const cost_complete = unknown_models.length === 0;

  // Most expensive single node (among priced)
  let max_cost_node: { id: string; cost_usd: number } | null = null;
  for (const r of rows) if (r.cost_usd !== null && (max_cost_node === null || r.cost_usd > max_cost_node.cost_usd)) max_cost_node = { id: r.id, cost_usd: r.cost_usd };

  return {
    result: {
      node_count: rows.length, edge_count, total_calls,
      total_input_tokens, total_output_tokens,
      total_cost_usd, cost_complete, unknown_models, is_estimate: anyEstimated,
      per_node: rows,
      critical_path: { nodes: pathNodes, cost_usd: round(best, 6), length: pathNodes.length },
      max_cost_node,
      pricing_table_version: PRICING_TABLE_VERSION, pricing_table_updated_at: PRICING_TABLE_UPDATED_AT,
    },
  };
}

function actions(r: FanoutCore): string[] {
  const out = [`Total fan-out cost: $${r.total_cost_usd} across ${r.node_count} node(s) / ${r.total_calls} call(s)${r.cost_complete ? '' : ` (PARTIAL — ${r.unknown_models.length} unpriced model(s): ${r.unknown_models.join(', ')})`}.`];
  if (r.max_cost_node) out.push(`Most expensive node: "${r.max_cost_node.id}" at $${r.max_cost_node.cost_usd} — optimize or cache it first.`);
  out.push(`Critical dependency chain (${r.critical_path.length} node(s)): ${r.critical_path.nodes.join(' → ')} = $${r.critical_path.cost_usd}.`);
  return out;
}

const CHAIN_TO = [
  { api: 'model-pricing-comparator', reason: 'Swap a costly node to a cheaper model and re-price.' },
  { api: 'llm-token-counter', reason: 'Estimate a node\'s tokens before adding it to the graph.' },
];

function conf(r: FanoutCore) {
  const score = r.is_estimate ? TOKEN_ESTIMATOR_CONFIDENCE : (r.cost_complete ? 1 : 0.85);
  return { score, sections: { cost: r.cost_complete ? (r.is_estimate ? TOKEN_ESTIMATOR_CONFIDENCE : 1) : 0.5, graph: 1 } };
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Multi-Agent Fan-out Cost Estimator API', version: '1.0.0',
    description: 'Deterministic multi-agent fan-out cost estimator. From a DAG of agent calls (model + per-call tokens + calls + dependencies), returns total spend, per-node cost, the critical dependency chain (most expensive path), and the most expensive node. Cost is total across all calls; cost given tokens is exact. Cycles are rejected.',
    openapi_url: 'https://orbis-apis.onrender.com/agent-fanout-cost/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/estimate', summary: 'Total + critical-path fan-out cost', price_usdc: 0.006 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL estimate + reasoning', price_usdc: 0.01 },
    ],
    pricing: [
      { path: '/estimate', price_usdc: 0.006, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.01, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/estimate', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = estimate(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const c = conf(r.result);
  respond(res, t0, {
    ...r.result, confidence_score: c.score, confidence_per_section: c.sections,
    recommended_actions_priority_order: actions(r.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = estimate(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result; const c = conf(v);
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `${v.node_count} node(s)/${v.edge_count} edge(s)/${v.total_calls} call(s) → $${v.total_cost_usd}${v.cost_complete ? '' : ' (partial)'}; critical chain $${v.critical_path.cost_usd}.`,
      key_factors: [`Total tokens: ${v.total_input_tokens} in / ${v.total_output_tokens} out.`, v.max_cost_node ? `Dominant node "${v.max_cost_node.id}" ($${v.max_cost_node.cost_usd}).` : 'No priced nodes.', v.cost_complete ? 'All node models priced.' : `Unpriced: ${v.unknown_models.join(', ')}.`],
      invalidators: [...PRICING_INVALIDATORS, 'Total cost counts every call — parallelism reduces latency, not spend. The critical path is the costliest dependency chain, not a wall-clock time.', 'Per-call tokens are assumed identical across a node\'s calls; variable per-call sizes change the total.'],
    },
    confidence_score: c.score, confidence_per_section: c.sections,
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
