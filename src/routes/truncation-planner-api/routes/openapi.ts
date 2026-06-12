import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const StopHit = {
  oneOf: [
    { type: 'object', required: ['sequence', 'index'], additionalProperties: false, properties: { sequence: { type: 'string' }, index: { type: 'integer' } } },
    { type: 'null' },
  ],
};
const TruncCore = {
  type: 'object',
  required: ['original_chars', 'original_tokens_estimate', 'max_tokens', 'fits', 'strategy', 'boundary', 'ellipsis', 'stop_sequence_hit', 'truncated', 'kept_text', 'kept_chars', 'kept_tokens_estimate', 'removed_chars', 'removed_tokens_estimate', 'within_budget'],
  properties: {
    original_chars: { type: 'integer' }, original_tokens_estimate: { type: 'integer' }, max_tokens: { type: 'integer' }, fits: { type: 'boolean' },
    strategy: { type: 'string', enum: ['end', 'start', 'middle'] }, boundary: { type: 'string', enum: ['character', 'word', 'sentence'] }, ellipsis: { type: 'string' },
    stop_sequence_hit: { $ref: '#/components/schemas/StopHit' }, truncated: { type: 'boolean' },
    kept_text: { type: 'string' }, kept_chars: { type: 'integer' }, kept_tokens_estimate: { type: 'integer' },
    removed_chars: { type: 'integer' }, removed_tokens_estimate: { type: 'integer' }, within_budget: { type: 'boolean' },
  },
};

const PlanRequest = {
  type: 'object', required: ['text', 'max_tokens'], additionalProperties: false,
  properties: {
    text: { type: 'string', minLength: 1, maxLength: 500000 },
    max_tokens: { type: 'integer', minimum: 1, description: 'Token budget the kept text should fit (char-approximated).' },
    strategy: { type: 'string', enum: ['end', 'start', 'middle'], description: 'Keep the head (end), tail (start), or both ends (middle). Default end.' },
    boundary: { type: 'string', enum: ['character', 'word', 'sentence'], description: 'Snap cuts to this boundary. Default word.' },
    stop_sequences: { type: 'array', items: { type: 'string' }, description: 'Cut at the earliest occurrence of any of these.' },
    ellipsis: { type: 'string', description: 'Marker inserted at the cut. Default "…".' },
  },
};

const CORE = {
  original_chars: 50, original_tokens_estimate: 12, max_tokens: 100, fits: true,
  strategy: 'end', boundary: 'word', ellipsis: '…',
  stop_sequence_hit: { sequence: 'STOP', index: 12 }, truncated: true,
  kept_text: 'Answer: 42. ', kept_chars: 12, kept_tokens_estimate: 4,
  removed_chars: 38, removed_tokens_estimate: 8, within_budget: true,
};
const ACTS = [
  'Truncated to ~4 tokens (12 chars) via end/word; removed ~8 tokens.',
  'Stop sequence "STOP" found at char 12 — content from there on was cut.',
];
const CHAIN = [
  { api: 'llm-token-counter', reason: 'Confirm the kept text\'s token count and cost.' },
  { api: 'text-chunker', reason: 'Instead of dropping overflow, split it into separate chunks.' },
];
const INVALIDATORS = [
  'The token budget is converted to characters at ~4 chars/token — kept_tokens_estimate is heuristic and the result may land slightly over/under the real tokenizer count.',
  'Boundary snapping (word/sentence) trades exact budget adherence for clean cuts; character boundary is exact but can split words.',
  'stop_sequence matching is literal substring search on the provided text, case-sensitive.',
];
const TAIL = {
  confidence_score: 0.7, confidence_per_section: { truncation: 1, tokens: 0.7 }, recommended_actions_priority_order: ACTS,
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('truncation', 'tokens'), _Tail: Tail, StopHit, TruncCore, PlanRequest,
  DiscoveryResponse: discoverySchema(),
  PlanResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/TruncCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/TruncCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'trp-1780000000000', request_id: 'trp-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0 };
const reqEx = { text: 'Answer: 42. STOP everything after this is ignored.', max_tokens: 100, stop_sequences: ['STOP'] };
const disc = {
  name: 'Stop-Sequence / Truncation Planner API', version: '1.0.0',
  description: 'Deterministic truncation planner. Given text and a token budget, finds where to cut so it fits — keeping the head (end), tail (start), or both ends (middle) — snapping to character/word/sentence boundaries and honoring stop sequences. Char boundaries are exact; the token budget is char-approximated, so token counts are estimates. No LLM.',
  openapi_url: 'https://orbis-apis.onrender.com/truncation-planner/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/plan', summary: 'Plan a budget-fitting truncation', price_usdc: 0.004 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL truncation + reasoning', price_usdc: 0.008 },
  ],
  pricing: [
    { path: '/plan', price_usdc: 0.004, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/plan', summary: 'Plan a budget-fitting truncation', operationId: 'plan', priceUsdc: 0.004,
    requestSchemaRef: 'PlanRequest', responseSchemaRef: 'PlanResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL truncation + reasoning', operationId: 'lookup', priceUsdc: 0.008, oneCall: true,
    requestSchemaRef: 'PlanRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: '~12 tokens vs 100 budget → truncated to ~4 via end/word.',
        key_factors: ['Original 50 chars / ~12 tokens.', 'Stop sequence at char 12.', 'Kept ~4 tokens (within_budget=true).'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'truncation-planner', title: 'Stop-Sequence / Truncation Planner API', version: '1.0.0',
  description: 'Deterministic truncation planner. Given text and a token budget, finds where to cut so it fits — keeping the head (end), tail (start), or both ends (middle) — snapping to character/word/sentence boundaries and honoring stop sequences. Char boundaries are exact; the token budget is char-approximated, so token counts are estimates. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-llm-infra': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
