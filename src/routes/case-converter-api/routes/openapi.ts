import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { confSections, Tail, CellValue } from '../../_aplus/specparts';
import { EnvelopeOkPlus, Error400Plus, ExecutionMetadataPlus, discoverySchemaPlus } from '../../_aplus/specparts-plus';
import { convertExample, detectExample, normalizeKeysExample, lookupExample } from './examples';

const CASE_ENUM = ['camel', 'pascal', 'snake', 'kebab', 'constant', 'dot', 'path', 'title', 'sentence', 'lower', 'upper'];
const AllCases = {
  type: 'object', required: CASE_ENUM, additionalProperties: false,
  properties: Object.fromEntries(CASE_ENUM.map((c) => [c, { type: 'string' }])),
};
const ConvertCore = {
  type: 'object', required: ['input', 'to', 'converted', 'tokens', 'detected_case'],
  properties: {
    input: { type: 'string' }, to: { type: 'string', enum: CASE_ENUM },
    converted: { type: 'string' }, tokens: { type: 'array', items: { type: 'string' } },
    detected_case: { type: 'string' },
  },
};
const DetectCore = {
  type: 'object', required: ['input', 'detected_case', 'tokens', 'all_cases'],
  properties: {
    input: { type: 'string' }, detected_case: { type: 'string' },
    tokens: { type: 'array', items: { type: 'string' } }, all_cases: AllCases,
  },
};
const ConvertRequest = {
  type: 'object', required: ['text', 'to'], additionalProperties: false,
  properties: { text: { type: 'string', maxLength: 10000 }, to: { type: 'string', enum: CASE_ENUM, description: 'Target case.' } },
};
const DetectRequest = {
  type: 'object', required: ['text'], additionalProperties: false,
  properties: { text: { type: 'string', maxLength: 10000 } },
};
const NormalizeKeysRequest = {
  type: 'object', required: ['value', 'to'], additionalProperties: false,
  properties: { value: { ...CellValue, description: 'Any JSON value; object keys are re-cased recursively.' }, to: { type: 'string', enum: CASE_ENUM, description: 'Target case for keys.' } },
};
const NormalizeKeysCore = {
  type: 'object', required: ['to', 'normalized', 'keys_renamed', 'collisions'],
  properties: {
    to: { type: 'string', enum: CASE_ENUM },
    normalized: { ...CellValue, description: 'The input with every object key re-cased.' },
    keys_renamed: { type: 'integer', minimum: 0 },
    collisions: { type: 'array', items: { type: 'string' }, description: 'Cased keys that two source keys collapsed onto (last value won).' },
  },
};

const convertReq = { text: 'XMLHttpRequest', to: 'snake' };
const detectReq = { text: 'user_profile_id' };
const normalizeReq = { value: { userId: 1, ShippingAddress: { zipCode: '94103', CountryCode: 'US' }, lineItems: [{ ProductId: 'a' }] }, to: 'snake' };

const schemas = {
  EnvelopeOk: EnvelopeOkPlus, ExecutionMetadata: ExecutionMetadataPlus, Error400: Error400Plus,
  ConfidencePerSection: confSections('tokenization', 'conversion', 'detection'), _Tail: Tail,
  AllCases, ConvertCore, DetectCore, NormalizeKeysCore, ConvertRequest, DetectRequest, NormalizeKeysRequest, DiscoveryResponse: discoverySchemaPlus(),
  ConvertResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ConvertCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  DetectResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/DetectCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  NormalizeKeysResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/NormalizeKeysCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/DetectCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const disc = {
  name: 'Case Converter API', version: '1.0.0',
  description: 'Deterministic identifier case converter. /convert tokenizes a string and renders it in a target case (camel, pascal, snake, kebab, constant, dot, path, title, sentence, lower, upper); /detect reports the most likely source case and the token split. Conversion is exact; detection is heuristic. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/case-converter/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['case_conversion', 'case_detection', 'string_tokenization', 'schema_key_normalization'],
  endpoints: [
    { method: 'POST', path: '/convert', summary: 'Convert a string to a target case', price_usdc: 0.005 },
    { method: 'POST', path: '/detect', summary: 'Detect source case + emit all cases', price_usdc: 0.005 },
    { method: 'POST', path: '/normalize-keys', summary: 'Recursively re-case all keys of a JSON object', price_usdc: 0.008 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL all-cases + reasoning', price_usdc: 0.01 },
  ],
  pricing: [
    { path: '/convert', price_usdc: 0.005, currency: 'USDC' },
    { path: '/detect', price_usdc: 0.005, currency: 'USDC' },
    { path: '/normalize-keys', price_usdc: 0.008, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.01, currency: 'USDC' },
  ],
  x402_compatible: true,
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/convert', summary: 'Convert a string to a target case', operationId: 'convert', priceUsdc: 0.005, requestSchemaRef: 'ConvertRequest', responseSchemaRef: 'ConvertResponse', requestExample: convertReq, responseExample: convertExample },
  { method: 'post', path: '/detect', summary: 'Detect source case + emit all cases', operationId: 'detect', priceUsdc: 0.005, requestSchemaRef: 'DetectRequest', responseSchemaRef: 'DetectResponse', requestExample: detectReq, responseExample: detectExample },
  { method: 'post', path: '/normalize-keys', summary: 'Recursively re-case all keys of a JSON object', operationId: 'normalizeKeys', priceUsdc: 0.008, requestSchemaRef: 'NormalizeKeysRequest', responseSchemaRef: 'NormalizeKeysResponse', requestExample: normalizeReq, responseExample: normalizeKeysExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL all-cases + reasoning', operationId: 'lookup', priceUsdc: 0.01, oneCall: true, requestSchemaRef: 'DetectRequest', responseSchemaRef: 'LookupResponse', requestExample: detectReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'case-converter', title: 'Case Converter API', version: '1.0.0',
  description: 'Deterministic identifier case converter — 11 cases (camel/pascal/snake/kebab/constant/dot/path/title/sentence/lower/upper), camelCase + acronym-aware tokenization, heuristic source-case detection. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-developer-tool': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
