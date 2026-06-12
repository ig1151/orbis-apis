import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';
import { PRICING_TABLE_VERSION, PRICING_TABLE_UPDATED_AT, PRICING_INVALIDATORS } from '../../_aplus/llm-pricing';

const NodeRow = {
  type: 'object', required: ['id', 'model', 'found', 'calls', 'input_tokens', 'output_tokens', 'cost_usd'], additionalProperties: false,
  properties: {
    id: { type: 'string' }, model: { type: ['string', 'null'] }, found: { type: 'boolean' },
    calls: { type: 'integer' }, input_tokens: { type: 'integer' }, output_tokens: { type: 'integer' }, cost_usd: { type: ['number', 'null'] },
  },
};
const CriticalPath = {
  type: 'object', required: ['nodes', 'cost_usd', 'length'], additionalProperties: false,
  properties: { nodes: { type: 'array', items: { type: 'string' } }, cost_usd: { type: 'number' }, length: { type: 'integer' } },
};
const MaxCostNode = {
  oneOf: [
    { type: 'object', required: ['id', 'cost_usd'], additionalProperties: false, properties: { id: { type: 'string' }, cost_usd: { type: 'number' } } },
    { type: 'null' },
  ],
};
const FanoutCore = {
  type: 'object',
  required: ['node_count', 'edge_count', 'total_calls', 'total_input_tokens', 'total_output_tokens', 'total_cost_usd', 'cost_complete', 'unknown_models', 'is_estimate', 'per_node', 'critical_path', 'max_cost_node', 'pricing_table_version', 'pricing_table_updated_at'],
  properties: {
    node_count: { type: 'integer' }, edge_count: { type: 'integer' }, total_calls: { type: 'integer' },
    total_input_tokens: { type: 'integer' }, total_output_tokens: { type: 'integer' },
    total_cost_usd: { type: 'number' }, cost_complete: { type: 'boolean' }, unknown_models: { type: 'array', items: { type: 'string' } }, is_estimate: { type: 'boolean' },
    per_node: { type: 'array', items: { $ref: '#/components/schemas/NodeRow' } },
    critical_path: { $ref: '#/components/schemas/CriticalPath' },
    max_cost_node: { $ref: '#/components/schemas/MaxCostNode' },
    pricing_table_version: { type: 'string' }, pricing_table_updated_at: { type: 'string' },
  },
};

const NodeIn = {
  type: 'object', required: ['id'], additionalProperties: false,
  properties: {
    id: { type: 'string' }, model: { type: 'string' },
    input_tokens: { type: 'integer', minimum: 0 }, output_tokens: { type: 'integer', minimum: 0 },
    text: { type: 'string', description: 'Estimate input_tokens from text if input_tokens omitted.' },
    calls: { type: 'integer', minimum: 1, description: 'Times this node runs. Default 1.' },
    depends_on: { type: 'array', items: { type: 'string' }, description: 'Ids this node depends on (must exist; DAG only).' },
  },
};
const EstimateRequest = {
  type: 'object', required: ['nodes'], additionalProperties: false,
  properties: { nodes: { type: 'array', minItems: 1, maxItems: 1000, items: NodeIn } },
};

const CORE = {
  node_count: 3, edge_count: 2, total_calls: 7, total_input_tokens: 13500, total_output_tokens: 9300,
  total_cost_usd: 0.096, cost_complete: true, unknown_models: [], is_estimate: false,
  per_node: [
    { id: 'planner', model: 'claude-opus-4-8', found: true, calls: 1, input_tokens: 500, output_tokens: 1000, cost_usd: 0.0275 },
    { id: 'worker', model: 'claude-haiku-4-5', found: true, calls: 5, input_tokens: 2000, output_tokens: 1500, cost_usd: 0.0475 },
    { id: 'summarizer', model: 'claude-sonnet-4-6', found: true, calls: 1, input_tokens: 3000, output_tokens: 800, cost_usd: 0.021 },
  ],
  critical_path: { nodes: ['planner', 'worker', 'summarizer'], cost_usd: 0.096, length: 3 },
  max_cost_node: { id: 'worker', cost_usd: 0.0475 },
  pricing_table_version: PRICING_TABLE_VERSION, pricing_table_updated_at: PRICING_TABLE_UPDATED_AT,
};
const ACTS = [
  'Total fan-out cost: $0.096 across 3 node(s) / 7 call(s).',
  'Most expensive node: "worker" at $0.0475 — optimize or cache it first.',
  'Critical dependency chain (3 node(s)): planner → worker → summarizer = $0.096.',
];
const CHAIN = [
  { api: 'model-pricing-comparator', reason: 'Swap a costly node to a cheaper model and re-price.' },
  { api: 'llm-token-counter', reason: 'Estimate a node\'s tokens before adding it to the graph.' },
];
const INV = [...PRICING_INVALIDATORS, 'Total cost counts every call — parallelism reduces latency, not spend. The critical path is the costliest dependency chain, not a wall-clock time.', 'Per-call tokens are assumed identical across a node\'s calls; variable per-call sizes change the total.'];
const TAIL = {
  confidence_score: 1, confidence_per_section: { cost: 1, graph: 1 }, recommended_actions_priority_order: ACTS,
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('cost', 'graph'), _Tail: Tail, NodeRow, CriticalPath, MaxCostNode, FanoutCore, EstimateRequest,
  DiscoveryResponse: discoverySchema(),
  EstimateResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/FanoutCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/FanoutCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'afc-1780000000000', request_id: 'afc-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0 };
const reqEx = { nodes: [
  { id: 'planner', model: 'claude-opus-4-8', input_tokens: 500, output_tokens: 1000 },
  { id: 'worker', model: 'claude-haiku-4-5', input_tokens: 2000, output_tokens: 1500, calls: 5, depends_on: ['planner'] },
  { id: 'summarizer', model: 'claude-sonnet-4-6', input_tokens: 3000, output_tokens: 800, depends_on: ['worker'] },
] };
const disc = {
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
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/estimate', summary: 'Total + critical-path fan-out cost', operationId: 'estimate', priceUsdc: 0.006,
    requestSchemaRef: 'EstimateRequest', responseSchemaRef: 'EstimateResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL estimate + reasoning', operationId: 'lookup', priceUsdc: 0.01, oneCall: true,
    requestSchemaRef: 'EstimateRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: '3 node(s)/2 edge(s)/7 call(s) → $0.096; critical chain $0.096.',
        key_factors: ['Total tokens: 13500 in / 9300 out.', 'Dominant node "worker" ($0.0475).', 'All node models priced.'],
        invalidators: INV,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'agent-fanout-cost', title: 'Multi-Agent Fan-out Cost Estimator API', version: '1.0.0',
  description: 'Deterministic multi-agent fan-out cost estimator. From a DAG of agent calls (model + per-call tokens + calls + dependencies), returns total spend, per-node cost, the critical dependency chain (most expensive path), and the most expensive node. Cost is total across all calls; cost given tokens is exact. Cycles are rejected.',
  endpoints, schemas, infoExtensions: { 'x-llm-infra': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
