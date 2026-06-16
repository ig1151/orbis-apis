import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema, CellValue } from '../../_aplus/specparts';
import { applyExample, diffExample, lookupExample } from './examples';

const PatchOp = {
  type: 'object', required: ['op', 'path'], additionalProperties: false,
  properties: {
    op: { type: 'string', enum: ['add', 'remove', 'replace', 'move', 'copy', 'test'] },
    path: { type: 'string', description: 'RFC 6901 JSON Pointer target.' },
    from: { type: 'string', description: 'Source pointer (move/copy only).' },
    value: { ...CellValue, description: 'Operand value (add/replace/test).' },
  },
};
const TestResult = {
  type: 'object', required: ['index', 'path', 'passed'], additionalProperties: false,
  properties: { index: { type: 'integer', minimum: 0 }, path: { type: 'string' }, passed: { type: 'boolean' } },
};
const ApplyCore = {
  type: 'object', required: ['operation_count', 'applied', 'test_results'],
  properties: {
    operation_count: { type: 'integer', minimum: 0 },
    applied: { type: 'boolean' },
    document: { ...CellValue, description: 'The patched document (present only when applied=true).' },
    failed_at_index: { type: 'integer', minimum: 0, description: 'Index of the operation that failed (when applied=false).' },
    failure_reason: { type: 'string' },
    test_results: { type: 'array', items: TestResult },
  },
};
const DiffCore = {
  type: 'object', required: ['operation_count', 'patch'],
  properties: { operation_count: { type: 'integer', minimum: 0 }, patch: { type: 'array', items: PatchOp } },
};
const ApplyRequest = {
  type: 'object', required: ['document', 'patch'], additionalProperties: false,
  properties: {
    document: { ...CellValue, description: 'Any JSON document to patch.' },
    patch: { type: 'array', items: PatchOp, description: 'Ordered RFC 6902 operations.' },
  },
};
const DiffRequest = {
  type: 'object', required: ['from', 'to'], additionalProperties: false,
  properties: { from: { ...CellValue, description: 'Source document.' }, to: { ...CellValue, description: 'Target document.' } },
};

const applyReq = {
  document: { name: 'Ada', roles: ['admin'], age: 30 },
  patch: [
    { op: 'add', path: '/roles/-', value: 'editor' },
    { op: 'replace', path: '/age', value: 31 },
    { op: 'test', path: '/roles/0', value: 'admin' },
    { op: 'remove', path: '/name' },
  ],
};
const diffReq = { from: { a: 1, b: [1, 2], c: 'x' }, to: { a: 2, b: [1, 2, 3], d: true } };

const disc = {
  name: 'JSON Patch API', version: '1.0.0',
  description: 'Deterministic RFC 6902 JSON Patch engine. /apply runs an ordered patch (add/remove/replace/move/copy/test) atomically against a document; /diff generates a patch transforming one document into another. Operates on a clone — input never mutated. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/json-patch/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/apply', summary: 'Apply an RFC 6902 patch to a document', price_usdc: 0.007 },
    { method: 'POST', path: '/diff', summary: 'Generate a patch transforming from→to', price_usdc: 0.012 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL apply + reasoning', price_usdc: 0.015 },
  ],
  pricing: [
    { path: '/apply', price_usdc: 0.007, currency: 'USDC' },
    { path: '/diff', price_usdc: 0.012, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.015, currency: 'USDC' },
  ],
  x402_compatible: true,
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('apply', 'diff'), _Tail: Tail,
  PatchOp, TestResult, ApplyCore, DiffCore, ApplyRequest, DiffRequest, DiscoveryResponse: discoverySchema(),
  ApplyResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ApplyCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  DiffResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/DiffCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ApplyCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/apply', summary: 'Apply an RFC 6902 patch to a document', operationId: 'apply', priceUsdc: 0.007, requestSchemaRef: 'ApplyRequest', responseSchemaRef: 'ApplyResponse', requestExample: applyReq, responseExample: applyExample },
  { method: 'post', path: '/diff', summary: 'Generate a patch transforming from→to', operationId: 'diff', priceUsdc: 0.012, requestSchemaRef: 'DiffRequest', responseSchemaRef: 'DiffResponse', requestExample: diffReq, responseExample: diffExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL apply + reasoning', operationId: 'lookup', priceUsdc: 0.015, oneCall: true, requestSchemaRef: 'ApplyRequest', responseSchemaRef: 'LookupResponse', requestExample: applyReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'json-patch', title: 'JSON Patch API', version: '1.0.0',
  description: 'Deterministic RFC 6902 JSON Patch engine — atomic apply (add/remove/replace/move/copy/test) + from→to diff. Operates on a clone; input never mutated. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-developer-tool': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
