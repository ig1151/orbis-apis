import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, ConfidencePerSection, Tail, discoverySchema } from '../../_aplus/specparts';

const GEN_TYPES = ['uuid', 'name', 'first_name', 'last_name', 'email', 'username', 'phone', 'company', 'address', 'city', 'state', 'zip', 'country', 'integer', 'float', 'boolean', 'date', 'hex_color', 'ipv4', 'mac', 'word', 'sentence', 'password'];

const Address = {
  type: 'object', required: ['street', 'city', 'state', 'zip', 'country'], additionalProperties: false,
  properties: { street: { type: 'string' }, city: { type: 'string' }, state: { type: 'string' }, zip: { type: 'string' }, country: { type: 'string' } },
};
const GeneratedValue = { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }, { $ref: '#/components/schemas/Address' }] };

const Column = { type: 'object', required: ['name', 'type'], additionalProperties: false, properties: { name: { type: 'string' }, type: { type: 'string', enum: GEN_TYPES } } };

const GenerateCore = {
  type: 'object', required: ['type', 'count', 'seed', 'reproducible', 'values'],
  properties: {
    type: { type: 'string', enum: GEN_TYPES }, count: { type: 'integer', minimum: 1 },
    seed: { type: ['string', 'null'] }, reproducible: { type: 'boolean' },
    values: { type: 'array', items: { $ref: '#/components/schemas/GeneratedValue' } },
  },
};
const LookupCore = {
  type: 'object', required: ['count', 'seed', 'reproducible', 'columns', 'rows', 'reasoning'],
  properties: {
    count: { type: 'integer', minimum: 1 }, seed: { type: ['string', 'null'] }, reproducible: { type: 'boolean' },
    columns: { type: 'array', items: { $ref: '#/components/schemas/Column' } },
    rows: { type: 'array', items: { type: 'object', additionalProperties: { $ref: '#/components/schemas/GeneratedValue' } } },
    reasoning: { $ref: '#/components/schemas/Reasoning' },
  },
};

const GenerateRequest = {
  type: 'object', required: ['type'], additionalProperties: false,
  properties: {
    type: { type: 'string', enum: GEN_TYPES }, count: { type: 'integer', minimum: 1, maximum: 1000, default: 1 },
    seed: { type: 'string', description: 'Optional. Same seed → identical output (reproducible fixtures).' },
    min: { type: 'number', description: 'Lower bound for integer/float types.' }, max: { type: 'number', description: 'Upper bound for integer/float types.' },
  },
};
const LookupRequest = {
  type: 'object', required: ['fields'], additionalProperties: false,
  properties: {
    fields: { type: 'object', minProperties: 1, additionalProperties: { type: 'string', enum: GEN_TYPES }, description: 'Map of column name -> type, e.g. {"id":"uuid","email":"email","age":"integer"}.' },
    count: { type: 'integer', minimum: 1, maximum: 1000, default: 5 },
    seed: { type: 'string' }, min: { type: 'number' }, max: { type: 'number' },
  },
};

const TAIL = (acts: string[]) => ({
  confidence_score: 1, confidence_per_section: { generation: 1 },
  recommended_actions_priority_order: acts,
  chain_to: [
    { api: 'data-validator', reason: 'Validate generated cards/IBANs/emails against real checksums before using them as fixtures.' },
    { api: 'json-to-csv', reason: 'Convert generated test rows into CSV for seeding spreadsheets or fixtures.' },
  ],
  privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
});

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection, _Tail: Tail, Address, GeneratedValue, Column, GenerateCore, LookupCore, GenerateRequest, LookupRequest,
  DiscoveryResponse: discoverySchema(),
  GenerateResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/GenerateCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/LookupCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/generate', summary: 'Generate N values of one type (optional seed)', operationId: 'generate', priceUsdc: 0.005,
    requestSchemaRef: 'GenerateRequest', responseSchemaRef: 'GenerateResponse', requestExample: { type: 'email', count: 3, seed: 'demo' },
    responseExample: {
      trace_id: 'rdg1-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0,
      type: 'email', count: 3, seed: 'demo', reproducible: true,
      values: ['avery.kim42@example.com', 'jordan.patel7@test.dev', 'riley.rossi88@sample.io'],
      ...TAIL(['Generated 3 email values (seed "demo" — reproducible).', 'Use as test fixtures/synthetic data; do not treat as real records.']),
    },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL multi-column test rows + reasoning', operationId: 'lookup', priceUsdc: 0.01, oneCall: true,
    requestSchemaRef: 'LookupRequest', responseSchemaRef: 'LookupResponse', requestExample: { fields: { id: 'uuid', name: 'name', email: 'email', age: 'integer' }, count: 2, seed: 'demo', min: 18, max: 65 },
    responseExample: {
      trace_id: 'rdg2-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0,
      count: 2, seed: 'demo', reproducible: true,
      columns: [{ name: 'id', type: 'uuid' }, { name: 'name', type: 'name' }, { name: 'email', type: 'email' }, { name: 'age', type: 'integer' }],
      rows: [
        { id: '3f1a8c2e-9b4d-4e7a-8c1f-2d6b5a0e9f31', name: 'Avery Kim', email: 'avery.kim42@example.com', age: 34 },
        { id: 'a2c4e6f8-1b3d-4f5a-9c7e-0d2b4a6c8e10', name: 'Jordan Patel', email: 'jordan.patel7@test.dev', age: 52 },
      ],
      reasoning: { why_result_generated: 'Generated 2 rows across 4 columns (id:uuid, name:name, email:email, age:integer) from seed "demo".', key_factors: ['4 columns.', '2 rows.', 'Seeded → reproducible.'], invalidators: ['All values are synthetic — they do not correspond to real people, accounts, or records.', 'Reproducibility holds only while the seed and column order are unchanged.'] },
      ...TAIL(['Generated a 2×4 synthetic dataset (reproducible).', 'Feed into tests, demos, or load fixtures; never persist as real customer data.']),
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'random-data-generator', title: 'Random Data Generator API', version: '1.0.0',
  description: 'Deterministic-by-seed (or crypto-random) test-data generator: UUIDs, names, emails, phones, addresses, primitives, and multi-column test rows. Supply a seed for reproducible output; omit it for CSPRNG randomness. No LLM, no real PII.',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
