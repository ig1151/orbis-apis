import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema, rowSchema, CellValue } from '../../_aplus/specparts';

const CAST_ENUM = ['string', 'number', 'integer', 'boolean', 'date'];
const Row = rowSchema();
const MappingStat = {
  type: 'object', required: ['from', 'to', 'cast', 'applied', 'defaults_used', 'cast_failures'], additionalProperties: false,
  properties: {
    from: { type: 'string' }, to: { type: 'string' },
    cast: { type: ['string', 'null'], enum: [...CAST_ENUM, null] },
    applied: { type: 'integer', minimum: 0 },
    defaults_used: { type: 'integer', minimum: 0 },
    cast_failures: { type: 'integer', minimum: 0 },
  },
};
const TargetCollision = {
  type: 'object', required: ['target', 'sources', 'winner'], additionalProperties: false,
  properties: {
    target: { type: 'string', description: 'Output field written by more than one mapping.' },
    sources: { type: 'array', items: { type: 'string' }, minItems: 2, description: 'Source columns mapped to this target, in spec order.' },
    winner: { type: 'string', description: 'Source whose value wins (last mapping in order — last-write-wins).' },
  },
};
const MapCore = {
  type: 'object', required: ['row_count', 'mappings_applied', 'output_columns', 'total_cast_failures', 'total_defaults_used', 'target_collisions', 'per_mapping', 'rows'],
  properties: {
    row_count: { type: 'integer', minimum: 0 },
    mappings_applied: { type: 'integer', minimum: 0 },
    output_columns: { type: 'array', items: { type: 'string' } },
    total_cast_failures: { type: 'integer', minimum: 0 },
    total_defaults_used: { type: 'integer', minimum: 0 },
    target_collisions: { type: 'array', items: TargetCollision, description: 'Targets written by two or more mappings (last-write-wins).' },
    per_mapping: { type: 'array', items: MappingStat },
    rows: { type: 'array', items: Row },
  },
};
const Mapping = {
  type: 'object', required: ['from', 'to'], additionalProperties: false,
  properties: {
    from: { type: 'string', description: 'Source column name.' },
    to: { type: 'string', description: 'Target column name.' },
    cast: { type: 'string', enum: CAST_ENUM, description: 'Optional type cast applied to the value.' },
    default: { ...CellValue, description: 'Value used when the source column is missing in a row.' },
  },
};
const MapRequest = {
  type: 'object', required: ['rows', 'mappings'], additionalProperties: false,
  properties: {
    rows: { type: 'array', items: Row, minItems: 1, description: 'Dataset rows to map.' },
    mappings: { type: 'array', items: Mapping, minItems: 1, description: 'Field mappings (rename + optional cast + default).' },
    drop_unmapped: { type: 'boolean', description: 'Drop source columns that are not a mapping target (default true).' },
  },
};

const CORE = {
  row_count: 2, mappings_applied: 3, output_columns: ['given_name', 'age', 'country'],
  total_cast_failures: 1, total_defaults_used: 2, target_collisions: [],
  per_mapping: [
    { from: 'first', to: 'given_name', cast: null, applied: 2, defaults_used: 0, cast_failures: 0 },
    { from: 'age', to: 'age', cast: 'integer', applied: 2, defaults_used: 0, cast_failures: 1 },
    { from: 'country', to: 'country', cast: null, applied: 2, defaults_used: 2, cast_failures: 0 },
  ],
  rows: [
    { given_name: 'Ann', age: 30, country: 'US' },
    { given_name: 'Bob', age: null, country: 'US' },
  ],
};
const CHAIN = [
  { api: 'data-normalizer', reason: 'Canonicalize the mapped values (case/whitespace/date) after renaming.' },
  { api: 'data-quality-rules', reason: 'Enforce types and required fields on the mapped schema.' },
];
const INVALIDATORS = [
  'A source column missing in a row is skipped unless that mapping supplies a "default"; no value is fabricated.',
  'Failed casts (e.g. "abc" → number) set the target to null and are counted in cast_failures — they are not dropped silently.',
  'With drop_unmapped=false, unmapped source columns are carried through under their original names; a mapping target can overwrite them.',
  'target_collisions lists targets written by two or more mappings (last-write-wins); it does NOT include a mapping overwriting a carried-through unmapped column of the same name.',
];
const TAIL = {
  confidence_score: 1, confidence_per_section: { mapping: 1 },
  recommended_actions_priority_order: [
    'Mapped 3 field(s) over 2 row(s) → 3 output column(s).',
    '1 cast failure(s) set to null — inspect source values or relax the cast.',
    '2 default(s) filled for missing sources.',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('mapping'), _Tail: Tail,
  MappingStat, MapCore, Mapping, MapRequest, DiscoveryResponse: discoverySchema(),
  MapResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/MapCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/MapCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'dmp-1780000000000', request_id: 'dmp-1780000000000', computed_at: '2026-06-14T12:00:00.000Z', success: true, latency_ms: 1 };
const reqEx = {
  rows: [{ first: 'Ann', last: 'Lee', age: '30' }, { first: 'Bob', last: 'Ng', age: 'x' }],
  mappings: [
    { from: 'first', to: 'given_name' },
    { from: 'age', to: 'age', cast: 'integer' },
    { from: 'country', to: 'country', default: 'US' },
  ],
  drop_unmapped: true,
};
const disc = {
  name: 'Data Mapper API', version: '1.0.0',
  description: 'Deterministic data mapper. Applies a field-mapping spec (rename + optional cast + default) to a dataset and returns remapped records with per-mapping stats. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/data-mapper/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/map', summary: 'Map/rename/cast dataset fields', price_usdc: 0.006 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL map + reasoning', price_usdc: 0.011 },
  ],
  pricing: [
    { path: '/map', price_usdc: 0.006, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.011, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/map', summary: 'Map/rename/cast dataset fields', operationId: 'map', priceUsdc: 0.006,
    requestSchemaRef: 'MapRequest', responseSchemaRef: 'MapResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL map + reasoning', operationId: 'lookup', priceUsdc: 0.011, oneCall: true,
    requestSchemaRef: 'MapRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Applied 3 mapping(s) over 2 row(s); 1 cast failure(s), 2 default(s) used.',
        key_factors: ['first → given_name: applied 2, failures 0.', 'age → age (integer): applied 2, failures 1.', 'country → country: applied 2, failures 0.'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'data-mapper', title: 'Data Mapper API', version: '1.0.0',
  description: 'Deterministic data mapper — applies a field-mapping spec (rename + cast + default) returning remapped records with per-mapping stats. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-data-quality': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
