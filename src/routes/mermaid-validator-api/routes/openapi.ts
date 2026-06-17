import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { confSections, Tail } from '../../_aplus/specparts';
import { EnvelopeOkPlus, Error400Plus, ExecutionMetadataPlus, discoverySchemaPlus } from '../../_aplus/specparts-plus';
import { validateExample, lookupExample } from './examples';
import { DISCOVERY as disc } from './intelligence';

const Issue = {
  type: 'object', required: ['line', 'severity', 'code', 'message'], additionalProperties: false,
  properties: {
    line: { type: 'integer', minimum: 1 },
    severity: { type: 'string', enum: ['error', 'warning'] },
    code: { type: 'string' }, message: { type: 'string' },
  },
};
const ValidateCore = {
  type: 'object', required: ['diagram_type', 'valid', 'line_count', 'content_line_count', 'balanced_delimiters', 'node_count', 'edge_count', 'issues'],
  properties: {
    diagram_type: { type: ['string', 'null'] }, valid: { type: 'boolean' },
    line_count: { type: 'integer', minimum: 0 }, content_line_count: { type: 'integer', minimum: 0 },
    balanced_delimiters: { type: 'boolean' },
    node_count: { type: ['integer', 'null'], minimum: 0 }, edge_count: { type: ['integer', 'null'], minimum: 0 },
    issues: { type: 'array', items: Issue },
  },
};

const ValidateRequest = {
  type: 'object', required: ['diagram'], additionalProperties: false,
  properties: { diagram: { type: 'string', minLength: 1, maxLength: 100000, description: 'Mermaid diagram source.' } },
};

const validateReq = { diagram: 'flowchart LR\n  A[Start] --> B{Decision}\n  B -->|yes| C[Ship]\n  B -->|no| A' };

const schemas = {
  EnvelopeOk: EnvelopeOkPlus, ExecutionMetadata: ExecutionMetadataPlus, Error400: Error400Plus,
  ConfidencePerSection: confSections('structure', 'grammar'), _Tail: Tail,
  Issue, ValidateCore, ValidateRequest, DiscoveryResponse: discoverySchemaPlus(),
  ValidateResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ValidateCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ValidateCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};


const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/validate', summary: 'Lint a Mermaid diagram', operationId: 'validate', priceUsdc: 0.006, requestSchemaRef: 'ValidateRequest', responseSchemaRef: 'ValidateResponse', requestExample: validateReq, responseExample: validateExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL validate + reasoning', operationId: 'lookup', priceUsdc: 0.011, oneCall: true, requestSchemaRef: 'ValidateRequest', responseSchemaRef: 'LookupResponse', requestExample: validateReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'mermaid-validator', title: 'Mermaid Validator API', version: '1.0.0',
  description: 'Deterministic Mermaid diagram linter — diagram-type detection, delimiter/quote balance, flowchart line lint with line numbers. Lexical/structural (not the full grammar). No LLM.',
  endpoints, schemas, infoExtensions: { 'x-developer-tool': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
