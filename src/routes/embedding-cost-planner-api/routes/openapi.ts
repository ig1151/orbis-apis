import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';
import { PRICING_TABLE_VERSION, PRICING_TABLE_UPDATED_AT, PRICING_INVALIDATORS } from '../../_aplus/llm-pricing';

const numNull = { type: ['number', 'null'] };
const intNull = { type: ['integer', 'null'] };

const EmbedCore = {
  type: 'object',
  required: ['model', 'provider', 'found', 'doc_count', 'total_tokens', 'is_estimate', 'price_per_mtok', 'embedding_cost_usd', 'dimensions', 'bytes_per_dim', 'vector_bytes', 'total_vector_storage_bytes', 'batch_size', 'batch_count', 'max_input_tokens', 'docs_over_token_limit', 'pricing_table_version', 'pricing_table_updated_at'],
  properties: {
    model: { type: ['string', 'null'] }, provider: { type: ['string', 'null'] }, found: { type: 'boolean' },
    doc_count: { type: 'integer' }, total_tokens: { type: 'integer' }, is_estimate: { type: 'boolean' },
    price_per_mtok: numNull, embedding_cost_usd: numNull,
    dimensions: { type: 'integer' }, bytes_per_dim: { type: 'integer' }, vector_bytes: { type: 'integer' }, total_vector_storage_bytes: { type: 'integer' },
    batch_size: { type: 'integer' }, batch_count: { type: 'integer' },
    max_input_tokens: intNull, docs_over_token_limit: { type: 'integer' },
    pricing_table_version: { type: 'string' }, pricing_table_updated_at: { type: 'string' },
  },
};

const PlanRequest = {
  type: 'object', required: ['model'], additionalProperties: false,
  properties: {
    model: { type: 'string', description: 'Embedding model id/alias (e.g. text-embedding-3-small, 3-large, ada-002).' },
    documents: { type: 'array', items: { type: 'string' }, minItems: 1, description: 'Documents to embed; tokens are estimated per item.' },
    total_tokens: { type: 'integer', minimum: 0, description: 'Exact total tokens (skips estimation).' },
    doc_count: { type: 'integer', minimum: 1, description: 'Number of documents (with total_tokens or avg_tokens_per_doc).' },
    avg_tokens_per_doc: { type: 'number', minimum: 0, description: 'Average tokens per doc (with doc_count).' },
    dimensions: { type: 'integer', minimum: 1, description: 'Effective vector dimensions; defaults to the model default, capped at its max.' },
    bytes_per_dim: { type: 'integer', minimum: 1, description: 'Bytes per dimension for storage. Default 4 (float32).' },
    batch_size: { type: 'integer', minimum: 1, description: 'Max items per batch request. Default 96.' },
  },
};

const CORE = {
  model: 'text-embedding-3-small', provider: 'openai', found: true,
  doc_count: 500, total_tokens: 1000000, is_estimate: false,
  price_per_mtok: 0.02, embedding_cost_usd: 0.02,
  dimensions: 1536, bytes_per_dim: 4, vector_bytes: 6144, total_vector_storage_bytes: 3072000,
  batch_size: 96, batch_count: 6, max_input_tokens: 8191, docs_over_token_limit: 0,
  pricing_table_version: PRICING_TABLE_VERSION, pricing_table_updated_at: PRICING_TABLE_UPDATED_AT,
};
const ACTS = [
  'Embed 500 doc(s) (~1000000 tokens) on text-embedding-3-small: $0.02 in 6 batch request(s) of ≤96.',
  'Vectors: 1536-dim → 6144 bytes each, 3072000 bytes total storage.',
];
const CHAIN = [
  { api: 'text-chunker', reason: 'Split documents that exceed the per-item token cap before embedding.' },
  { api: 'model-pricing-comparator', reason: 'Compare LLM (not embedding) costs for a downstream RAG generation step.' },
];
const INV = [...PRICING_INVALIDATORS, 'Storage assumes dense float vectors at bytes_per_dim; quantized or compressed indexes store far less.', 'Batch count assumes the item-count limit binds; a per-request token limit may force more requests.'];
const TAIL = {
  confidence_score: 1, confidence_per_section: { tokens: 1, cost: 1, storage: 1 }, recommended_actions_priority_order: ACTS,
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('tokens', 'cost', 'storage'), _Tail: Tail, EmbedCore, PlanRequest,
  DiscoveryResponse: discoverySchema(),
  PlanResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/EmbedCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/EmbedCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'emb-1780000000000', request_id: 'emb-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0 };
const reqEx = { model: 'text-embedding-3-small', total_tokens: 1000000, doc_count: 500 };
const disc = {
  name: 'Embedding Cost & Batch Planner API', version: '1.0.0',
  description: 'Deterministic embedding cost + batch planner. From documents (or a token total, or doc_count × avg tokens) + an embedding model + batch size, returns the exact embedding cost from a static price table, the vector storage footprint, the number of batch requests, and how many docs exceed the per-item token cap. Token counts from text are estimates; cost given tokens is exact.',
  openapi_url: 'https://orbis-apis.onrender.com/embedding-cost-planner/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/plan', summary: 'Embedding cost + batch + storage plan', price_usdc: 0.005 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL plan + reasoning', price_usdc: 0.009 },
  ],
  pricing: [
    { path: '/plan', price_usdc: 0.005, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.009, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/plan', summary: 'Embedding cost + batch + storage plan', operationId: 'plan', priceUsdc: 0.005,
    requestSchemaRef: 'PlanRequest', responseSchemaRef: 'PlanResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL plan + reasoning', operationId: 'lookup', priceUsdc: 0.009, oneCall: true,
    requestSchemaRef: 'PlanRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: '500 doc(s), ~1000000 tokens → $0.02 on text-embedding-3-small; 6 batch(es); 3072000 bytes of vectors.',
        key_factors: ['1000000 tokens at $0.02/MTok.', '1536 dims × 4 bytes = 6144 bytes/vector.', 'Token count supplied (exact cost).'],
        invalidators: INV,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'embedding-cost-planner', title: 'Embedding Cost & Batch Planner API', version: '1.0.0',
  description: 'Deterministic embedding cost + batch planner. From documents (or a token total, or doc_count × avg tokens) + an embedding model + batch size, returns the exact embedding cost from a static price table, the vector storage footprint, the number of batch requests, and how many docs exceed the per-item token cap. Token counts from text are estimates; cost given tokens is exact.',
  endpoints, schemas, infoExtensions: { 'x-llm-infra': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
