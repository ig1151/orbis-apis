import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';
import { PRICING_TABLE_VERSION, PRICING_TABLE_UPDATED_AT, PRICING_INVALIDATORS } from '../../_aplus/llm-pricing';

const Row = {
  type: 'object', required: ['model', 'provider', 'source', 'input_cost_usd', 'output_cost_usd', 'total_cost_usd', 'total_cost_for_all_calls_usd'], additionalProperties: false,
  properties: {
    model: { type: 'string' }, provider: { type: 'string' }, source: { type: 'string', enum: ['reference', 'public-snapshot'] },
    input_cost_usd: { type: 'number' }, output_cost_usd: { type: 'number' }, total_cost_usd: { type: 'number' }, total_cost_for_all_calls_usd: { type: 'number' },
  },
};
const CompareCore = {
  type: 'object',
  required: ['input_tokens', 'output_tokens', 'calls', 'model_count', 'rows', 'cheapest_model', 'most_expensive_model', 'cheapest_cost_usd', 'most_expensive_cost_usd', 'savings_vs_most_expensive_usd', 'unknown_models', 'pricing_table_version', 'pricing_table_updated_at'],
  properties: {
    input_tokens: { type: 'integer' }, output_tokens: { type: 'integer' }, calls: { type: 'integer' }, model_count: { type: 'integer' },
    rows: { type: 'array', items: { $ref: '#/components/schemas/Row' } },
    cheapest_model: { type: 'string' }, most_expensive_model: { type: 'string' },
    cheapest_cost_usd: { type: 'number' }, most_expensive_cost_usd: { type: 'number' }, savings_vs_most_expensive_usd: { type: 'number' },
    unknown_models: { type: 'array', items: { type: 'string' } },
    pricing_table_version: { type: 'string' }, pricing_table_updated_at: { type: 'string' },
  },
};

const CompareRequest = {
  type: 'object', required: ['input_tokens', 'output_tokens'], additionalProperties: false,
  properties: {
    input_tokens: { type: 'integer', minimum: 0 }, output_tokens: { type: 'integer', minimum: 0 },
    models: { type: 'array', minItems: 1, items: { type: 'string' }, description: 'Model ids/aliases to compare. Omit to compare the whole table.' },
    calls: { type: 'integer', minimum: 1, description: 'Number of identical calls, for all-calls totals/savings. Default 1.' },
  },
};

const CORE = {
  input_tokens: 1000, output_tokens: 1000, calls: 1, model_count: 3,
  rows: [
    { model: 'gpt-4o-mini', provider: 'openai', source: 'public-snapshot', input_cost_usd: 0.00015, output_cost_usd: 0.0006, total_cost_usd: 0.00075, total_cost_for_all_calls_usd: 0.00075 },
    { model: 'claude-haiku-4-5', provider: 'anthropic', source: 'reference', input_cost_usd: 0.001, output_cost_usd: 0.005, total_cost_usd: 0.006, total_cost_for_all_calls_usd: 0.006 },
    { model: 'claude-opus-4-8', provider: 'anthropic', source: 'reference', input_cost_usd: 0.005, output_cost_usd: 0.025, total_cost_usd: 0.03, total_cost_for_all_calls_usd: 0.03 },
  ],
  cheapest_model: 'gpt-4o-mini', most_expensive_model: 'claude-opus-4-8',
  cheapest_cost_usd: 0.00075, most_expensive_cost_usd: 0.03, savings_vs_most_expensive_usd: 0.02925,
  unknown_models: [],
  pricing_table_version: PRICING_TABLE_VERSION, pricing_table_updated_at: PRICING_TABLE_UPDATED_AT,
};
const ACTS = [
  'Cheapest: gpt-4o-mini at $0.00075/call (1000 in + 1000 out).',
  'vs claude-opus-4-8 at $0.03/call — $0.02925 cheaper per call.',
];
const CHAIN = [
  { api: 'llm-token-counter', reason: 'Estimate the input/output tokens to feed this comparison.' },
  { api: 'conversation-cost-ledger', reason: 'Tally actual spend once a model is chosen.' },
];
const TAIL = {
  confidence_score: 1, confidence_per_section: { pricing: 1 }, recommended_actions_priority_order: ACTS,
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('pricing'), _Tail: Tail, Row, CompareCore, CompareRequest,
  DiscoveryResponse: discoverySchema(),
  CompareResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/CompareCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/CompareCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'mpc-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0 };
const reqEx = { input_tokens: 1000, output_tokens: 1000, models: ['claude-opus-4-8', 'gpt-4o-mini', 'claude-haiku-4-5'] };
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/compare', summary: 'Rank models by cost for a token split', operationId: 'compare', priceUsdc: 0.004,
    requestSchemaRef: 'CompareRequest', responseSchemaRef: 'CompareResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL comparison + reasoning', operationId: 'lookup', priceUsdc: 0.008, oneCall: true,
    requestSchemaRef: 'CompareRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Costed 3 model(s) for 1000 in + 1000 out × 1 call(s); cheapest gpt-4o-mini ($0.00075/call).',
        key_factors: ['Token split: 1000 in / 1000 out.', '3 models ranked; cheapest gpt-4o-mini, dearest claude-opus-4-8.', 'All requested models priced.'],
        invalidators: PRICING_INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'model-pricing-comparator', title: 'Model Pricing Comparator API', version: '1.0.0',
  description: 'Deterministic LLM pricing comparator. An input/output token split + call count → exact USD cost for every requested model (or the whole static table), ranked cheapest-first, with savings vs the most expensive. Tokens are supplied so costs are exact; only the pricing snapshot date qualifies them. Unknown models are reported, never guessed.',
  endpoints, schemas, infoExtensions: { 'x-llm-infra': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
