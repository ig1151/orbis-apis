import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const BAND_ENUM = ['fresh', 'recent', 'aging', 'stale', 'outdated'];
const ScoreCore = {
  type: 'object',
  required: ['as_of', 'published_date', 'modified_date', 'effective_date', 'was_updated', 'half_life_days', 'age_days', 'days_since_published', 'days_since_modified', 'freshness_score', 'band', 'recommended_recheck_in_days'],
  properties: {
    as_of: { type: 'string', format: 'date-time' },
    published_date: { type: ['string', 'null'] }, modified_date: { type: ['string', 'null'] }, effective_date: { type: 'string' },
    was_updated: { type: 'boolean' }, half_life_days: { type: 'number' },
    age_days: { type: 'number' }, days_since_published: { type: ['number', 'null'] }, days_since_modified: { type: ['number', 'null'] },
    freshness_score: { type: 'number', minimum: 0, maximum: 100 }, band: { type: 'string', enum: BAND_ENUM }, recommended_recheck_in_days: { type: 'number' },
  },
};
const ScoreRequest = {
  type: 'object', additionalProperties: false,
  properties: {
    published_date: { type: 'string', description: 'ISO 8601 publish date.' },
    modified_date: { type: 'string', description: 'ISO 8601 last-modified date (drives the score when present).' },
    last_modified: { type: 'string', description: 'Alias for modified_date (e.g. the Last-Modified header).' },
    as_of: { type: 'string', description: 'ISO 8601 reference "now" (defaults to the current time).' },
    half_life_days: { type: 'number', minimum: 1, description: 'Days at which freshness halves (default 180). Lower for news, higher for docs.' },
  },
  description: 'Provide at least one of published_date or modified_date/last_modified.',
};

const CORE_EXAMPLE = {
  as_of: '2026-06-11T00:00:00.000Z', published_date: '2025-01-01T00:00:00.000Z', modified_date: '2025-06-01T00:00:00.000Z', effective_date: '2025-06-01T00:00:00.000Z',
  was_updated: true, half_life_days: 180, age_days: 375, days_since_published: 526, days_since_modified: 375, freshness_score: 23.6, band: 'stale', recommended_recheck_in_days: 14,
};
const ACTS = ['Freshness 23.6/100 (stale); content is 375 days old.', 'Likely stale — re-crawl or find an updated source; recommended re-check in 14 days.', 'Content was updated after publication — the modified date drives the score.'];
const TAIL = {
  confidence_score: 0.85, confidence_per_section: { age: 1, score: 0.7 }, recommended_actions_priority_order: ACTS,
  chain_to: [
    { api: 'web-content-diff-checker', reason: 'Compare the current version against your stored snapshot to confirm what actually changed.' },
    { api: 'website-change-monitor', reason: 'Schedule re-checks at the recommended interval.' },
  ],
  privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('age', 'score'), _Tail: Tail, ScoreCore, ScoreRequest,
  DiscoveryResponse: discoverySchema(),
  ScoreResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ScoreCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ScoreCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const REQ_EXAMPLE = { published_date: '2025-01-01', modified_date: '2025-06-01', as_of: '2026-06-11', half_life_days: 180 };
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/score', summary: 'Score content freshness from its dates', operationId: 'score', priceUsdc: 0.005,
    requestSchemaRef: 'ScoreRequest', responseSchemaRef: 'ScoreResponse', requestExample: REQ_EXAMPLE,
    responseExample: { trace_id: 'wcf1-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL freshness + reasoning + re-check guidance', operationId: 'lookup', priceUsdc: 0.01, oneCall: true,
    requestSchemaRef: 'ScoreRequest', responseSchemaRef: 'LookupResponse', requestExample: REQ_EXAMPLE,
    responseExample: {
      trace_id: 'wcf2-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE,
      reasoning: { why_result_generated: 'Age 375d vs half-life 180d → score 23.6 (stale).', key_factors: ['Effective date: 2025-06-01T00:00:00.000Z.', 'Updated after publish: true.', 'Half-life: 180d.'], invalidators: ['Score assumes content value decays smoothly with age; evergreen reference pages decay far slower than news.', 'A "modified" date can reflect a trivial template change, not real content updates.', 'Tune half_life_days per content type (news ≈ 7–30, docs ≈ 365+).'] },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'web-content-freshness-scorer', title: 'Web Content Freshness Scorer API', version: '1.0.0',
  description: 'Deterministic content-freshness scorer. From published/modified (Last-Modified) dates and an optional half-life, returns content age, an exponential-decay freshness score (0–100), a staleness band, and a recommended re-check interval. Pure date math — no fetch, no LLM.',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
