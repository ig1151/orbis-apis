import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const PreItems = { type: 'array', items: { type: ['string', 'integer'] } };

const ParseCore = {
  type: 'object',
  required: ['input', 'valid', 'error_reason', 'major', 'minor', 'patch', 'prerelease', 'build', 'prerelease_string', 'is_prerelease', 'is_stable', 'normalized'],
  additionalProperties: false,
  properties: {
    input: { type: 'string' }, valid: { type: 'boolean' }, error_reason: { type: ['string', 'null'] },
    major: { type: ['integer', 'null'] }, minor: { type: ['integer', 'null'] }, patch: { type: ['integer', 'null'] },
    prerelease: PreItems, build: { type: 'array', items: { type: 'string' } }, prerelease_string: { type: ['string', 'null'] },
    is_prerelease: { type: 'boolean' }, is_stable: { type: 'boolean' }, normalized: { type: ['string', 'null'] },
  },
};
const CompareCore = {
  type: 'object', required: ['a', 'b', 'comparison', 'relation', 'note'], additionalProperties: false,
  properties: {
    a: { type: 'string' }, b: { type: 'string' }, comparison: { type: 'integer', enum: [-1, 0, 1] },
    relation: { type: 'string', enum: ['lt', 'eq', 'gt'] }, note: { type: 'string' },
  },
};
const SatisfiesCore = {
  type: 'object', required: ['version', 'range', 'range_normalized', 'satisfies'], additionalProperties: false,
  properties: { version: { type: 'string' }, range: { type: 'string' }, range_normalized: { type: 'string' }, satisfies: { type: 'boolean' } },
};

const ParseRequest = { type: 'object', required: ['version'], additionalProperties: false, properties: { version: { type: 'string' } } };
const CompareRequest = { type: 'object', required: ['a', 'b'], additionalProperties: false, properties: { a: { type: 'string' }, b: { type: 'string' } } };
const SatisfiesRequest = { type: 'object', required: ['version', 'range'], additionalProperties: false, properties: { version: { type: 'string' }, range: { type: 'string' } } };
const LookupRequest = {
  type: 'object', required: ['version'], additionalProperties: false,
  properties: { version: { type: 'string' }, range: { type: 'string', description: 'Optional npm-style range to test.' }, compare_to: { type: 'string', description: 'Optional version to compare against.' } },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('parse', 'comparison', 'range'), _Tail: Tail,
  ParseCore, CompareCore, SatisfiesCore, ParseRequest, CompareRequest, SatisfiesRequest, LookupRequest, DiscoveryResponse: discoverySchema(),
  ParseResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ParseCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  CompareResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/CompareCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  SatisfiesResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/SatisfiesCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      {
        type: 'object', required: ['parse', 'satisfies', 'compare', 'reasoning'],
        properties: {
          parse: { $ref: '#/components/schemas/ParseCore' },
          satisfies: { oneOf: [{ $ref: '#/components/schemas/SatisfiesCore' }, { type: 'null' }] },
          compare: { oneOf: [{ $ref: '#/components/schemas/CompareCore' }, { type: 'null' }] },
          reasoning: { $ref: '#/components/schemas/Reasoning' },
        },
      },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'svr-1780000000000', request_id: 'svr-1780000000000', computed_at: '2026-06-12T12:00:00.000Z', success: true, latency_ms: 0 };
const CHAIN = [{ api: 'radix-converter', reason: 'Convert build numbers between bases if needed.' }];
const PARSE_INVALIDATORS = [
  'Strict semver 2.0.0 grammar: leading zeros in numeric identifiers and missing components are rejected. A leading "v" is tolerated and stripped.',
  'Build metadata (+...) never affects precedence and is preserved separately.',
];
const SAT_INVALIDATORS = [
  'Range semantics follow npm/node-semver: a prerelease version matches a range only when a comparator targets the same major.minor.patch and itself carries a prerelease.',
  'X-ranges, caret, tilde, hyphen ranges, and || are supported; advanced/rare forms not covered here will be reported as unparseable rather than silently mismatched.',
];

const PARSE_CORE = { input: '1.2.3', valid: true, error_reason: null, major: 1, minor: 2, patch: 3, prerelease: [], build: [], prerelease_string: null, is_prerelease: false, is_stable: true, normalized: '1.2.3' };
const COMPARE_CORE = { a: '1.2.3', b: '1.3.0', comparison: -1, relation: 'lt', note: '1.3.0 has higher precedence; compared by major.minor.patch.' };
const SAT_CORE = { version: '1.2.5', range: '^1.2.3', range_normalized: '>=1.2.3 <2.0.0', satisfies: true };

const tail = (section: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, confidence_per_section: section, recommended_actions_priority_order: actions,
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
});

const disc = {
  name: 'Semver Tools API', version: '1.0.0',
  description: 'Deterministic Semantic Versioning toolkit: parse/validate, compare by precedence (semver §11), and test a version against an npm-style range (^, ~, x-ranges, hyphen, ||). No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/semver-tools/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/parse', summary: 'Parse & validate a version', price_usdc: 0.003 },
    { method: 'POST', path: '/compare', summary: 'Compare two versions', price_usdc: 0.003 },
    { method: 'POST', path: '/satisfies', summary: 'Test a version against a range', price_usdc: 0.004 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL parse + optional compare/satisfies + reasoning', price_usdc: 0.008 },
  ],
  pricing: [
    { path: '/parse', price_usdc: 0.003, currency: 'USDC' },
    { path: '/compare', price_usdc: 0.003, currency: 'USDC' },
    { path: '/satisfies', price_usdc: 0.004, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/parse', summary: 'Parse & validate a version', operationId: 'parse', priceUsdc: 0.003,
    requestSchemaRef: 'ParseRequest', responseSchemaRef: 'ParseResponse', requestExample: { version: '1.2.3' },
    responseExample: { ...env, ...PARSE_CORE, ...tail({ parse: 1 }, ['Valid semver 1.2.3 (stable).']) },
  },
  {
    method: 'post', path: '/compare', summary: 'Compare two versions', operationId: 'compare', priceUsdc: 0.003,
    requestSchemaRef: 'CompareRequest', responseSchemaRef: 'CompareResponse', requestExample: { a: '1.2.3', b: '1.3.0' },
    responseExample: { ...env, ...COMPARE_CORE, ...tail({ comparison: 1 }, ['1.2.3 is lower than 1.3.0.']) },
  },
  {
    method: 'post', path: '/satisfies', summary: 'Test a version against a range', operationId: 'satisfies', priceUsdc: 0.004,
    requestSchemaRef: 'SatisfiesRequest', responseSchemaRef: 'SatisfiesResponse', requestExample: { version: '1.2.5', range: '^1.2.3' },
    responseExample: { ...env, ...SAT_CORE, ...tail({ range: 1 }, ['1.2.5 satisfies "^1.2.3" (normalized: >=1.2.3 <2.0.0).']) },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL parse + optional compare/satisfies + reasoning', operationId: 'lookup', priceUsdc: 0.008, oneCall: true,
    requestSchemaRef: 'LookupRequest', responseSchemaRef: 'LookupResponse', requestExample: { version: '1.2.5', range: '^1.2.3', compare_to: '1.3.0' },
    responseExample: {
      ...env,
      parse: { ...PARSE_CORE, input: '1.2.5', patch: 5, normalized: '1.2.5' },
      satisfies: SAT_CORE,
      compare: { a: '1.2.5', b: '1.3.0', comparison: -1, relation: 'lt', note: '1.3.0 has higher precedence; compared by major.minor.patch.' },
      reasoning: {
        why_result_generated: 'Parsed "1.2.5" (valid), tested against range "^1.2.3", compared to "1.3.0".',
        key_factors: ['Normalized: 1.2.5; prerelease=false.', 'satisfies=true (normalized range >=1.2.3 <2.0.0).', 'compare: lt (-1).'],
        invalidators: [...PARSE_INVALIDATORS, ...SAT_INVALIDATORS],
      },
      ...tail({ parse: 1, range: 1, comparison: 1 }, ['Valid semver 1.2.5.']),
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'semver-tools', title: 'Semver Tools API', version: '1.0.0',
  description: 'Deterministic Semantic Versioning toolkit: parse, compare by precedence, and range-satisfies (^, ~, x-ranges, hyphen, ||). No LLM, nothing stored.',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
