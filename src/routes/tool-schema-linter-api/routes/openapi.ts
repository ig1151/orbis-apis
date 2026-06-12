import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const Finding = {
  type: 'object', required: ['severity', 'code', 'path', 'message'], additionalProperties: false,
  properties: { severity: { type: 'string', enum: ['error', 'warning', 'info'] }, code: { type: 'string' }, path: { type: 'string' }, message: { type: 'string' } },
};
const Counts = {
  type: 'object', required: ['error', 'warning', 'info', 'total'], additionalProperties: false,
  properties: { error: { type: 'integer' }, warning: { type: 'integer' }, info: { type: 'integer' }, total: { type: 'integer' } },
};
const LintCore = {
  type: 'object',
  required: ['tool_name', 'has_parameters', 'property_count', 'findings', 'counts', 'lint_score', 'passed'],
  properties: {
    tool_name: { type: ['string', 'null'] }, has_parameters: { type: 'boolean' }, property_count: { type: 'integer' },
    findings: { type: 'array', items: { $ref: '#/components/schemas/Finding' } },
    counts: { $ref: '#/components/schemas/Counts' },
    lint_score: { type: 'integer', minimum: 0, maximum: 100 }, passed: { type: 'boolean' },
  },
};

// The request is an arbitrary tool definition (provider-shaped) — accept any object.
const LintRequest = { type: 'object', description: 'A tool/function definition: {name, description, parameters|input_schema}. The parameters value is an arbitrary JSON Schema.' };

const CORE = {
  tool_name: 'get_weather', has_parameters: true, property_count: 2,
  findings: [
    { severity: 'warning', code: 'ADDITIONAL_PROPERTIES_NOT_FALSE', path: 'parameters', message: 'Set "additionalProperties": false so the model cannot invent extra arguments.' },
    { severity: 'info', code: 'PROPERTY_NO_DESCRIPTION', path: 'parameters.properties.units', message: 'Property "units" has no "description".' },
  ],
  counts: { error: 0, warning: 1, info: 1, total: 2 }, lint_score: 90, passed: true,
};
const ACTS = [
  'No errors — tool schema is structurally callable (score 90/100, 1 warning(s), 1 note(s)).',
  'Top issue: [ADDITIONAL_PROPERTIES_NOT_FALSE] at parameters — Set "additionalProperties": false so the model cannot invent extra arguments.',
  'Lint rules are best-practice heuristics; confirm against your specific provider\'s tool-use docs.',
];
const CHAIN = [
  { api: 'function-arg-validator', reason: 'Validate concrete tool-call arguments against this schema.' },
  { api: 'json-repair', reason: 'Salvage a malformed tool-call arguments blob before validating it.' },
];
const INVALIDATORS = [
  'Lint rules are best-practice heuristics for LLM tool-calling, not a JSON Schema spec conformance check.',
  'Provider support varies — some models handle $ref/oneOf/anyOf fine while others do not; verify against your provider.',
  'A high score means structurally sound, not that the descriptions actually guide the model well.',
];
const TAIL = {
  confidence_score: 0.9, confidence_per_section: { lint: 0.9 }, recommended_actions_priority_order: ACTS,
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('lint'), _Tail: Tail, Finding, Counts, LintCore, LintRequest,
  DiscoveryResponse: discoverySchema(),
  LintResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/LintCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/LintCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'tsl-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0 };
const reqEx = { name: 'get_weather', description: 'Get the current weather for a city.', parameters: { type: 'object', properties: { city: { type: 'string', description: 'City name.' }, units: { type: 'string', enum: ['celsius', 'fahrenheit'] } }, required: ['city'] } };
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/lint', summary: 'Lint a tool/function schema', operationId: 'lint', priceUsdc: 0.005,
    requestSchemaRef: 'LintRequest', responseSchemaRef: 'LintResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL lint + reasoning', operationId: 'lookup', priceUsdc: 0.009, oneCall: true,
    requestSchemaRef: 'LintRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: '2 finding(s) (0 error, 1 warning, 1 info) → score 90/100, passed.',
        key_factors: ['Tool "get_weather", 2 properties.', 'No structural errors.', 'Score = 100 − 25·errors − 8·warnings − 2·info (floored at 0).'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'tool-schema-linter', title: 'Tool / Function-Schema Linter API', version: '1.0.0',
  description: 'Deterministic linter for LLM tool / function-calling JSON schemas. Flags pitfalls that make models call tools wrong: missing types/descriptions, additionalProperties not pinned to false, required keys absent from properties, $ref/composition keywords, deep nesting, and invalid tool names. Pure rule checks — no LLM. Returns findings, counts, a lint score and pass/fail.',
  endpoints, schemas, infoExtensions: { 'x-llm-infra': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
