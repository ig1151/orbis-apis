import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';
import { PRICING_TABLE_VERSION, PRICING_TABLE_UPDATED_AT, PRICING_INVALIDATORS } from '../../_aplus/llm-pricing';

const strNull = { type: ['string', 'null'] };
const numNull = { type: ['number', 'null'] };

const CountCore = {
  type: 'object',
  required: ['model', 'provider', 'found', 'input_text_chars', 'input_tokens', 'output_tokens', 'total_tokens', 'is_estimate', 'input_cost_usd', 'output_cost_usd', 'total_cost_usd', 'pricing_table_version', 'pricing_table_updated_at'],
  properties: {
    model: strNull, provider: strNull, found: { type: 'boolean' },
    input_text_chars: { type: 'integer' }, input_tokens: { type: 'integer' }, output_tokens: { type: 'integer' }, total_tokens: { type: 'integer' },
    is_estimate: { type: 'boolean', enum: [true] },
    input_cost_usd: numNull, output_cost_usd: numNull, total_cost_usd: numNull,
    pricing_table_version: { type: 'string' }, pricing_table_updated_at: { type: 'string' },
  },
};

const CountRequest = {
  type: 'object', required: ['text'], additionalProperties: false,
  properties: {
    text: { type: 'string', minLength: 1, maxLength: 200000, description: 'Text to estimate tokens for.' },
    model: { type: 'string', description: 'Model id or alias (e.g. claude-opus-4-8, opus, gpt-4o). Unknown → found:false.' },
    output_tokens: { type: 'integer', minimum: 0, description: 'Expected output tokens, for the cost estimate.' },
  },
};

const CORE = {
  model: 'claude-opus-4-8', provider: 'anthropic', found: true,
  input_text_chars: 220, input_tokens: 52, output_tokens: 500, total_tokens: 552, is_estimate: true,
  input_cost_usd: 0.00026, output_cost_usd: 0.0125, total_cost_usd: 0.01276,
  pricing_table_version: PRICING_TABLE_VERSION, pricing_table_updated_at: PRICING_TABLE_UPDATED_AT,
};
const ACTS = [
  '~52 input tokens estimated from 220 characters (offline heuristic — verify against the model\'s real tokenizer for billing).',
  'Estimated cost on claude-opus-4-8: $0.01276 (52 in + 500 out).',
];
const CHAIN = [
  { api: 'model-pricing-comparator', reason: 'Compare this token count\'s cost across every model in the table.' },
  { api: 'context-budget-planner', reason: 'Check whether this many tokens fits a model\'s context window.' },
];
const TAIL = {
  confidence_score: 0.7, confidence_per_section: { tokens: 0.7, cost: 0.7 }, recommended_actions_priority_order: ACTS,
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('tokens', 'cost'), _Tail: Tail, CountCore, CountRequest,
  DiscoveryResponse: discoverySchema(),
  CountResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/CountCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/CountCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'ltc-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0 };
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/count', summary: 'Estimate tokens + cost for one text', operationId: 'count', priceUsdc: 0.004,
    requestSchemaRef: 'CountRequest', responseSchemaRef: 'CountResponse',
    requestExample: { text: 'Summarize the quarterly earnings report in three concise bullet points for an executive audience.', model: 'claude-opus-4-8', output_tokens: 500 },
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL token + cost estimate + reasoning', operationId: 'lookup', priceUsdc: 0.008, oneCall: true,
    requestSchemaRef: 'CountRequest', responseSchemaRef: 'LookupResponse',
    requestExample: { text: 'Summarize the quarterly earnings report in three concise bullet points for an executive audience.', model: 'claude-opus-4-8', output_tokens: 500 },
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Estimated ~52 input + 500 output tokens; cost $0.01276 on claude-opus-4-8.',
        key_factors: ['220 input characters → ~52 tokens (heuristic).', 'Priced against claude-opus-4-8 (anthropic).', 'Cost given a token count is exact arithmetic.'],
        invalidators: PRICING_INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'llm-token-counter', title: 'LLM Token Counter & Cost Estimator API', version: '1.0.0',
  description: 'Deterministic, offline token + cost estimator. Text + model id → approximate token count and exact USD cost from a static, versioned pricing table. Token counts are heuristic estimates (not the model tokenizer); cost given tokens is exact. Unknown model → found:false.',
  endpoints, schemas, infoExtensions: { 'x-llm-infra': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
