import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { confSections, Tail } from '../../_aplus/specparts';
import { EnvelopeOkPlus, Error400Plus, ExecutionMetadataPlus, discoverySchemaPlus } from '../../_aplus/specparts-plus';
import { convertExample, detectExample, lookupExample } from './examples';
import { DISCOVERY as disc } from './intelligence';

const Format = { type: 'string', enum: ['json', 'yaml', 'toml'] };

const ConvertCore = {
  type: 'object', required: ['from', 'to', 'value_type', 'output', 'output_length'],
  properties: {
    from: Format, to: Format,
    value_type: { type: 'string', enum: ['object', 'array', 'string', 'number', 'boolean', 'null'], description: 'Top-level type of the parsed value.' },
    output: { type: 'string', description: 'The input re-serialized in the target format.' },
    output_length: { type: 'integer', minimum: 0, description: 'Character length of "output".' },
  },
};
const DetectCore = {
  type: 'object', required: ['detected_format', 'parses_as'],
  properties: {
    detected_format: { oneOf: [Format, { type: 'null' }], description: 'Most specific format the input parses as (json → toml → yaml), or null.' },
    parses_as: {
      type: 'object', additionalProperties: false, required: ['json', 'yaml', 'toml'],
      properties: { json: { type: 'boolean' }, yaml: { type: 'boolean' }, toml: { type: 'boolean' } },
    },
  },
};

const ConvertRequest = {
  type: 'object', required: ['data', 'from', 'to'], additionalProperties: false,
  properties: {
    data: { type: 'string', maxLength: 1000000, description: 'The source document.' },
    from: { ...Format, description: 'Format to parse "data" as.' },
    to: { ...Format, description: 'Format to serialize the result to.' },
    indent: { type: 'integer', minimum: 0, maximum: 10, description: 'JSON output indent (default 2; ignored for yaml/toml).' },
  },
};
const DetectRequest = {
  type: 'object', required: ['data'], additionalProperties: false,
  properties: { data: { type: 'string', maxLength: 1000000, description: 'The document to classify.' } },
};

const convertReq = { data: 'name = "demo"\nport = 8080', from: 'toml', to: 'json' };
const detectReq = { data: 'name: demo\nport: 8080' };

const schemas = {
  EnvelopeOk: EnvelopeOkPlus, ExecutionMetadata: ExecutionMetadataPlus, Error400: Error400Plus,
  ConfidencePerSection: confSections('conversion', 'detection'), _Tail: Tail,
  Format, ConvertCore, DetectCore, ConvertRequest, DetectRequest, DiscoveryResponse: discoverySchemaPlus(),
  ConvertResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ConvertCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  DetectResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/DetectCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ConvertCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/convert', summary: 'Convert between JSON, YAML and TOML', operationId: 'convert', priceUsdc: 0.006, requestSchemaRef: 'ConvertRequest', responseSchemaRef: 'ConvertResponse', requestExample: convertReq, responseExample: convertExample },
  { method: 'post', path: '/detect', summary: 'Detect which formats the input parses as', operationId: 'detect', priceUsdc: 0.005, requestSchemaRef: 'DetectRequest', responseSchemaRef: 'DetectResponse', requestExample: detectReq, responseExample: detectExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL convert + reasoning', operationId: 'lookup', priceUsdc: 0.011, oneCall: true, requestSchemaRef: 'ConvertRequest', responseSchemaRef: 'LookupResponse', requestExample: convertReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'data-format-converter', title: 'Data Format Converter API', version: '1.0.0',
  description: 'Deterministic config/data format converter — JSON ⇄ YAML ⇄ TOML structural conversion plus format detection. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-developer-tool': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
