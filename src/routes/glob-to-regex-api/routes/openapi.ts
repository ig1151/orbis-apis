import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { confSections, Tail } from '../../_aplus/specparts';
import { EnvelopeOkPlus, Error400Plus, ExecutionMetadataPlus, discoverySchemaPlus } from '../../_aplus/specparts-plus';
import { convertExample, testExample, lookupExample } from './examples';

const GlobOptions = { type: 'object', required: ['globstar', 'nocase'], additionalProperties: false, properties: { globstar: { type: 'boolean' }, nocase: { type: 'boolean' } } };
const ConvertCore = {
  type: 'object', required: ['glob', 'regex_source', 'regex', 'flags', 'options'],
  properties: {
    glob: { type: 'string' }, regex_source: { type: 'string', description: 'The translated regex body (not yet anchored).' },
    regex: { type: 'string', description: 'The full anchored regex (^source$) used for matching.' },
    flags: { type: 'string' }, options: GlobOptions,
  },
};
const TestResult = { type: 'object', required: ['path', 'matched'], additionalProperties: false, properties: { path: { type: 'string' }, matched: { type: 'boolean' } } };
const TestCore = {
  type: 'object', required: ['glob', 'regex_source', 'regex', 'flags', 'options', 'matched_count', 'results'],
  properties: {
    glob: { type: 'string' }, regex_source: { type: 'string' }, regex: { type: 'string' }, flags: { type: 'string' }, options: GlobOptions,
    matched_count: { type: 'integer', minimum: 0 }, results: { type: 'array', items: TestResult },
  },
};
const OptionsRequest = { type: 'object', additionalProperties: false, properties: { globstar: { type: 'boolean', description: 'Treat ** as crossing path separators (default true).' }, nocase: { type: 'boolean', description: 'Case-insensitive match (default false).' } } };
const ConvertRequest = { type: 'object', required: ['glob'], additionalProperties: false, properties: { glob: { type: 'string', minLength: 1, maxLength: 1000 }, options: OptionsRequest } };
const TestRequest = { type: 'object', required: ['glob', 'paths'], additionalProperties: false, properties: { glob: { type: 'string', minLength: 1, maxLength: 1000 }, paths: { type: 'array', maxItems: 1000, items: { type: 'string', maxLength: 4096 } }, options: OptionsRequest } };

const convertReq = { glob: 'src/**/*.{ts,tsx}' };
const testReq = { glob: 'src/**/*.{ts,tsx}', paths: ['src/index.ts', 'src/routes/a/b.tsx', 'src/x.js', 'README.md'] };

const schemas = {
  EnvelopeOk: EnvelopeOkPlus, ExecutionMetadata: ExecutionMetadataPlus, Error400: Error400Plus,
  ConfidencePerSection: confSections('conversion', 'matching'), _Tail: Tail,
  GlobOptions, ConvertCore, TestResult, TestCore, OptionsRequest, ConvertRequest, TestRequest, DiscoveryResponse: discoverySchemaPlus(),
  ConvertResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ConvertCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
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
  name: 'Glob to Regex API', version: '1.0.0',
  description: 'Deterministic glob → regular-expression translator & path matcher. /convert translates a shell-style glob (*, **, ?, [..], {a,b}) into an anchored ECMAScript regex; /test reports which supplied paths match. The generated regex is ReDoS-safe by construction. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/glob-to-regex/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['glob_translation', 'path_matching', 'redos_safe_regex', 'batch_path_match'],
  endpoints: [
    { method: 'POST', path: '/convert', summary: 'Translate a glob into an anchored regex', price_usdc: 0.005 },
    { method: 'POST', path: '/test', summary: 'Match paths against a glob', price_usdc: 0.007 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL match + reasoning', price_usdc: 0.01 },
  ],
  pricing: [
    { path: '/convert', price_usdc: 0.005, currency: 'USDC' },
    { path: '/test', price_usdc: 0.007, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.01, currency: 'USDC' },
  ],
  x402_compatible: true,
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/convert', summary: 'Translate a glob into an anchored regex', operationId: 'convert', priceUsdc: 0.005, requestSchemaRef: 'ConvertRequest', responseSchemaRef: 'ConvertResponse', requestExample: convertReq, responseExample: convertExample },
  { method: 'post', path: '/test', summary: 'Match paths against a glob', operationId: 'test', priceUsdc: 0.007, requestSchemaRef: 'TestRequest', responseSchemaRef: 'TestResponse', requestExample: testReq, responseExample: testExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL match + reasoning', operationId: 'lookup', priceUsdc: 0.01, oneCall: true, requestSchemaRef: 'TestRequest', responseSchemaRef: 'LookupResponse', requestExample: testReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'glob-to-regex', title: 'Glob to Regex API', version: '1.0.0',
  description: 'Deterministic glob → regex translator & path matcher — *, **, ?, [..], {a,b}, anchored ECMAScript output, ReDoS-safe by construction. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-developer-tool': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
