import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema, rowSchema, CellValue } from '../../_aplus/specparts';

const TYPE_ENUM = ['empty', 'boolean', 'integer', 'number', 'date', 'string'];
const COL_TAG_ENUM = ['identifier', 'temporal', 'measure', 'pii_candidate', 'boolean_flag', 'categorical'];
const DS_TAG_ENUM = ['has_pii', 'has_temporal', 'has_identifier', 'fact_table'];
const Row = rowSchema();

const CatalogColumn = {
  type: 'object', required: ['name', 'type', 'nullable', 'null_rate', 'distinct_count', 'sample_values', 'tags'], additionalProperties: false,
  properties: {
    name: { type: 'string' },
    type: { type: 'string', enum: TYPE_ENUM },
    nullable: { type: 'boolean' },
    null_rate: { type: ['number', 'null'], minimum: 0, maximum: 1, description: 'Null/blank rate (null when built from explicit columns).' },
    distinct_count: { type: ['integer', 'null'], minimum: 0, description: 'Distinct non-missing values (null when built from explicit columns).' },
    sample_values: { type: 'array', items: CellValue, maxItems: 5, description: 'Up to 5 distinct sample values (empty when built from explicit columns).' },
    tags: { type: 'array', items: { type: 'string', enum: COL_TAG_ENUM } },
  },
};
const CatalogDataset = {
  type: 'object', required: ['name', 'source', 'row_count', 'column_count', 'primary_key_candidates', 'columns', 'tags'], additionalProperties: false,
  properties: {
    name: { type: 'string' },
    source: { type: 'string', enum: ['rows', 'columns'], description: 'Whether the entry was built from sample rows or explicit column defs.' },
    row_count: { type: ['integer', 'null'], minimum: 0 },
    column_count: { type: 'integer', minimum: 0 },
    primary_key_candidates: { type: 'array', items: { type: 'string' }, description: 'Columns that are fully populated and all-distinct over >1 row.' },
    columns: { type: 'array', items: CatalogColumn },
    tags: { type: 'array', items: { type: 'string', enum: DS_TAG_ENUM } },
  },
};
const CatalogCore = {
  type: 'object', required: ['dataset_count', 'datasets'],
  properties: {
    dataset_count: { type: 'integer', minimum: 0 },
    datasets: { type: 'array', items: CatalogDataset },
  },
};
const ColumnDef = {
  type: 'object', required: ['name'], additionalProperties: false,
  properties: {
    name: { type: 'string' },
    type: { type: 'string', enum: TYPE_ENUM, description: 'Declared column type (default string).' },
  },
};
const DatasetInput = {
  type: 'object', required: ['name'], additionalProperties: false,
  properties: {
    name: { type: 'string', description: 'Dataset name.' },
    rows: { type: 'array', items: Row, minItems: 1, description: 'Sample rows to infer the schema from (supply rows XOR columns).' },
    columns: { type: 'array', items: ColumnDef, minItems: 1, description: 'Explicit column definitions (supply rows XOR columns).' },
  },
};
const BuildRequest = {
  type: 'object', required: ['datasets'], additionalProperties: false,
  properties: {
    datasets: { type: 'array', items: DatasetInput, minItems: 1, description: 'Datasets to catalog. Each supplies exactly one of rows or columns.' },
  },
};

const CORE = {
  dataset_count: 2,
  datasets: [
    {
      name: 'users', source: 'rows', row_count: 3, column_count: 4,
      primary_key_candidates: ['id', 'email', 'signup_date'],
      columns: [
        { name: 'id', type: 'integer', nullable: false, null_rate: 0, distinct_count: 3, sample_values: [1, 2, 3], tags: ['identifier'] },
        { name: 'email', type: 'string', nullable: false, null_rate: 0, distinct_count: 3, sample_values: ['a@x.com', 'b@y.com', 'c@z.com'], tags: ['identifier', 'pii_candidate'] },
        { name: 'signup_date', type: 'date', nullable: false, null_rate: 0, distinct_count: 3, sample_values: ['2024-01-02', '2024-01-03', '2024-01-04'], tags: ['identifier', 'temporal'] },
        { name: 'plan', type: 'string', nullable: false, null_rate: 0, distinct_count: 2, sample_values: ['pro', 'free'], tags: ['categorical'] },
      ],
      tags: ['has_pii', 'has_temporal', 'has_identifier'],
    },
    {
      name: 'events', source: 'columns', row_count: null, column_count: 3,
      primary_key_candidates: [],
      columns: [
        { name: 'event_id', type: 'string', nullable: true, null_rate: null, distinct_count: null, sample_values: [], tags: ['identifier'] },
        { name: 'amount', type: 'number', nullable: true, null_rate: null, distinct_count: null, sample_values: [], tags: ['measure'] },
        { name: 'created_at', type: 'date', nullable: true, null_rate: null, distinct_count: null, sample_values: [], tags: ['temporal'] },
      ],
      tags: ['has_temporal', 'has_identifier'],
    },
  ],
};
const CHAIN = [
  { api: 'data-classification', reason: 'Confirm semantic/PII types on the catalogued columns from sampled values.' },
  { api: 'data-lineage-tracker', reason: 'Connect these catalogued datasets into a lineage graph.' },
];
const INVALIDATORS = [
  'Column types and stats are derived only from the supplied rows/columns; with explicit columns, null_rate/distinct_count/sample_values are null/empty (no data to measure).',
  'Tags are heuristic (name + type patterns): identifier/temporal/measure/pii_candidate/boolean_flag/categorical — verify before treating pii_candidate as authoritative PII.',
  'primary_key_candidates require a fully-populated, all-distinct column over >1 row; they are candidates, not enforced keys.',
];
const TAIL = {
  confidence_score: 0.85,
  confidence_per_section: { catalog: 1, type_inference: 0.9, tagging: 0.85 },
  recommended_actions_priority_order: [
    'Catalogued 2 dataset(s), 7 column(s) total.',
    'Possible PII in: users — review handling before publishing the catalog.',
    'Primary-key candidate(s) found in 1 dataset(s); confirm before declaring keys.',
    'Chain to data-classification to validate semantic types from values.',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('catalog', 'type_inference', 'tagging'), _Tail: Tail,
  CatalogColumn, CatalogDataset, CatalogCore, ColumnDef, DatasetInput, BuildRequest, DiscoveryResponse: discoverySchema(),
  BuildResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/CatalogCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/CatalogCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'dcb-1780000000000', request_id: 'dcb-1780000000000', computed_at: '2026-06-14T12:00:00.000Z', success: true, latency_ms: 1 };
const reqEx = {
  datasets: [
    {
      name: 'users',
      rows: [
        { id: 1, email: 'a@x.com', signup_date: '2024-01-02', plan: 'pro' },
        { id: 2, email: 'b@y.com', signup_date: '2024-01-03', plan: 'free' },
        { id: 3, email: 'c@z.com', signup_date: '2024-01-04', plan: 'pro' },
      ],
    },
    {
      name: 'events',
      columns: [
        { name: 'event_id', type: 'string' },
        { name: 'amount', type: 'number' },
        { name: 'created_at', type: 'date' },
      ],
    },
  ],
};
const disc = {
  name: 'Data Catalog Builder API', version: '1.0.0',
  description: 'Deterministic data catalog builder. Turns dataset schemas (sample rows or explicit columns) into catalog entries with typed columns, null rates, cardinality, primary-key candidates, and heuristic tags. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/data-catalog-builder/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/build', summary: 'Build catalog entries for one or more datasets', price_usdc: 0.007 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL catalog + reasoning', price_usdc: 0.012 },
  ],
  pricing: [
    { path: '/build', price_usdc: 0.007, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/build', summary: 'Build catalog entries for one or more datasets', operationId: 'build', priceUsdc: 0.007,
    requestSchemaRef: 'BuildRequest', responseSchemaRef: 'BuildResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL catalog + reasoning', operationId: 'lookup', priceUsdc: 0.012, oneCall: true,
    requestSchemaRef: 'BuildRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Built catalog entries for 2 dataset(s) with 7 column(s).',
        key_factors: [
          'users: 4 col(s), 3 row(s); tags [has_pii, has_temporal, has_identifier].',
          'events: 3 col(s) (schema only); tags [has_temporal, has_identifier].',
        ],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'data-catalog-builder', title: 'Data Catalog Builder API', version: '1.0.0',
  description: 'Deterministic data catalog builder — dataset schemas (rows or columns) → catalog entries with typed columns, stats, PK candidates, and heuristic tags. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-data-quality': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
