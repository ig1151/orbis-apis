import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema, CellValue } from '../../_aplus/specparts';
import { queryExample, valueExample, lookupExample } from './examples';

const MatchItem = {
  type: 'object', required: ['path', 'value'], additionalProperties: false,
  properties: { path: { type: 'string', description: 'Normalized bracket path of the match, e.g. $[\'a\'][0].' }, value: { ...CellValue, description: 'The matched value.' } },
};
const QueryCore = {
  type: 'object', required: ['path', 'match_count', 'matches'],
  properties: { path: { type: 'string' }, match_count: { type: 'integer', minimum: 0 }, matches: { type: 'array', items: MatchItem } },
};
const ValueCore = {
  type: 'object', required: ['path', 'found', 'value', 'matched_path', 'match_count'],
  properties: {
    path: { type: 'string' }, found: { type: 'boolean' },
    value: { ...CellValue, description: 'First match value, or null when not found.' },
    matched_path: { type: ['string', 'null'], description: 'Normalized path of the first match, or null.' },
    match_count: { type: 'integer', minimum: 0 },
  },
};
const QueryRequest = {
  type: 'object', required: ['document', 'path'], additionalProperties: false,
  properties: { document: { ...CellValue, description: 'Any JSON document to query.' }, path: { type: 'string', minLength: 1, maxLength: 2000, description: 'A JSONPath expression starting with "$".' } },
};

const queryReq = { document: { store: { book: [{ title: 'A', price: 8 }, { title: 'B', price: 12 }] } }, path: '$.store.book[*].title' };
const valueReq = { document: { store: { book: [{ title: 'A', price: 8 }, { title: 'B', price: 12 }] } }, path: '$..book[-1].title' };

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('query'), _Tail: Tail,
  MatchItem, QueryCore, ValueCore, QueryRequest, DiscoveryResponse: discoverySchema(),
  QueryResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/QueryCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  ValueResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ValueCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/QueryCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const disc = {
  name: 'JSONPath API', version: '1.0.0',
  description: 'Deterministic JSONPath evaluator over a supplied JSON document. Supports root, child, wildcard, recursive descent, index (incl. negative), slice, and union; filter/script expressions are not supported. /query returns all matches with normalized paths; /value returns the first match. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/jsonpath/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/query', summary: 'Evaluate a JSONPath → all matches', price_usdc: 0.007 },
    { method: 'POST', path: '/value', summary: 'First match value (or null)', price_usdc: 0.006 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL query + reasoning', price_usdc: 0.012 },
  ],
  pricing: [
    { path: '/query', price_usdc: 0.007, currency: 'USDC' },
    { path: '/value', price_usdc: 0.006, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
  ],
  x402_compatible: true,
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/query', summary: 'Evaluate a JSONPath → all matches', operationId: 'query', priceUsdc: 0.007, requestSchemaRef: 'QueryRequest', responseSchemaRef: 'QueryResponse', requestExample: queryReq, responseExample: queryExample },
  { method: 'post', path: '/value', summary: 'First match value (or null)', operationId: 'value', priceUsdc: 0.006, requestSchemaRef: 'QueryRequest', responseSchemaRef: 'ValueResponse', requestExample: valueReq, responseExample: valueExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL query + reasoning', operationId: 'lookup', priceUsdc: 0.012, oneCall: true, requestSchemaRef: 'QueryRequest', responseSchemaRef: 'LookupResponse', requestExample: queryReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'jsonpath', title: 'JSONPath API', version: '1.0.0',
  description: 'Deterministic JSONPath evaluator — root/child/wildcard/recursive-descent/index/slice/union over a supplied JSON document, matches with normalized paths. No filter expressions. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-developer-tool': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
