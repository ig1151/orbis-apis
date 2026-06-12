import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';
import { PRICING_TABLE_VERSION, PRICING_TABLE_UPDATED_AT, PRICING_INVALIDATORS } from '../../_aplus/llm-pricing';

const numNull = { type: ['number', 'null'] };
const intNull = { type: ['integer', 'null'] };

const LedgerCore = {
  type: 'object',
  required: ['model', 'provider', 'found', 'message_count', 'total_input_tokens', 'total_output_tokens', 'total_tokens', 'input_cost_usd', 'output_cost_usd', 'total_cost_usd', 'is_estimate', 'projected_turns', 'projected_input_tokens', 'projected_output_tokens', 'projected_additional_cost_usd', 'projected_total_cost_usd', 'pricing_table_version', 'pricing_table_updated_at'],
  properties: {
    model: { type: ['string', 'null'] }, provider: { type: ['string', 'null'] }, found: { type: 'boolean' },
    message_count: { type: 'integer' }, total_input_tokens: { type: 'integer' }, total_output_tokens: { type: 'integer' }, total_tokens: { type: 'integer' },
    input_cost_usd: numNull, output_cost_usd: numNull, total_cost_usd: numNull, is_estimate: { type: 'boolean' },
    projected_turns: { type: 'integer' }, projected_input_tokens: intNull, projected_output_tokens: intNull,
    projected_additional_cost_usd: numNull, projected_total_cost_usd: numNull,
    pricing_table_version: { type: 'string' }, pricing_table_updated_at: { type: 'string' },
  },
};

const MsgIn = {
  type: 'object', additionalProperties: false,
  properties: {
    role: { type: 'string', description: 'role "assistant" counts as output tokens; all others as input.' },
    tokens: { type: 'integer', minimum: 0, description: 'Exact token count; overrides text estimation.' },
    text: { type: 'string', description: 'Used to estimate tokens if "tokens" is omitted.' },
  },
};
const TallyRequest = {
  type: 'object', required: ['messages', 'model'], additionalProperties: false,
  properties: {
    messages: { type: 'array', minItems: 1, maxItems: 5000, items: MsgIn },
    model: { type: 'string', description: 'Model id/alias. Unknown → found:false, cost null.' },
    projected_turns: { type: 'integer', minimum: 0, description: 'Additional turns to project. Default 0 (no projection).' },
    avg_input_tokens_per_turn: { type: 'number', minimum: 0, description: 'Override the per-turn input average for projection.' },
    avg_output_tokens_per_turn: { type: 'number', minimum: 0, description: 'Override the per-turn output average for projection.' },
  },
};

const CORE = {
  model: 'claude-opus-4-8', provider: 'anthropic', found: true,
  message_count: 4, total_input_tokens: 220, total_output_tokens: 650, total_tokens: 870,
  input_cost_usd: 0.0011, output_cost_usd: 0.01625, total_cost_usd: 0.01735, is_estimate: false,
  projected_turns: 3, projected_input_tokens: 330, projected_output_tokens: 975,
  projected_additional_cost_usd: 0.026025, projected_total_cost_usd: 0.043375,
  pricing_table_version: PRICING_TABLE_VERSION, pricing_table_updated_at: PRICING_TABLE_UPDATED_AT,
};
const ACTS = [
  'Conversation cost so far on claude-opus-4-8: $0.01735 (220 in + 650 out).',
  'Projected to $0.043375 after 3 more turn(s).',
  'Naive per-message tally — real chat APIs re-send prior context as input each turn, so cumulative input cost is higher.',
];
const CHAIN = [
  { api: 'model-pricing-comparator', reason: 'Compare this conversation\'s cost across other models.' },
  { api: 'context-budget-planner', reason: 'Check whether the running context still fits the window.' },
];
const TAIL = {
  confidence_score: 1, confidence_per_section: { usage: 1, cost: 1, projection: 0.6 }, recommended_actions_priority_order: ACTS,
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('usage', 'cost', 'projection'), _Tail: Tail, LedgerCore, TallyRequest,
  DiscoveryResponse: discoverySchema(),
  TallyResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/LedgerCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/LedgerCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'ccl-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0 };
const reqEx = { model: 'claude-opus-4-8', messages: [{ role: 'user', tokens: 100 }, { role: 'assistant', tokens: 300 }, { role: 'user', tokens: 120 }, { role: 'assistant', tokens: 350 }], projected_turns: 3 };
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/tally', summary: 'Tally + price a conversation', operationId: 'tally', priceUsdc: 0.005,
    requestSchemaRef: 'TallyRequest', responseSchemaRef: 'TallyResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL tally + projection + reasoning', operationId: 'lookup', priceUsdc: 0.009, oneCall: true,
    requestSchemaRef: 'TallyRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: '4 messages → 220 in + 650 out; $0.01735 on claude-opus-4-8; projected $0.043375 after 3 turns.',
        key_factors: ['220 input / 650 output tokens.', 'Priced against claude-opus-4-8 (anthropic).', 'All token counts supplied directly (exact cost).'],
        invalidators: [...PRICING_INVALIDATORS, 'Naive per-message tally: real chat APIs re-send prior context as input each turn, so cumulative input is higher than the sum of message inputs.', 'Projection multiplies average per-turn tokens by the requested turns — actual future turns will vary.'],
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'conversation-cost-ledger', title: 'Conversation Cost Ledger API', version: '1.0.0',
  description: 'Deterministic conversation cost ledger. Tallies input/output tokens across a message log (supplied tokens or text to estimate), prices them against a static table, and optionally projects spend for N more turns. Assistant = output, other roles = input. Naive per-message billing; cost given tokens is exact.',
  endpoints, schemas, infoExtensions: { 'x-llm-infra': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
