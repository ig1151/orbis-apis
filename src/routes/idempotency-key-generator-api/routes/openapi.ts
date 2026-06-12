import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const KeyCore = {
  type: 'object',
  required: ['idempotency_key', 'hash_hex', 'short_key', 'algorithm', 'namespace', 'sort_arrays', 'included_fields', 'canonical_string', 'canonical_length', 'canonical_truncated'],
  properties: {
    idempotency_key: { type: 'string' }, hash_hex: { type: 'string' }, short_key: { type: 'string' },
    algorithm: { type: 'string', enum: ['sha256', 'sha1', 'sha512'] },
    namespace: { type: ['string', 'null'] }, sort_arrays: { type: 'boolean' },
    included_fields: { type: 'array', items: { type: 'string' } },
    canonical_string: { type: 'string' }, canonical_length: { type: 'integer' }, canonical_truncated: { type: 'boolean' },
  },
};

const GenerateRequest = {
  type: 'object', additionalProperties: false,
  properties: {
    method: { type: 'string', description: 'HTTP method (uppercased in the fingerprint).' },
    path: { type: 'string', description: 'Request path.' },
    query: { description: 'Query parameters (any JSON; keys sorted).' },
    body: { description: 'Request body (any JSON; object keys sorted recursively).' },
    headers: { type: 'object', description: 'Headers to include; names lowercased.' },
    namespace: { type: 'string', description: 'Optional prefix: key = namespace_hash.' },
    algorithm: { type: 'string', enum: ['sha256', 'sha1', 'sha512'], description: 'Hash algorithm. Default sha256.' },
    sort_arrays: { type: 'boolean', description: 'Sort arrays so order is ignored. Default false (order significant).' },
  },
};

const HASH = 'e28d7f32b51125e5f585a90f5d920f7d4c9d4ab44a570e6e15d5732bc11b2072';
const CANON = '{"body":{"amount":100,"currency":"usd"},"method":"POST","path":"/v1/charges"}';
const CORE = {
  idempotency_key: `payments_${HASH}`, hash_hex: HASH, short_key: 'e28d7f32b51125e5', algorithm: 'sha256',
  namespace: 'payments', sort_arrays: false, included_fields: ['method', 'path', 'body'],
  canonical_string: CANON, canonical_length: 77, canonical_truncated: false,
};
const ACTS = [
  'Use idempotency_key "payments_e28d7f32b51125e5f585a90f5d920f7d4c9d4ab…" (sha256) to dedupe retries of this exact request.',
  'Fingerprint covers: method, path, body. Any change to these fields produces a different key.',
  'Array order is significant — reordered arrays produce a different key (set sort_arrays to ignore order).',
];
const CHAIN = [
  { api: 'function-arg-validator', reason: 'Validate the request body against a schema before fingerprinting it.' },
  { api: 'webhook-signature-verifier', reason: 'Verify an inbound webhook before generating its idempotency key.' },
];
const INVALIDATORS = [
  'The key is a fingerprint of exactly the fields you supply — omitting a field that actually varies the request can collide distinct requests onto one key.',
  'Header names are lowercased; values are used verbatim — including a volatile header (timestamp, nonce) makes every request unique and defeats deduplication.',
  'Array order is significant unless sort_arrays=true.',
];
const TAIL = {
  confidence_score: 1, confidence_per_section: { fingerprint: 1 }, recommended_actions_priority_order: ACTS,
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('fingerprint'), _Tail: Tail, KeyCore, GenerateRequest,
  DiscoveryResponse: discoverySchema(),
  GenerateResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/KeyCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/KeyCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'idk-1780000000000', request_id: 'idk-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0 };
const reqEx = { method: 'post', path: '/v1/charges', body: { amount: 100, currency: 'usd' }, namespace: 'payments' };
const disc = {
  name: 'Idempotency Key Generator API', version: '1.0.0',
  description: 'Deterministic idempotency-key generator. Canonicalizes a request fingerprint (method, path, query, body, selected headers) by recursively sorting object keys (and optionally arrays), then hashes it (SHA-256 by default) into a stable key. Same inputs → same key. Pure crypto — no LLM.',
  openapi_url: 'https://orbis-apis.onrender.com/idempotency-key-generator/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/generate', summary: 'Generate a stable idempotency key', price_usdc: 0.003 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL key + reasoning', price_usdc: 0.006 },
  ],
  pricing: [
    { path: '/generate', price_usdc: 0.003, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.006, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/generate', summary: 'Generate a stable idempotency key', operationId: 'generate', priceUsdc: 0.003,
    requestSchemaRef: 'GenerateRequest', responseSchemaRef: 'GenerateResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL key + reasoning', operationId: 'lookup', priceUsdc: 0.006, oneCall: true,
    requestSchemaRef: 'GenerateRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'sha256 over a canonical fingerprint of [method, path, body] (77 bytes) → e28d7f32b51125e5…',
        key_factors: ['Fields: method, path, body.', 'Algorithm: sha256; sort_arrays=false.', 'Namespaced "payments".'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'idempotency-key-generator', title: 'Idempotency Key Generator API', version: '1.0.0',
  description: 'Deterministic idempotency-key generator. Canonicalizes a request fingerprint (method, path, query, body, selected headers) by recursively sorting object keys (and optionally arrays), then hashes it (SHA-256 by default) into a stable key. Same inputs → same key. Pure crypto — no LLM.',
  endpoints, schemas, infoExtensions: { 'x-llm-infra': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
