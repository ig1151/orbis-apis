import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';
import { PRICING_TABLE_VERSION, PRICING_TABLE_UPDATED_AT, PRICING_INVALIDATORS } from '../../_aplus/llm-pricing';

const numNull = { type: ['number', 'null'] };

const DiffCore = {
  type: 'object',
  required: ['model', 'provider', 'found', 'tokens_a', 'tokens_b', 'delta_tokens', 'pct_change', 'chars_a', 'chars_b', 'delta_chars', 'words_a', 'words_b', 'delta_words', 'output_tokens', 'cost_a_usd', 'cost_b_usd', 'delta_cost_usd', 'direction', 'is_estimate', 'pricing_table_version', 'pricing_table_updated_at'],
  properties: {
    model: { type: ['string', 'null'] }, provider: { type: ['string', 'null'] }, found: { type: 'boolean' },
    tokens_a: { type: 'integer' }, tokens_b: { type: 'integer' }, delta_tokens: { type: 'integer' }, pct_change: numNull,
    chars_a: { type: 'integer' }, chars_b: { type: 'integer' }, delta_chars: { type: 'integer' },
    words_a: { type: 'integer' }, words_b: { type: 'integer' }, delta_words: { type: 'integer' },
    output_tokens: { type: 'integer' },
    cost_a_usd: numNull, cost_b_usd: numNull, delta_cost_usd: numNull,
    direction: { type: 'string', enum: ['increase', 'decrease', 'no_change'] }, is_estimate: { type: 'boolean', enum: [true] },
    pricing_table_version: { type: 'string' }, pricing_table_updated_at: { type: 'string' },
  },
};

const DiffRequest = {
  type: 'object', required: ['a', 'b'], additionalProperties: false,
  properties: {
    a: { type: 'string', minLength: 1, maxLength: 200000, description: 'Original prompt.' },
    b: { type: 'string', minLength: 1, maxLength: 200000, description: 'Revised prompt.' },
    model: { type: 'string', description: 'Model id/alias for the cost delta. Unknown → found:false.' },
    output_tokens: { type: 'integer', minimum: 0, description: 'Assumed output tokens for a full per-call cost. Default 0 (prompt input only).' },
  },
};

const CORE = {
  model: 'claude-opus-4-8', provider: 'anthropic', found: true,
  tokens_a: 5, tokens_b: 21, delta_tokens: 16, pct_change: 320,
  chars_a: 23, chars_b: 90, delta_chars: 67, words_a: 3, words_b: 13, delta_words: 10,
  output_tokens: 0, cost_a_usd: 0.000025, cost_b_usd: 0.000105, delta_cost_usd: 0.00008,
  direction: 'increase', is_estimate: true,
  pricing_table_version: PRICING_TABLE_VERSION, pricing_table_updated_at: PRICING_TABLE_UPDATED_AT,
};
const ACTS = [
  'Prompt B is +16 tokens (+320%) vs A (~5 → ~21).',
  'Cost on claude-opus-4-8: +$0.00008 per call (prompt input only).',
];
const CHAIN = [
  { api: 'llm-token-counter', reason: 'Get the absolute token + cost for either prompt version.' },
  { api: 'model-pricing-comparator', reason: 'See the delta across other models.' },
];
const TAIL = {
  confidence_score: 0.7, confidence_per_section: { tokens: 0.7, cost: 0.7 }, recommended_actions_priority_order: ACTS,
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('tokens', 'cost'), _Tail: Tail, DiffCore, DiffRequest,
  DiscoveryResponse: discoverySchema(),
  DiffResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/DiffCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/DiffCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'ptd-1780000000000', request_id: 'ptd-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0 };
const reqEx = { a: 'Summarize the document.', b: 'Summarize the following document in three concise bullet points for an executive audience.', model: 'claude-opus-4-8' };
const disc = {
  name: 'Prompt Token Diff API', version: '1.0.0',
  description: 'Deterministic prompt token + cost diff. Compares two prompt versions (a → b) and returns token, character, and word deltas plus, if a model is given, the USD cost delta from a static price table. Token counts are heuristic estimates; cost given tokens is exact. No LLM.',
  openapi_url: 'https://orbis-apis.onrender.com/prompt-token-diff/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/diff', summary: 'Token + cost delta between two prompts', price_usdc: 0.004 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL diff + reasoning', price_usdc: 0.008 },
  ],
  pricing: [
    { path: '/diff', price_usdc: 0.004, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/diff', summary: 'Token + cost delta between two prompts', operationId: 'diff', priceUsdc: 0.004,
    requestSchemaRef: 'DiffRequest', responseSchemaRef: 'DiffResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL diff + reasoning', operationId: 'lookup', priceUsdc: 0.008, oneCall: true,
    requestSchemaRef: 'DiffRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: '~5 → ~21 tokens (+16, increase); +$0.00008 on claude-opus-4-8.',
        key_factors: ['Tokens: 5 → 21 (320%).', 'Chars +67, words +10.', 'Priced on claude-opus-4-8.'],
        invalidators: PRICING_INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'prompt-token-diff', title: 'Prompt Token Diff API', version: '1.0.0',
  description: 'Deterministic prompt token + cost diff. Compares two prompt versions (a → b) and returns token, character, and word deltas plus, if a model is given, the USD cost delta from a static price table. Token counts are heuristic estimates; cost given tokens is exact. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-llm-infra': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
