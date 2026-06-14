import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const ROLE_ENUM = ['source', 'intermediate', 'sink', 'isolated'];
const NodeInfo = {
  type: 'object', required: ['name', 'role', 'in_degree', 'out_degree', 'depth'], additionalProperties: false,
  properties: {
    name: { type: 'string' },
    role: { type: 'string', enum: ROLE_ENUM },
    in_degree: { type: 'integer', minimum: 0 },
    out_degree: { type: 'integer', minimum: 0 },
    depth: { type: 'integer', minimum: 0, description: 'Longest path length from any source (0 for sources; 0 for all nodes when a cycle is present).' },
  },
};
const Edge = {
  type: 'object', required: ['from', 'to', 'via'], additionalProperties: false,
  properties: {
    from: { type: 'string', description: 'Upstream dataset.' },
    to: { type: 'string', description: 'Downstream dataset.' },
    via: { type: 'string', description: 'Step id that produced this hop.' },
  },
};
const LineageCore = {
  type: 'object',
  required: ['step_count', 'node_count', 'edge_count', 'sources', 'sinks', 'has_cycle', 'cycle', 'topological_order', 'max_depth', 'nodes', 'edges'],
  properties: {
    step_count: { type: 'integer', minimum: 0 },
    node_count: { type: 'integer', minimum: 0 },
    edge_count: { type: 'integer', minimum: 0 },
    sources: { type: 'array', items: { type: 'string' } },
    sinks: { type: 'array', items: { type: 'string' } },
    has_cycle: { type: 'boolean' },
    cycle: { type: 'array', items: { type: 'string' }, description: 'One detected cycle as a node path (first repeats at end); empty when acyclic.' },
    topological_order: { type: ['array', 'null'], items: { type: 'string' }, description: 'A valid execution order, or null when a cycle is present.' },
    max_depth: { type: 'integer', minimum: 0 },
    nodes: { type: 'array', items: NodeInfo },
    edges: { type: 'array', items: Edge },
  },
};
const Step = {
  type: 'object', required: ['id', 'inputs', 'outputs'], additionalProperties: false,
  properties: {
    id: { type: 'string', description: 'Unique step identifier.' },
    operation: { type: 'string', description: 'Optional operation label (e.g. join, aggregate).' },
    inputs: { type: 'array', minItems: 1, items: { type: 'string' }, description: 'Upstream dataset names this step reads.' },
    outputs: { type: 'array', minItems: 1, items: { type: 'string' }, description: 'Dataset names this step produces.' },
  },
};
const TrackRequest = {
  type: 'object', required: ['steps'], additionalProperties: false,
  properties: {
    steps: { type: 'array', minItems: 1, items: Step, description: 'Ordered transform manifest.' },
  },
};

const CORE = {
  step_count: 3, node_count: 5, edge_count: 4,
  sources: ['raw_events', 'users'], sinks: ['daily_metrics'],
  has_cycle: false, cycle: [],
  topological_order: ['raw_events', 'users', 'clean_events', 'enriched_events', 'daily_metrics'],
  max_depth: 3,
  nodes: [
    { name: 'clean_events', role: 'intermediate', in_degree: 1, out_degree: 1, depth: 1 },
    { name: 'daily_metrics', role: 'sink', in_degree: 1, out_degree: 0, depth: 3 },
    { name: 'enriched_events', role: 'intermediate', in_degree: 2, out_degree: 1, depth: 2 },
    { name: 'raw_events', role: 'source', in_degree: 0, out_degree: 1, depth: 0 },
    { name: 'users', role: 'source', in_degree: 0, out_degree: 1, depth: 0 },
  ],
  edges: [
    { from: 'raw_events', to: 'clean_events', via: 's1' },
    { from: 'clean_events', to: 'enriched_events', via: 's2' },
    { from: 'users', to: 'enriched_events', via: 's2' },
    { from: 'enriched_events', to: 'daily_metrics', via: 's3' },
  ],
};
const CHAIN = [
  { api: 'data-catalog-builder', reason: 'Document the datasets (nodes) discovered in this lineage graph.' },
  { api: 'data-pipeline-quality-scorer', reason: 'Score the data flowing through the pipeline these steps describe.' },
];
const INVALIDATORS = [
  'Lineage is computed only from the supplied manifest; datasets or steps not listed are invisible (no inference of hidden dependencies).',
  'A step whose inputs and outputs share a name produces no self-edge (in-place updates are not lineage hops).',
  'When a cycle is present, topological_order is null and node depths are reported as 0 — resolve the cycle for a valid ordering.',
];
const TAIL = {
  confidence_score: 1, confidence_per_section: { lineage: 1 },
  recommended_actions_priority_order: [
    '5 dataset(s), 4 edge(s): 2 source(s), 1 sink(s), max depth 3.',
    'Use topological_order as a safe execution/refresh sequence.',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('lineage'), _Tail: Tail,
  NodeInfo, Edge, LineageCore, Step, TrackRequest, DiscoveryResponse: discoverySchema(),
  TrackResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/LineageCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/LineageCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'dlt-1780000000000', request_id: 'dlt-1780000000000', computed_at: '2026-06-14T12:00:00.000Z', success: true, latency_ms: 1 };
const reqEx = {
  steps: [
    { id: 's1', operation: 'extract', inputs: ['raw_events'], outputs: ['clean_events'] },
    { id: 's2', operation: 'join', inputs: ['clean_events', 'users'], outputs: ['enriched_events'] },
    { id: 's3', operation: 'aggregate', inputs: ['enriched_events'], outputs: ['daily_metrics'] },
  ],
};
const disc = {
  name: 'Data Lineage Tracker API', version: '1.0.0',
  description: 'Deterministic data lineage tracker. Turns a transform manifest (steps with input/output datasets) into a lineage graph with roles, degrees, depth, cycle detection, and a topological order. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/data-lineage-tracker/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/track', summary: 'Build a lineage graph from a transform manifest', price_usdc: 0.007 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL lineage + reasoning', price_usdc: 0.012 },
  ],
  pricing: [
    { path: '/track', price_usdc: 0.007, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/track', summary: 'Build a lineage graph from a transform manifest', operationId: 'track', priceUsdc: 0.007,
    requestSchemaRef: 'TrackRequest', responseSchemaRef: 'TrackResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL lineage + reasoning', operationId: 'lookup', priceUsdc: 0.012, oneCall: true,
    requestSchemaRef: 'TrackRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Resolved 3 step(s) into a graph of 5 dataset(s) and 4 edge(s).',
        key_factors: ['Sources: raw_events, users.', 'Sinks: daily_metrics.', 'Acyclic; max depth 3.'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'data-lineage-tracker', title: 'Data Lineage Tracker API', version: '1.0.0',
  description: 'Deterministic data lineage tracker — transform manifest → lineage graph (roles, degrees, depth, cycle detection, topological order). No LLM.',
  endpoints, schemas, infoExtensions: { 'x-data-quality': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
