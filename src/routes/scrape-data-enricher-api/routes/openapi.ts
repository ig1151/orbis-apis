import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema, rowSchema, CellValue } from '../../_aplus/specparts';

const RULE_TYPE_ENUM = ['constant', 'concat', 'coalesce', 'lookup_map', 'regex_extract'];
const Row = rowSchema();
const RuleResult = {
  type: 'object', required: ['type', 'target', 'cells_written'], additionalProperties: false,
  properties: {
    type: { type: 'string', enum: RULE_TYPE_ENUM },
    target: { type: 'string' },
    cells_written: { type: 'integer', minimum: 0 },
    matched: { type: 'integer', minimum: 0, description: 'Records where a value was resolved (coalesce/lookup_map/regex_extract).' },
    defaulted: { type: 'integer', minimum: 0, description: 'Records that fell back to the rule default (lookup_map).' },
    misses: { type: 'integer', minimum: 0, description: 'Records with no resolved value, set to null/default.' },
  },
};
const EnrichCore = {
  type: 'object', required: ['record_count', 'rules_applied', 'per_rule', 'records'],
  properties: {
    record_count: { type: 'integer', minimum: 0 },
    rules_applied: { type: 'integer', minimum: 0 },
    per_rule: { type: 'array', items: RuleResult },
    records: { type: 'array', items: Row },
  },
};
// Closed, discriminated rule variants.
const ConstantRule = { type: 'object', additionalProperties: false, required: ['type', 'target', 'value'], properties: { type: { const: 'constant' }, target: { type: 'string' }, value: { ...CellValue, description: 'Constant value written to every record.' } } };
const ConcatRule = { type: 'object', additionalProperties: false, required: ['type', 'target', 'sources'], properties: { type: { const: 'concat' }, target: { type: 'string' }, sources: { type: 'array', minItems: 1, items: { type: 'string' } }, separator: { type: 'string' } } };
const CoalesceRule = { type: 'object', additionalProperties: false, required: ['type', 'target', 'sources'], properties: { type: { const: 'coalesce' }, target: { type: 'string' }, sources: { type: 'array', minItems: 1, items: { type: 'string' } } } };
const LookupMapRule = { type: 'object', additionalProperties: false, required: ['type', 'target', 'source', 'map'], properties: { type: { const: 'lookup_map' }, target: { type: 'string' }, source: { type: 'string' }, map: { type: 'object', additionalProperties: CellValue, description: 'Key → value lookup table.' }, default: { ...CellValue, description: 'Value when the source value is missing or unmapped.' } } };
const RegexExtractRule = { type: 'object', additionalProperties: false, required: ['type', 'target', 'source', 'pattern'], properties: { type: { const: 'regex_extract' }, target: { type: 'string' }, source: { type: 'string' }, pattern: { type: 'string', maxLength: 300 }, flags: { type: 'string', description: 'Optional regex flags (i, m, s, u only — never g/y).' }, group: { type: 'integer', minimum: 0, description: 'Capture group to return (default 1; 0 = whole match).' } } };
const Rule = { oneOf: [ConstantRule, ConcatRule, CoalesceRule, LookupMapRule, RegexExtractRule], description: 'A deterministic enrichment rule; shape depends on "type".' };
const EnrichRequest = {
  type: 'object', required: ['records', 'rules'], additionalProperties: false,
  properties: {
    records: { type: 'array', items: Row, minItems: 1, description: 'Scraped records to enrich.' },
    rules: { type: 'array', items: Rule, minItems: 1, description: 'Ordered enrichment rules.' },
  },
};

const CORE = {
  record_count: 2, rules_applied: 5,
  per_rule: [
    { type: 'concat', target: 'full_name', cells_written: 2 },
    { type: 'lookup_map', target: 'country_name', cells_written: 2, matched: 1, misses: 0, defaulted: 1 },
    { type: 'regex_extract', target: 'domain', cells_written: 2, matched: 1, misses: 1 },
    { type: 'coalesce', target: 'contact', cells_written: 2, matched: 1, misses: 1 },
    { type: 'constant', target: 'source_tag', cells_written: 2 },
  ],
  records: [
    { first: 'Ann', last: 'Lee', country: 'US', url: 'https://acme.com/p/1', mobile: '555-1', full_name: 'Ann Lee', country_name: 'United States', domain: 'acme.com', contact: '555-1', source_tag: 'scrape' },
    { first: 'Bob', last: 'Ng', country: 'XX', url: 'not-a-url', full_name: 'Bob Ng', country_name: 'Unknown', domain: null, contact: null, source_tag: 'scrape' },
  ],
};
const CHAIN = [
  { api: 'scrape-data-pipeline-validator', reason: 'Validate the enriched records against the expected schema.' },
  { api: 'data-classification', reason: 'Re-classify columns now that derived fields exist.' },
];
const INVALIDATORS = [
  'Enrichment is deterministic and local: lookup_map uses the supplied table only (no external lookups); an unmapped key uses the rule default or null.',
  'regex_extract returns the requested capture group (default group 1; group 0 = whole match) of the FIRST match, or null if no match; g/y flags are rejected.',
  'concat/coalesce treat null/empty as missing; concat renders missing as "" while coalesce skips to the next source.',
];
const TAIL = {
  confidence_score: 1, confidence_per_section: { enrichment: 1 },
  recommended_actions_priority_order: [
    'Applied 5 rule(s) over 2 record(s).',
    '2 unmatched cell(s) across lookup/coalesce/regex rules set to null or default — inspect source values.',
    'Chain to scrape-data-pipeline-validator to confirm the enriched shape.',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('enrichment'), _Tail: Tail,
  RuleResult, EnrichCore, Rule, EnrichRequest, DiscoveryResponse: discoverySchema(),
  EnrichResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/EnrichCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/EnrichCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'sde-1780000000000', request_id: 'sde-1780000000000', computed_at: '2026-06-14T12:00:00.000Z', success: true, latency_ms: 1 };
const reqEx = {
  records: [
    { first: 'Ann', last: 'Lee', country: 'US', url: 'https://acme.com/p/1', mobile: '555-1' },
    { first: 'Bob', last: 'Ng', country: 'XX', url: 'not-a-url' },
  ],
  rules: [
    { type: 'concat', sources: ['first', 'last'], target: 'full_name', separator: ' ' },
    { type: 'lookup_map', source: 'country', target: 'country_name', map: { US: 'United States', FR: 'France' }, default: 'Unknown' },
    { type: 'regex_extract', source: 'url', target: 'domain', pattern: 'https?://([^/]+)' },
    { type: 'coalesce', sources: ['mobile', 'phone'], target: 'contact' },
    { type: 'constant', target: 'source_tag', value: 'scrape' },
  ],
};
const disc = {
  name: 'Scrape Data Enricher API', version: '1.0.0',
  description: 'Deterministic scrape-data enricher. Augments scraped records with new fields via declarative rules (constant, concat, coalesce, lookup_map, regex_extract). No external lookups, no LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/scrape-data-enricher/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/enrich', summary: 'Augment records with deterministic enrichment rules', price_usdc: 0.007 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL enrich + reasoning', price_usdc: 0.012 },
  ],
  pricing: [
    { path: '/enrich', price_usdc: 0.007, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/enrich', summary: 'Augment records with deterministic enrichment rules', operationId: 'enrich', priceUsdc: 0.007,
    requestSchemaRef: 'EnrichRequest', responseSchemaRef: 'EnrichResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL enrich + reasoning', operationId: 'lookup', priceUsdc: 0.012, oneCall: true,
    requestSchemaRef: 'EnrichRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Applied 5 enrichment rule(s) over 2 record(s).',
        key_factors: [
          'concat → full_name: wrote 2.',
          'lookup_map → country_name: wrote 2, matched 1.',
          'regex_extract → domain: wrote 2, matched 1, missed 1.',
          'coalesce → contact: wrote 2, matched 1, missed 1.',
          'constant → source_tag: wrote 2.',
        ],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'scrape-data-enricher', title: 'Scrape Data Enricher API', version: '1.0.0',
  description: 'Deterministic scrape-data enricher — augment records via constant/concat/coalesce/lookup_map/regex_extract rules. No external lookups, no LLM.',
  endpoints, schemas, infoExtensions: { 'x-data-quality': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
