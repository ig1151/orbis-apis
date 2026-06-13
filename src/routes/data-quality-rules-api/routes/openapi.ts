import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const RuleResult = {
  type: 'object',
  required: ['rule_id', 'column', 'type', 'passed', 'evaluated', 'violations', 'sample_violation_rows', 'message'],
  additionalProperties: false,
  properties: {
    rule_id: { type: 'string' },
    column: { type: 'string' },
    type: { type: 'string', enum: ['not_null', 'unique', 'type', 'range', 'regex', 'enum', 'min_length', 'max_length'] },
    passed: { type: 'boolean' },
    evaluated: { type: 'integer', minimum: 0 },
    violations: { type: 'integer', minimum: 0 },
    sample_violation_rows: { type: 'array', items: { type: 'integer', minimum: 0 } },
    message: { type: 'string' },
  },
};
const RulesCore = {
  type: 'object',
  required: ['row_count', 'total_rules', 'passed_rules', 'failed_rules', 'total_violations', 'pass_rate', 'all_passed', 'results'],
  properties: {
    row_count: { type: 'integer', minimum: 0 },
    total_rules: { type: 'integer', minimum: 0 },
    passed_rules: { type: 'integer', minimum: 0 },
    failed_rules: { type: 'integer', minimum: 0 },
    total_violations: { type: 'integer', minimum: 0 },
    pass_rate: { type: 'number', minimum: 0, maximum: 1 },
    all_passed: { type: 'boolean' },
    results: { type: 'array', items: RuleResult },
  },
};
const Row = { type: 'object', description: 'A dataset row as a flat JSON object (column → value).' };
const Rule = {
  type: 'object', required: ['column', 'type'],
  properties: {
    id: { type: 'string', description: 'Optional rule id (default "<column>:<type>").' },
    column: { type: 'string' },
    type: { type: 'string', enum: ['not_null', 'unique', 'type', 'range', 'regex', 'enum', 'min_length', 'max_length'] },
    value: { description: 'type: one of string/number/integer/boolean; min_length/max_length: the length bound.' },
    expected: { description: 'Alias of value for type rules.' },
    min: { type: 'number', description: 'range lower bound.' },
    max: { type: 'number', description: 'range upper bound.' },
    pattern: { type: 'string', description: 'regex pattern.' },
    flags: { type: 'string', description: 'regex flags.' },
    values: { type: 'array', description: 'enum allowed values.' },
  },
};
const CheckRequest = {
  type: 'object', required: ['rows', 'rules'], additionalProperties: false,
  properties: {
    rows: { type: 'array', items: Row, minItems: 1, description: 'Dataset rows to validate.' },
    rules: { type: 'array', items: Rule, minItems: 1, description: 'Declarative quality rules to evaluate.' },
  },
};

const CORE = {
  row_count: 3, total_rules: 3, passed_rules: 2, failed_rules: 1, total_violations: 1, pass_rate: 0.6667, all_passed: false,
  results: [
    { rule_id: 'email:not_null', column: 'email', type: 'not_null', passed: true, evaluated: 3, violations: 0, sample_violation_rows: [], message: '"email" satisfies not_null on all 3 evaluated row(s).' },
    { rule_id: 'age:range', column: 'age', type: 'range', passed: false, evaluated: 3, violations: 1, sample_violation_rows: [2], message: '1 of 3 row(s) violate range on "age".' },
    { rule_id: 'id:unique', column: 'id', type: 'unique', passed: true, evaluated: 3, violations: 0, sample_violation_rows: [], message: 'All 3 non-missing values in "id" are unique.' },
  ],
};
const CHAIN = [
  { api: 'data-completeness-checker', reason: 'Quantify missing data behind not_null violations.' },
  { api: 'data-pipeline-quality-scorer', reason: 'Roll these rule results into an overall pipeline quality score.' },
];
const INVALIDATORS = [
  'Rules other than not_null skip missing values by design — add an explicit not_null rule to require presence.',
  'Numeric range/type checks accept numeric strings (e.g. "42") as numbers; use a type rule with value "number" plus a strict regex if you need to reject string-encoded numbers.',
  'sample_violation_rows is capped; "violations" is the exact full count.',
];
const TAIL = {
  confidence_score: 1, confidence_per_section: { rule_evaluation: 1 },
  recommended_actions_priority_order: [
    '1 of 3 rule(s) failed (1 total violations). Fix first: age:range (1).',
    'Quarantine or repair violating rows before promoting this dataset downstream.',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('rule_evaluation'), _Tail: Tail,
  RuleResult, RulesCore, Rule, CheckRequest, DiscoveryResponse: discoverySchema(),
  CheckResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/RulesCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/RulesCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'dqr-1780000000000', request_id: 'dqr-1780000000000', computed_at: '2026-06-13T12:00:00.000Z', success: true, latency_ms: 1 };
const reqEx = {
  rows: [{ id: 1, email: 'a@x.com', age: 30 }, { id: 2, email: 'b@x.com', age: 41 }, { id: 3, email: 'c@x.com', age: 200 }],
  rules: [
    { column: 'email', type: 'not_null' },
    { column: 'age', type: 'range', min: 0, max: 120 },
    { column: 'id', type: 'unique' },
  ],
};
const disc = {
  name: 'Data Quality Rules API', version: '1.0.0',
  description: 'Deterministic data-quality rule engine. Evaluates declarative rules (not_null, unique, type, range, regex, enum, length) against a dataset and reports per-rule pass/fail with violation counts and sample offending rows. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/data-quality-rules/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/check', summary: 'Evaluate rules against a dataset', price_usdc: 0.005 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL check + reasoning', price_usdc: 0.009 },
  ],
  pricing: [
    { path: '/check', price_usdc: 0.005, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.009, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/check', summary: 'Evaluate rules against a dataset', operationId: 'check', priceUsdc: 0.005,
    requestSchemaRef: 'CheckRequest', responseSchemaRef: 'CheckResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL check + reasoning', operationId: 'lookup', priceUsdc: 0.009, oneCall: true,
    requestSchemaRef: 'CheckRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Evaluated 3 rule(s) over 3 row(s); 2 passed, 1 failed (1 violations).',
        key_factors: ['Pass rate: 0.6667.', 'All passed: false.', 'Total violations across all rules: 1.'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'data-quality-rules', title: 'Data Quality Rules API', version: '1.0.0',
  description: 'Deterministic data-quality rule engine. Evaluates declarative rules against a dataset and reports per-rule pass/fail with violation counts. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-data-quality': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
