import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const RepairCore = {
  type: 'object',
  required: ['original_valid', 'valid_json', 'repaired', 'repairs_applied', 'parse_error', 'repaired_text'],
  properties: {
    original_valid: { type: 'boolean' }, valid_json: { type: 'boolean' }, repaired: { type: 'boolean' },
    repairs_applied: { type: 'array', items: { type: 'string' } },
    parse_error: { type: ['string', 'null'] }, repaired_text: { type: ['string', 'null'] },
    parsed: { description: 'The parsed value (any JSON), present unless return_parsed=false; null if repair failed.' },
  },
};

const RepairRequest = {
  type: 'object', required: ['text'], additionalProperties: false,
  properties: {
    text: { type: 'string', minLength: 1, maxLength: 200000, description: 'Possibly-malformed JSON, optionally wrapped in prose or code fences.' },
    return_parsed: { type: 'boolean', description: 'Include the parsed value in the response. Default true.' },
  },
};

const CORE = {
  original_valid: false, valid_json: true, repaired: true,
  repairs_applied: ['normalized_quotes', 'quoted_unquoted_key', 'python_literal', 'removed_trailing_comma', 'stripped_code_fence'],
  parse_error: null,
  repaired_text: '{"name":"Ada","age":36,"admin":true,"tags":["x","y"],"note":null}',
  parsed: { name: 'Ada', age: 36, admin: true, tags: ['x', 'y'], note: null },
};
const ACTS = [
  'Repaired: applied 5 fix(es) [normalized_quotes, quoted_unquoted_key, python_literal, removed_trailing_comma, stripped_code_fence] and re-serialized valid JSON.',
  'Verify the parsed result — repairs like quote normalization, unquoted-value-to-string, or auto-closing can change meaning.',
];
const CHAIN = [
  { api: 'function-arg-validator', reason: 'Validate the repaired JSON against the expected tool/function schema.' },
  { api: 'tool-schema-linter', reason: 'If this is a tool call, lint the target schema.' },
];
const INVALIDATORS = [
  'Repair is best-effort and heuristic — transforms (quote normalization, unquoted-value→string, Python-literal mapping, auto-closing) can change the intended meaning.',
  'Only the first balanced JSON value is parsed; additional trailing values are dropped (stripped_trailing_text).',
  'A valid_json:true result means it parses, not that it matches any expected schema — validate separately.',
];
const TAIL = {
  confidence_score: 0.8, confidence_per_section: { repair: 0.8 }, recommended_actions_priority_order: ACTS,
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('repair'), _Tail: Tail, RepairCore, RepairRequest,
  DiscoveryResponse: discoverySchema(),
  RepairResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/RepairCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/RepairCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'jsr-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0 };
const reqEx = { text: "```json\n{ 'name': 'Ada', age: 36, admin: True, tags: ['x','y',], note: None }\n```" };
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/repair', summary: 'Repair malformed JSON', operationId: 'repair', priceUsdc: 0.005,
    requestSchemaRef: 'RepairRequest', responseSchemaRef: 'RepairResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL repair + reasoning', operationId: 'lookup', priceUsdc: 0.009, oneCall: true,
    requestSchemaRef: 'RepairRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Applied 5 repair(s) and re-parsed successfully.',
        key_factors: ['Original invalid; repairs: normalized_quotes, quoted_unquoted_key, python_literal, removed_trailing_comma, stripped_code_fence.', 'valid_json=true.', 'Output is canonical re-serialized JSON.'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'json-repair', title: 'JSON Repair / Salvage API', version: '1.0.0',
  description: 'Deterministic best-effort JSON repair for malformed model output. A tolerant parser fixes code fences, leading/trailing prose, comments, single/smart quotes, unquoted keys, trailing commas, Python literals, non-finite numbers, and unclosed brackets, then re-serializes canonical JSON and reports every transform applied. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-llm-infra': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
