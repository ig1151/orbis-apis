import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const MsgRow = {
  type: 'object', required: ['index', 'role', 'tokens', 'source'], additionalProperties: false,
  properties: { index: { type: 'integer' }, role: { type: ['string', 'null'] }, tokens: { type: 'integer' }, source: { type: 'string', enum: ['provided', 'estimated'] } },
};
const TrimPlan = {
  type: 'object', required: ['strategy', 'dropped_indices', 'kept_indices', 'dropped_tokens', 'tokens_after_trim', 'fits_after_trim'], additionalProperties: false,
  properties: {
    strategy: { type: 'string', enum: ['drop_oldest', 'drop_lowest_priority'] },
    dropped_indices: { type: 'array', items: { type: 'integer' } }, kept_indices: { type: 'array', items: { type: 'integer' } },
    dropped_tokens: { type: 'integer' }, tokens_after_trim: { type: 'integer' }, fits_after_trim: { type: 'boolean' },
  },
};
const PlanCore = {
  type: 'object',
  required: ['model', 'found', 'context_window', 'reserve_output_tokens', 'available_input_tokens', 'message_count', 'total_input_tokens', 'is_estimate', 'fits', 'overflow_tokens', 'messages', 'trim_plan'],
  properties: {
    model: { type: ['string', 'null'] }, found: { type: 'boolean' },
    context_window: { type: 'integer' }, reserve_output_tokens: { type: 'integer' }, available_input_tokens: { type: 'integer' },
    message_count: { type: 'integer' }, total_input_tokens: { type: 'integer' }, is_estimate: { type: 'boolean' },
    fits: { type: 'boolean' }, overflow_tokens: { type: 'integer' },
    messages: { type: 'array', items: { $ref: '#/components/schemas/MsgRow' } },
    trim_plan: { $ref: '#/components/schemas/TrimPlan' },
  },
};

const MsgIn = {
  type: 'object', additionalProperties: false,
  properties: {
    role: { type: 'string' }, text: { type: 'string', description: 'Used to estimate tokens if "tokens" is omitted.' },
    tokens: { type: 'integer', minimum: 0, description: 'Exact token count for this message; overrides text estimation.' },
    priority: { type: 'number', description: 'Higher = kept longer under drop_lowest_priority. Default 0.' },
  },
};
const PlanRequest = {
  type: 'object', required: ['messages'], additionalProperties: false,
  properties: {
    messages: { type: 'array', minItems: 1, maxItems: 2000, items: MsgIn },
    model: { type: 'string', description: 'Model id/alias; supplies the context window if "context_window" is omitted.' },
    context_window: { type: 'integer', minimum: 1, description: 'Explicit window in tokens; overrides the model window.' },
    reserve_output_tokens: { type: 'integer', minimum: 0, description: 'Tokens to hold back for the response. Default 0.' },
    strategy: { type: 'string', enum: ['drop_oldest', 'drop_lowest_priority'], description: 'Trim order. Default drop_oldest.' },
  },
};

const CORE = {
  model: 'claude-opus-4-8', found: true,
  context_window: 1000000, reserve_output_tokens: 4000, available_input_tokens: 996000,
  message_count: 3, total_input_tokens: 180, is_estimate: true, fits: true, overflow_tokens: 0,
  messages: [
    { index: 0, role: 'system', tokens: 30, source: 'estimated' },
    { index: 1, role: 'user', tokens: 100, source: 'provided' },
    { index: 2, role: 'assistant', tokens: 50, source: 'estimated' },
  ],
  trim_plan: { strategy: 'drop_oldest', dropped_indices: [], kept_indices: [0, 1, 2], dropped_tokens: 0, tokens_after_trim: 180, fits_after_trim: true },
};
const ACTS = [
  'Prompt fits: 180 input tokens within the 996000-token budget (window 1000000 − 4000 reserved).',
  'Some message tokens were estimated offline — confirm with the real tokenizer before relying on the fit at the margin.',
];
const CHAIN = [
  { api: 'text-chunker', reason: 'Split oversized messages into window-sized chunks instead of dropping them.' },
  { api: 'llm-token-counter', reason: 'Estimate tokens + cost for an individual message before planning.' },
];
const TAIL = {
  confidence_score: 0.7, confidence_per_section: { budget: 0.7, trim: 0.7 }, recommended_actions_priority_order: ACTS,
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('budget', 'trim'), _Tail: Tail, MsgRow, TrimPlan, PlanCore, PlanRequest,
  DiscoveryResponse: discoverySchema(),
  PlanResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/PlanCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/PlanCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'cbp-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0 };
const reqEx = { messages: [{ role: 'system', text: 'You are a helpful assistant.' }, { role: 'user', tokens: 100 }, { role: 'assistant', text: 'Here is a concise answer to the question.' }], model: 'claude-opus-4-8', reserve_output_tokens: 4000 };
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/plan', summary: 'Fit check + trim plan', operationId: 'plan', priceUsdc: 0.005,
    requestSchemaRef: 'PlanRequest', responseSchemaRef: 'PlanResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL plan + reasoning', operationId: 'lookup', priceUsdc: 0.009, oneCall: true,
    requestSchemaRef: 'PlanRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: '180 input tokens vs 996000 available → fits.',
        key_factors: ['Window 1000000 (from claude-opus-4-8) − 4000 reserved = 996000 for input.', '3 messages, 180 tokens total.', 'Trim strategy: drop_oldest.'],
        invalidators: ['Fit/overflow depend on the supplied or estimated token counts — estimated counts are an offline heuristic and may differ from the model tokenizer.', 'Hidden system/tool/thinking tokens are not counted unless you include them as messages.', 'A different reserve or window (e.g. a different model) changes the budget.'],
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'context-budget-planner', title: 'Context Window Budget Planner API', version: '1.0.0',
  description: 'Deterministic context-window budget planner. Messages (supplied tokens or text to estimate) + a window (explicit or from a model id) + an output reserve → fits/overflow and a deterministic trim plan (drop oldest or drop lowest priority). Token counts from text are heuristic estimates.',
  endpoints, schemas, infoExtensions: { 'x-llm-infra': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
