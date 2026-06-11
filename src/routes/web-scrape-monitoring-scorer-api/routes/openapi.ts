import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const MonitorCore = {
  type: 'object',
  required: ['change_rate_per_day', 'mean_change_interval_days', 'volatility', 'importance', 'staleness_tolerance_hours', 'recommended_check_interval_hours', 'recommended_checks_per_day', 'cadence_capped_by', 'monitoring_priority_score', 'priority_band'],
  properties: {
    change_rate_per_day: { type: 'number' },
    mean_change_interval_days: { type: 'number', description: 'Mean days between changes; -1 means effectively never.' },
    volatility: { type: 'string', enum: ['static', 'low', 'moderate', 'high', 'very_high'] },
    importance: { type: 'number', minimum: 1, maximum: 10 }, staleness_tolerance_hours: { type: ['number', 'null'] },
    recommended_check_interval_hours: { type: 'number' }, recommended_checks_per_day: { type: 'number' },
    cadence_capped_by: { type: 'string', enum: ['change_rate', 'staleness_tolerance', 'politeness_floor'] },
    monitoring_priority_score: { type: 'number', minimum: 0, maximum: 100 }, priority_band: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
  },
};
const ScoreRequest = {
  type: 'object', additionalProperties: false,
  properties: {
    change_rate_per_day: { type: 'number', minimum: 0 },
    mean_change_interval_days: { type: 'number', exclusiveMinimum: 0 },
    changes_observed: { type: 'number', minimum: 0 }, observation_window_days: { type: 'number', exclusiveMinimum: 0 },
    importance: { oneOf: [{ type: 'number', minimum: 1, maximum: 10 }, { type: 'string', enum: ['low', 'medium', 'high', 'critical'] }], description: 'Business importance (default 5/medium).' },
    staleness_tolerance_hours: { type: 'number', exclusiveMinimum: 0, description: 'Max acceptable staleness; caps the interval.' },
  },
  description: 'Provide a change signal (rate, mean interval, or counts+window) plus optional importance and staleness tolerance.',
};

const CORE_EXAMPLE = { change_rate_per_day: 0.4, mean_change_interval_days: 2.5, volatility: 'moderate', importance: 8, staleness_tolerance_hours: 24, recommended_check_interval_hours: 24, recommended_checks_per_day: 1, cadence_capped_by: 'staleness_tolerance', monitoring_priority_score: 51.2, priority_band: 'high' };
const ACTS = ['Check every 24h (~1×/day); volatility moderate, priority high (51.2/100).', 'Cadence is set by your staleness tolerance, not the change rate — loosen tolerance to poll less.'];
const TAIL = {
  confidence_score: 1, confidence_per_section: { cadence: 1, priority: 1 }, recommended_actions_priority_order: ACTS,
  chain_to: [
    { api: 'web-content-freshness-scorer', reason: 'Score the freshness of the content you fetch at each check.' },
    { api: 'web-content-diff-checker', reason: 'On each check, diff against the prior snapshot to confirm a real change.' },
    { api: 'website-change-monitor', reason: 'Operationalize this cadence as a scheduled monitor.' },
  ],
  privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('cadence', 'priority'), _Tail: Tail, MonitorCore, ScoreRequest,
  DiscoveryResponse: discoverySchema(),
  ScoreResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/MonitorCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/MonitorCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const REQ_EXAMPLE = { changes_observed: 12, observation_window_days: 30, importance: 'high', staleness_tolerance_hours: 24 };
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/score', summary: 'Recommended cadence + volatility + priority score', operationId: 'score', priceUsdc: 0.006,
    requestSchemaRef: 'ScoreRequest', responseSchemaRef: 'ScoreResponse', requestExample: REQ_EXAMPLE,
    responseExample: { trace_id: 'wsm1-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL cadence + reasoning + monitoring guidance', operationId: 'lookup', priceUsdc: 0.012, oneCall: true,
    requestSchemaRef: 'ScoreRequest', responseSchemaRef: 'LookupResponse', requestExample: REQ_EXAMPLE,
    responseExample: {
      trace_id: 'wsm2-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE,
      reasoning: { why_result_generated: 'Change rate 0.4/day (moderate); cadence 24h capped by staleness_tolerance; priority 51.2.', key_factors: ['Mean change interval: 2.5d.', 'Importance: 8/10.', 'Capped by: staleness_tolerance.'], invalidators: ['Recommendation assumes past change rate predicts future rate; bursty pages need adaptive polling.', 'Conditional requests (ETag/If-Modified-Since) or feeds beat polling for both freshness and politeness.', 'Importance is your business input, not an observed quantity.'] },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'web-scrape-monitoring-scorer', title: 'Web Scrape Monitoring Scorer API', version: '1.0.0',
  description: 'Deterministic monitoring-cadence scorer. From an observed change rate (or counts/window, or mean interval), importance, and staleness tolerance, returns a recommended re-check interval, a volatility band, and a monitoring-priority score. Pure arithmetic — no fetch, no LLM.',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
