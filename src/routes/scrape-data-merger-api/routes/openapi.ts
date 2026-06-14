import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema, rowSchema, CellValue } from '../../_aplus/specparts';

const STRAT_ENUM = ['first', 'last', 'non_null', 'coalesce'];
const Row = rowSchema();
const SourceStat = {
  type: 'object', required: ['name', 'record_count'], additionalProperties: false,
  properties: { name: { type: 'string' }, record_count: { type: 'integer', minimum: 0 } },
};
const ConflictValue = {
  type: 'object', required: ['source', 'value'], additionalProperties: false,
  properties: { source: { type: 'string' }, value: { ...CellValue, description: 'A distinct non-missing value seen for this field.' } },
};
const ConflictInfo = {
  type: 'object', required: ['key', 'field', 'values'], additionalProperties: false,
  properties: {
    key: { type: 'string', description: 'Canonical key value of the conflicting group.' },
    field: { type: 'string' },
    values: { type: 'array', items: ConflictValue, minItems: 2 },
  },
};
const MergeCore = {
  type: 'object',
  required: ['key', 'strategy', 'sources', 'total_input', 'total_output', 'duplicates_merged', 'dropped_no_key', 'conflict_count', 'conflicts_truncated', 'conflicts', 'records'],
  properties: {
    key: { type: 'array', items: { type: 'string' } },
    strategy: { type: 'string', enum: STRAT_ENUM },
    sources: { type: 'array', items: SourceStat },
    total_input: { type: 'integer', minimum: 0 },
    total_output: { type: 'integer', minimum: 0 },
    duplicates_merged: { type: 'integer', minimum: 0 },
    dropped_no_key: { type: 'integer', minimum: 0 },
    conflict_count: { type: 'integer', minimum: 0 },
    conflicts_truncated: { type: 'boolean', description: 'True when conflict_count exceeds the returned conflicts sample.' },
    conflicts: { type: 'array', items: ConflictInfo },
    records: { type: 'array', items: Row },
  },
};
const SourceInput = {
  type: 'object', required: ['name', 'records'], additionalProperties: false,
  properties: {
    name: { type: 'string', description: 'Source label (e.g. site or feed name).' },
    records: { type: 'array', items: Row, minItems: 1, description: 'Scraped records from this source.' },
  },
};
const MergeRequest = {
  type: 'object', required: ['key', 'sources'], additionalProperties: false,
  properties: {
    key: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' }, minItems: 1 }], description: 'Dedup key column, or array of columns for a composite key.' },
    strategy: { type: 'string', enum: STRAT_ENUM, description: 'Conflict resolution: first/last (whole record) or non_null/coalesce (per field). Default last.' },
    sources: { type: 'array', items: SourceInput, minItems: 1, description: 'Record sets to merge, in priority order.' },
  },
};

const CORE = {
  key: ['id'], strategy: 'non_null',
  sources: [{ name: 'siteA', record_count: 2 }, { name: 'siteB', record_count: 2 }],
  total_input: 4, total_output: 3, duplicates_merged: 1, dropped_no_key: 0,
  conflict_count: 1, conflicts_truncated: false,
  conflicts: [
    { key: '1', field: 'name', values: [{ source: 'siteA', value: 'Acme' }, { source: 'siteB', value: 'Acme Inc' }] },
  ],
  records: [
    { id: '1', name: 'Acme Inc', email: 'info@acme.com', phone: '555-1' },
    { id: '2', name: 'Beta', phone: '555-2' },
    { id: '3', name: 'Gamma' },
  ],
};
const CHAIN = [
  { api: 'scrape-data-pipeline-validator', reason: 'Validate the merged records against the expected scrape schema.' },
  { api: 'data-quality-rules', reason: 'Run uniqueness/not-null rules on the deduped output.' },
];
const INVALIDATORS = [
  'Records missing any key field are dropped (counted in dropped_no_key), not merged on a partial key.',
  'Key equality is by canonical value (1 and "1" collide); supply pre-normalized keys if that is unwanted (chain data-normalizer first).',
  'Conflicts list differing non-missing values per field; with strategy "first"/"last" the whole earliest/latest record wins regardless of per-field conflicts.',
];
const TAIL = {
  confidence_score: 1, confidence_per_section: { merge: 1 },
  recommended_actions_priority_order: [
    'Merged 4 record(s) from 2 source(s) → 3 unique key(s) (1 duplicate(s) merged, strategy "non_null").',
    '1 field-level conflict(s) detected — review conflicts or pick a strategy deliberately.',
    'Chain to scrape-data-pipeline-validator or data-quality-rules on the merged output.',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('merge'), _Tail: Tail,
  SourceStat, ConflictValue, ConflictInfo, MergeCore, SourceInput, MergeRequest, DiscoveryResponse: discoverySchema(),
  MergeResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/MergeCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/MergeCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'sdm-1780000000000', request_id: 'sdm-1780000000000', computed_at: '2026-06-14T12:00:00.000Z', success: true, latency_ms: 1 };
const reqEx = {
  key: 'id',
  strategy: 'non_null',
  sources: [
    { name: 'siteA', records: [{ id: '1', name: 'Acme', phone: '555-1', email: null }, { id: '2', name: 'Beta', phone: '555-2' }] },
    { name: 'siteB', records: [{ id: '1', name: 'Acme Inc', email: 'info@acme.com' }, { id: '3', name: 'Gamma' }] },
  ],
};
const disc = {
  name: 'Scrape Data Merger API', version: '1.0.0',
  description: 'Deterministic scrape-data merger. Combines multiple scraped record sets, dedups by a (composite) key, and resolves field conflicts with an explicit strategy (first/last/non_null/coalesce). No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/scrape-data-merger/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/merge', summary: 'Dedup/merge scraped record sets by key', price_usdc: 0.007 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL merge + reasoning', price_usdc: 0.012 },
  ],
  pricing: [
    { path: '/merge', price_usdc: 0.007, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/merge', summary: 'Dedup/merge scraped record sets by key', operationId: 'merge', priceUsdc: 0.007,
    requestSchemaRef: 'MergeRequest', responseSchemaRef: 'MergeResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL merge + reasoning', operationId: 'lookup', priceUsdc: 0.012, oneCall: true,
    requestSchemaRef: 'MergeRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Deduped 4 record(s) by [id] into 3 record(s) using strategy "non_null".',
        key_factors: ['Sources: siteA (2), siteB (2).', '1 duplicate(s) merged, 0 dropped for no key.', '1 field conflict(s).'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'scrape-data-merger', title: 'Scrape Data Merger API', version: '1.0.0',
  description: 'Deterministic scrape-data merger — dedup/merge multiple record sets by key with explicit conflict strategy. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-data-quality': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
