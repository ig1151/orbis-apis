import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { confSections, Tail } from '../../_aplus/specparts';
import { EnvelopeOkPlus, Error400Plus, ExecutionMetadataPlus, discoverySchemaPlus } from '../../_aplus/specparts-plus';
import { CellValue } from '../../_aplus/specparts';
import { markdownExample, asciiExample, lookupExample } from './examples';
import { DISCOVERY as disc } from './intelligence';

const Align = { type: 'string', enum: ['left', 'right', 'center'] };
const TableCore = {
  type: 'object', required: ['format', 'columns', 'row_count', 'align', 'table'],
  properties: {
    format: { type: 'string', enum: ['markdown', 'ascii'] },
    columns: { type: 'array', items: { type: 'string' } },
    row_count: { type: 'integer', minimum: 0 },
    align: { type: 'array', items: Align },
    table: { type: 'string', description: 'The rendered table.' },
  },
};

const RowObject = { type: 'object', additionalProperties: CellValue };
const RowArray = { type: 'array', items: CellValue };
const TableRequest = {
  type: 'object', required: ['rows'], additionalProperties: false,
  properties: {
    rows: { type: 'array', maxItems: 1000, items: { oneOf: [RowObject, RowArray] }, description: 'Row objects (column→value) or positional arrays (then "columns" is required).' },
    columns: { type: 'array', maxItems: 50, items: { type: 'string' }, description: 'Explicit column order / headers (required for array rows).' },
    align: { type: 'array', items: Align, description: 'Per-column alignment, one entry per column (default all left).' },
  },
};

const markdownReq = { rows: [{ name: 'Alice', role: 'Engineer', commits: 142 }, { name: 'Bob', role: 'Designer', commits: 37 }], align: ['left', 'left', 'right'] };
const asciiReq = { rows: [{ name: 'Alice', role: 'Engineer', commits: 142 }, { name: 'Bob', role: 'Designer', commits: 37 }] };

const schemas = {
  EnvelopeOk: EnvelopeOkPlus, ExecutionMetadata: ExecutionMetadataPlus, Error400: Error400Plus,
  ConfidencePerSection: confSections('rendering'), _Tail: Tail,
  CellValue, Align, RowObject, RowArray, TableCore, TableRequest, DiscoveryResponse: discoverySchemaPlus(),
  MarkdownResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/TableCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  AsciiResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/TableCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/TableCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};


const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/markdown', summary: 'Render rows as a Markdown table', operationId: 'markdown', priceUsdc: 0.005, requestSchemaRef: 'TableRequest', responseSchemaRef: 'MarkdownResponse', requestExample: markdownReq, responseExample: markdownExample },
  { method: 'post', path: '/ascii', summary: 'Render rows as an ASCII grid table', operationId: 'ascii', priceUsdc: 0.005, requestSchemaRef: 'TableRequest', responseSchemaRef: 'AsciiResponse', requestExample: asciiReq, responseExample: asciiExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL render + reasoning', operationId: 'lookup', priceUsdc: 0.009, oneCall: true, requestSchemaRef: 'TableRequest', responseSchemaRef: 'LookupResponse', requestExample: markdownReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'table-formatter', title: 'Table Formatter API', version: '1.0.0',
  description: 'Deterministic table renderer — Markdown (GFM, per-column alignment) and fixed-width ASCII grid tables from row objects or positional arrays. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-developer-tool': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
