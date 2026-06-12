import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const RenderCore = {
  type: 'object',
  required: ['syntax', 'variables_in_template', 'variables_provided', 'missing_variables', 'unused_variables', 'duplicate_placeholders', 'resolved_variable_map', 'placeholder_count', 'unique_variable_count', 'all_resolved', 'missing_behavior', 'rendered', 'rendered_length'],
  properties: {
    syntax: { type: 'string', enum: ['double_brace', 'dollar_brace'] },
    variables_in_template: { type: 'array', items: { type: 'string' } },
    variables_provided: { type: 'array', items: { type: 'string' } },
    missing_variables: { type: 'array', items: { type: 'string' } },
    unused_variables: { type: 'array', items: { type: 'string' } },
    duplicate_placeholders: { type: 'array', items: { type: 'string' }, description: 'Variables referenced by more than one placeholder.' },
    resolved_variable_map: { type: 'object', additionalProperties: { type: 'string' }, description: 'Each resolved path mapped to its rendered (string-formatted) value.' },
    placeholder_count: { type: 'integer' }, unique_variable_count: { type: 'integer' }, all_resolved: { type: 'boolean' },
    missing_behavior: { type: 'string', enum: ['keep', 'empty', 'error'] },
    rendered: { type: ['string', 'null'] }, rendered_length: { type: ['integer', 'null'] },
  },
};

const RenderRequest = {
  type: 'object', required: ['template'], additionalProperties: false,
  properties: {
    template: { type: 'string', minLength: 1, maxLength: 200000, description: 'Template with {{ var }} / {{ a.b.c }} placeholders.' },
    variables: { type: 'object', description: 'Map of variable names to values; dotted paths index nested objects.' },
    missing_behavior: { type: 'string', enum: ['keep', 'empty', 'error'], description: 'keep (leave {{...}}), empty (substitute ""), or error (rendered=null). Default keep.' },
    syntax: { type: 'string', enum: ['double_brace', 'dollar_brace'], description: 'Placeholder syntax: {{ var }} (default) or ${ var }.' },
  },
};

const CORE = {
  syntax: 'double_brace',
  variables_in_template: ['user.name', 'plan', 'missing'], variables_provided: ['user', 'plan', 'extra'],
  missing_variables: ['missing'], unused_variables: ['extra'], duplicate_placeholders: ['user.name'],
  resolved_variable_map: { 'user.name': 'Ada', plan: 'Pro' },
  placeholder_count: 4, unique_variable_count: 3, all_resolved: false,
  missing_behavior: 'keep', rendered: 'Hello Ada, your plan is Pro. Ref: Ada. {{ missing }}', rendered_length: 52,
};
const ACTS = [
  'Missing 1 variable(s): [missing] — left as literal {{...}}.',
  'Unused provided variable(s): [extra].',
];
const CHAIN = [
  { api: 'llm-token-counter', reason: 'Estimate tokens + cost of the rendered prompt.' },
  { api: 'context-budget-planner', reason: 'Check the rendered prompt fits the model context window.' },
];
const INVALIDATORS = [
  'Only {{ name }} / {{ a.b.c }} placeholders are substituted — no conditionals, loops, or filters are evaluated.',
  'Non-string values are JSON-stringified; a different serialization (e.g. quoting) changes the rendered output.',
  'A variable resolving to null/false/0 is treated as provided (not missing) and rendered literally.',
];
const TAIL = {
  confidence_score: 1, confidence_per_section: { render: 1 }, recommended_actions_priority_order: ACTS,
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('render'), _Tail: Tail, RenderCore, RenderRequest,
  DiscoveryResponse: discoverySchema(),
  RenderResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/RenderCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/RenderCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'ptr-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0 };
const reqEx = { template: 'Hello {{ user.name }}, your plan is {{ plan }}. Ref: {{ user.name }}. {{ missing }}', variables: { user: { name: 'Ada' }, plan: 'Pro', extra: 1 } };
const endpoints: AplusEndpoint[] = [
  {
    method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse',
    responseExample: {
      name: 'Prompt Template Renderer & Variable Validator API', version: '1.0.0',
      description: 'Deterministic prompt-template renderer. Substitutes {{ var }} / {{ a.b.c }} placeholders from a variables object and reports referenced, missing, and unused variables. Missing placeholders are kept, emptied, or flagged per missing_behavior. Pure string templating — no logic, no LLM.',
      openapi_url: 'https://orbis-apis.onrender.com/prompt-template-renderer/openapi.json',
      auth: { type: 'apiKey', header: 'X-API-Key' },
      endpoints: [
        { method: 'POST', path: '/render', summary: 'Render a template + validate variables', price_usdc: 0.004 },
        { method: 'POST', path: '/lookup', summary: 'ONE-CALL render + reasoning', price_usdc: 0.008 },
      ],
      pricing: [
        { path: '/render', price_usdc: 0.004, currency: 'USDC' },
        { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
      ],
      x402_compatible: true,
    },
  },
  {
    method: 'post', path: '/render', summary: 'Render a template + validate variables', operationId: 'render', priceUsdc: 0.004,
    requestSchemaRef: 'RenderRequest', responseSchemaRef: 'RenderResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL render + reasoning', operationId: 'lookup', priceUsdc: 0.008, oneCall: true,
    requestSchemaRef: 'RenderRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: '4 placeholder(s), 3 unique variable(s); 1 missing.',
        key_factors: ['Referenced (double_brace): user.name, plan, missing.', 'Missing: missing.', 'missing_behavior=keep; duplicated: user.name.'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'prompt-template-renderer', title: 'Prompt Template Renderer & Variable Validator API', version: '1.0.0',
  description: 'Deterministic prompt-template renderer. Substitutes {{ var }} / {{ a.b.c }} placeholders from a variables object and reports referenced, missing, and unused variables. Missing placeholders are kept, emptied, or flagged per missing_behavior. Pure string templating — no logic, no LLM.',
  endpoints, schemas, infoExtensions: { 'x-llm-infra': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
