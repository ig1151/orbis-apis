import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const NormErr = {
  type: 'object', required: ['instance_path', 'keyword', 'message'], additionalProperties: false,
  properties: { instance_path: { type: 'string' }, keyword: { type: 'string' }, message: { type: 'string' } },
};
const ArgCore = {
  type: 'object',
  required: ['valid', 'error_count', 'errors', 'missing_required', 'extra_properties', 'coercion_applied', 'coercion_valid', 'coerced_arguments'],
  properties: {
    valid: { type: 'boolean' }, error_count: { type: 'integer' },
    errors: { type: 'array', items: { $ref: '#/components/schemas/NormErr' } },
    missing_required: { type: 'array', items: { type: 'string' } }, extra_properties: { type: 'array', items: { type: 'string' } },
    coercion_applied: { type: 'boolean' }, coercion_valid: { type: 'boolean' },
    coerced_arguments: { description: 'The arguments after the coercion pass (any JSON value).' },
  },
};

const ValidateRequest = {
  type: 'object', required: ['schema', 'arguments'], additionalProperties: false,
  properties: {
    schema: { type: 'object', description: 'A JSON Schema (2020-12 dialect) to validate against.' },
    arguments: { description: 'The function-call arguments to validate — an object/array/scalar, or a JSON string to parse.' },
  },
};

const CORE = {
  valid: false, error_count: 1,
  errors: [{ instance_path: '/days', keyword: 'type', message: 'must be integer' }],
  missing_required: [], extra_properties: [],
  coercion_applied: true, coercion_valid: true, coerced_arguments: { city: 'Denver', days: 3 },
};
const ACTS = [
  'Invalid: 1 error(s).',
  'Light coercion (string→number/boolean, defaults) WOULD make it valid — use coerced_arguments instead of re-prompting.',
];
const CHAIN = [
  { api: 'json-repair', reason: 'Salvage a malformed arguments JSON string before validating.' },
  { api: 'tool-schema-linter', reason: 'Lint the schema itself if validation keeps failing unexpectedly.' },
];
const INVALIDATORS = [
  'Validation uses the JSON Schema 2020-12 dialect (ajv, strict:false); a provider that targets a different draft may accept/reject differently.',
  'The coercion pass is a convenience (ajv coerceTypes + defaults) — your provider may not coerce, so re-prompting can still be required.',
  'Schemas with remote $ref are not fetched; such refs fail to compile and return a 400.',
];
const TAIL = {
  confidence_score: 1, confidence_per_section: { validation: 1, coercion: 0.9 }, recommended_actions_priority_order: ACTS,
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('validation', 'coercion'), _Tail: Tail, NormErr, ArgCore, ValidateRequest,
  DiscoveryResponse: discoverySchema(),
  ValidateResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ArgCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ArgCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'fav-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0 };
const reqEx = { schema: { type: 'object', properties: { city: { type: 'string' }, days: { type: 'integer' } }, required: ['city'], additionalProperties: false }, arguments: { city: 'Denver', days: '3' } };
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/validate', summary: 'Validate arguments against a JSON Schema', operationId: 'validate', priceUsdc: 0.005,
    requestSchemaRef: 'ValidateRequest', responseSchemaRef: 'ValidateResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL validation + coercion + reasoning', operationId: 'lookup', priceUsdc: 0.009, oneCall: true,
    requestSchemaRef: 'ValidateRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Invalid (1 error(s)); valid after coercion.',
        key_factors: ['Strict errors: 1.', 'No missing required keys.', 'Coercion changed the arguments; valid_after_coercion=true.'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'function-arg-validator', title: 'Function-Call Argument Validator API', version: '1.0.0',
  description: 'Deterministic validator for LLM function/tool-call arguments against a JSON Schema (ajv, 2020-12 dialect). Returns pass/fail, normalized errors, missing-required and unexpected-extra keys, and a coercion pass showing whether string→number/boolean coercion + defaults would make the arguments valid. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-llm-infra': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
