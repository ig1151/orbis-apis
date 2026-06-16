import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';
import { analyzeExample, testExample, lookupExample } from './examples';

const Features = {
  type: 'object',
  required: ['has_alternation', 'has_lookahead', 'has_lookbehind', 'has_backreference', 'has_quantifier', 'has_character_class'],
  additionalProperties: false,
  properties: {
    has_alternation: { type: 'boolean' },
    has_lookahead: { type: 'boolean' },
    has_lookbehind: { type: 'boolean' },
    has_backreference: { type: 'boolean' },
    has_quantifier: { type: 'boolean' },
    has_character_class: { type: 'boolean' },
  },
};
const AnalyzeCore = {
  type: 'object',
  required: ['pattern', 'flags', 'valid', 'compile_error', 'capture_groups', 'named_groups', 'anchored_start', 'anchored_end', 'features', 'catastrophic_risk', 'risk_reason'],
  properties: {
    pattern: { type: 'string' },
    flags: { type: 'string' },
    valid: { type: 'boolean' },
    compile_error: { type: ['string', 'null'], description: 'Compile error message when valid=false, else null.' },
    capture_groups: { type: 'integer', minimum: 0, description: 'Exact count of capturing groups (named + positional).' },
    named_groups: { type: 'array', items: { type: 'string' }, description: 'Exact list of named-group names.' },
    anchored_start: { type: 'boolean' },
    anchored_end: { type: 'boolean' },
    features: Features,
    catastrophic_risk: { type: 'boolean', description: 'Heuristic nested-unbounded-quantifier detection; /test refuses patterns where true.' },
    risk_reason: { type: 'string' },
  },
};
const RegexMatch = {
  type: 'object',
  required: ['match', 'index', 'length', 'groups', 'named_groups'],
  additionalProperties: false,
  properties: {
    match: { type: 'string', description: 'The full matched substring.' },
    index: { type: 'integer', minimum: 0 },
    length: { type: 'integer', minimum: 0 },
    groups: { type: 'array', items: { type: ['string', 'null'] }, description: 'Positional capture groups (null when a group did not participate).' },
    named_groups: { type: 'object', additionalProperties: { type: ['string', 'null'] } },
  },
};
const InputResult = {
  type: 'object',
  required: ['input_index', 'matched', 'match_count', 'truncated', 'matches'],
  additionalProperties: false,
  properties: {
    input_index: { type: 'integer', minimum: 0 },
    matched: { type: 'boolean' },
    match_count: { type: 'integer', minimum: 0 },
    truncated: { type: 'boolean', description: 'True when the 1000-match-per-input cap was hit.' },
    matches: { type: 'array', items: RegexMatch },
  },
};
const TestCore = {
  type: 'object',
  required: ['pattern', 'flags', 'global', 'input_count', 'total_matches', 'any_matched', 'results'],
  properties: {
    pattern: { type: 'string' },
    flags: { type: 'string' },
    global: { type: 'boolean' },
    input_count: { type: 'integer', minimum: 0 },
    total_matches: { type: 'integer', minimum: 0 },
    any_matched: { type: 'boolean' },
    results: { type: 'array', items: InputResult },
  },
};
const AnalyzeRequest = {
  type: 'object', required: ['pattern'], additionalProperties: false,
  properties: {
    pattern: { type: 'string', minLength: 1, maxLength: 1000, description: 'The regular-expression source (no delimiters).' },
    flags: { type: 'string', description: 'ECMAScript flags from the set d,g,i,m,s,u,y.' },
  },
};
const TestRequest = {
  type: 'object', required: ['pattern', 'inputs'], additionalProperties: false,
  properties: {
    pattern: { type: 'string', minLength: 1, maxLength: 1000, description: 'The regular-expression source (no delimiters).' },
    flags: { type: 'string', description: 'ECMAScript flags from the set d,g,i,m,s,u,y.' },
    inputs: { type: 'array', maxItems: 100, items: { type: 'string', maxLength: 100000 }, description: 'Strings to test the pattern against.' },
  },
};

const analyzeReq = { pattern: '(?<year>\\d{4})-(\\d{2})', flags: '' };
const testReq = { pattern: '(\\w+)@(\\w+)', flags: 'g', inputs: ['ada@dev and grace@io', 'no-email-here'] };

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('validity', 'structure', 'safety', 'matching'), _Tail: Tail,
  Features, AnalyzeCore, RegexMatch, InputResult, TestCore, AnalyzeRequest, TestRequest, DiscoveryResponse: discoverySchema(),
  AnalyzeResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/AnalyzeCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  TestResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/TestCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/TestCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const disc = {
  name: 'Regex Tester API', version: '1.0.0',
    description: 'Deterministic regular-expression tester & analyzer (ECMAScript engine). /analyze statically inspects a pattern (compile validity, capture/named groups, features, catastrophic-backtracking risk) without executing it; /test runs the pattern against caller inputs and returns matches with groups, refusing patterns that look catastrophic. No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/regex-tester/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/analyze', summary: 'Statically analyze a regex (no execution)', price_usdc: 0.006 },
      { method: 'POST', path: '/test', summary: 'Run a regex against inputs and return matches', price_usdc: 0.008 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL test + reasoning', price_usdc: 0.013 },
    ],
    pricing: [
      { path: '/analyze', price_usdc: 0.006, currency: 'USDC' },
      { path: '/test', price_usdc: 0.008, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.013, currency: 'USDC' },
    ],
  x402_compatible: true,
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/analyze', summary: 'Statically analyze a regex (no execution)', operationId: 'analyze', priceUsdc: 0.006, requestSchemaRef: 'AnalyzeRequest', responseSchemaRef: 'AnalyzeResponse', requestExample: analyzeReq, responseExample: analyzeExample },
  { method: 'post', path: '/test', summary: 'Run a regex against inputs and return matches', operationId: 'test', priceUsdc: 0.008, requestSchemaRef: 'TestRequest', responseSchemaRef: 'TestResponse', requestExample: testReq, responseExample: testExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL test + reasoning', operationId: 'lookup', priceUsdc: 0.013, oneCall: true, requestSchemaRef: 'TestRequest', responseSchemaRef: 'LookupResponse', requestExample: testReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'regex-tester', title: 'Regex Tester API', version: '1.0.0',
  description: 'Deterministic ECMAScript regex tester & analyzer — static /analyze (validity, groups, features, ReDoS risk) + executing /test (matches with capture & named groups), refusing catastrophic patterns. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-developer-tool': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
