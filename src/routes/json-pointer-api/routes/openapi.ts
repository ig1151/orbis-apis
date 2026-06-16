import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema, CellValue } from '../../_aplus/specparts';
import { resolveExample, enumerateExample, lookupExample } from './examples';

const ResolveEntry = {
  type: 'object', required: ['pointer', 'found'], additionalProperties: false,
  properties: {
    pointer: { type: 'string' },
    found: { type: 'boolean' },
    value: { ...CellValue, description: 'The value at the pointer (present only when found; null is a valid found value).' },
    type: { type: 'string', description: 'JSON type of the found value.' },
    reason: { type: 'string', description: 'Why a pointer was not found, or why it is malformed.' },
  },
};
const ResolveCore = {
  type: 'object', required: ['document_type', 'requested', 'found_count', 'missing_count', 'results'],
  properties: {
    document_type: { type: 'string' },
    requested: { type: 'integer', minimum: 0 },
    found_count: { type: 'integer', minimum: 0 },
    missing_count: { type: 'integer', minimum: 0 },
    results: { type: 'array', items: ResolveEntry },
  },
};
const PointerEntry = {
  type: 'object', required: ['pointer', 'value', 'type'], additionalProperties: false,
  properties: { pointer: { type: 'string' }, value: CellValue, type: { type: 'string' } },
};
const EnumerateCore = {
  type: 'object', required: ['document_type', 'leaf_count', 'truncated', 'entries'],
  properties: {
    document_type: { type: 'string' },
    leaf_count: { type: 'integer', minimum: 0 },
    truncated: { type: 'boolean' },
    entries: { type: 'array', items: PointerEntry },
  },
};
const ResolveRequest = {
  type: 'object', required: ['document'], additionalProperties: false,
  properties: {
    document: { ...CellValue, description: 'Any JSON document to resolve against.' },
    pointer: { type: 'string', description: 'A single RFC 6901 JSON Pointer.' },
    pointers: { type: 'array', items: { type: 'string' }, description: 'Multiple JSON Pointers (alternative to "pointer").' },
  },
};
const EnumerateRequest = {
  type: 'object', required: ['document'], additionalProperties: false,
  properties: {
    document: { ...CellValue, description: 'Any JSON document to enumerate.' },
    max: { type: 'integer', minimum: 1, description: 'Max leaf pointers to return (default 5000).' },
  },
};

const resolveReq = {
  document: { user: { name: 'Ada', roles: ['admin', 'editor'], 'a/b': 1 }, items: [10, 20], active: null },
  pointers: ['/user/name', '/user/roles/0', '/user/a~1b', '/items/1', '/active', '/user/missing', '/items/5'],
};
const enumerateReq = { document: { user: { name: 'Ada', active: true }, tags: ['x', 'y'], meta: {} } };

const disc = {
  name: 'JSON Pointer API', version: '1.0.0',
  description: 'Deterministic RFC 6901 JSON Pointer evaluator. Resolves one or many pointers against a supplied JSON document and can enumerate every leaf pointer. No LLM, nothing fetched, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/json-pointer/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/resolve', summary: 'Resolve one or many JSON Pointers', price_usdc: 0.005 },
    { method: 'POST', path: '/enumerate', summary: 'List every leaf pointer in a document', price_usdc: 0.006 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL resolve + reasoning', price_usdc: 0.010 },
  ],
  pricing: [
    { path: '/resolve', price_usdc: 0.005, currency: 'USDC' },
    { path: '/enumerate', price_usdc: 0.006, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.010, currency: 'USDC' },
  ],
  x402_compatible: true,
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('resolution', 'enumeration'), _Tail: Tail,
  ResolveEntry, ResolveCore, PointerEntry, EnumerateCore, ResolveRequest, EnumerateRequest, DiscoveryResponse: discoverySchema(),
  ResolveResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ResolveCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  EnumerateResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/EnumerateCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ResolveCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/resolve', summary: 'Resolve one or many JSON Pointers', operationId: 'resolve', priceUsdc: 0.005, requestSchemaRef: 'ResolveRequest', responseSchemaRef: 'ResolveResponse', requestExample: resolveReq, responseExample: resolveExample },
  { method: 'post', path: '/enumerate', summary: 'List every leaf pointer in a document', operationId: 'enumerate', priceUsdc: 0.006, requestSchemaRef: 'EnumerateRequest', responseSchemaRef: 'EnumerateResponse', requestExample: enumerateReq, responseExample: enumerateExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL resolve + reasoning', operationId: 'lookup', priceUsdc: 0.010, oneCall: true, requestSchemaRef: 'ResolveRequest', responseSchemaRef: 'LookupResponse', requestExample: resolveReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'json-pointer', title: 'JSON Pointer API', version: '1.0.0',
  description: 'Deterministic RFC 6901 JSON Pointer evaluator — resolve one/many pointers + enumerate all leaf pointers of a JSON document. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-developer-tool': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
