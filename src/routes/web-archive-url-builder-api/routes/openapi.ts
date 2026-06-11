import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, ConfidencePerSection, Tail, discoverySchema } from '../../_aplus/specparts';

const WaybackUrls = {
  type: 'object', required: ['snapshot_url', 'latest_url', 'save_url', 'calendar_url', 'availability_api'], additionalProperties: false,
  properties: { snapshot_url: { type: ['string', 'null'] }, latest_url: { type: 'string' }, save_url: { type: 'string' }, calendar_url: { type: 'string' }, availability_api: { type: 'string' } },
};
const ArchiveTodayUrls = { type: 'object', required: ['newest_url', 'snapshot_list_url', 'submit_url'], additionalProperties: false, properties: { newest_url: { type: 'string' }, snapshot_list_url: { type: 'string' }, submit_url: { type: 'string' } } };
const GoogleCacheUrls = { type: 'object', required: ['url', 'deprecated', 'note'], additionalProperties: false, properties: { url: { type: 'string' }, deprecated: { type: 'boolean' }, note: { type: 'string' } } };
const Archives = { type: 'object', additionalProperties: false, properties: { wayback: { $ref: '#/components/schemas/WaybackUrls' }, archive_today: { $ref: '#/components/schemas/ArchiveTodayUrls' }, google_cache: { $ref: '#/components/schemas/GoogleCacheUrls' } } };
const Timestamp = { type: 'object', required: ['input', 'wayback_14', 'iso'], additionalProperties: false, properties: { input: { type: 'string' }, wayback_14: { type: 'string' }, iso: { type: 'string' } } };

const BuildCore = {
  type: 'object', required: ['normalized_url', 'service', 'timestamp', 'archives'],
  properties: {
    normalized_url: { type: 'string' }, service: { type: 'string', enum: ['wayback', 'archive_today', 'google_cache', 'all'] },
    timestamp: { oneOf: [{ $ref: '#/components/schemas/Timestamp' }, { type: 'null' }] },
    archives: { $ref: '#/components/schemas/Archives' },
  },
};
const BuildRequest = {
  type: 'object', required: ['url'], additionalProperties: false,
  properties: {
    url: { type: 'string', description: 'Page URL (scheme optional; https assumed).' },
    timestamp: { type: 'string', description: 'ISO 8601, epoch seconds/ms, YYYYMMDD, or 14-digit Wayback timestamp.' },
    date: { type: 'string', description: 'Alias for timestamp.' },
    service: { type: 'string', enum: ['wayback', 'archive_today', 'google_cache', 'all'], default: 'all' },
  },
};

const U = 'https://example.com/article';
const ENC = 'https%3A%2F%2Fexample.com%2Farticle';
const CORE_EXAMPLE = {
  normalized_url: U, service: 'all', timestamp: { input: '2023-06-15T12:00:00Z', wayback_14: '20230615120000', iso: '2023-06-15T12:00:00.000Z' },
  archives: {
    wayback: { snapshot_url: `https://web.archive.org/web/20230615120000/${U}`, latest_url: `https://web.archive.org/web/${U}`, save_url: `https://web.archive.org/save/${U}`, calendar_url: `https://web.archive.org/web/*/${U}`, availability_api: `https://archive.org/wayback/available?url=${ENC}&timestamp=20230615120000` },
    archive_today: { newest_url: `https://archive.ph/newest/${U}`, snapshot_list_url: `https://archive.ph/${U}`, submit_url: `https://archive.ph/?run=1&url=${ENC}` },
    google_cache: { url: `https://webcache.googleusercontent.com/search?q=cache:${ENC}`, deprecated: true, note: 'Google removed the public cache feature in 2024; this URL is best-effort and usually no longer resolves.' },
  },
};
const ACTS = ['Built archive URLs for https://example.com/article at 2023-06-15T12:00:00.000Z (Wayback 20230615120000).', 'Check Wayback availability_api first; if empty, POST save_url to capture a fresh snapshot.', 'archive.today preserves dynamic/JS pages better than Wayback; use submit_url to capture.'];
const TAIL = {
  confidence_score: 1, confidence_per_section: { url_construction: 1, timestamp_parsing: 1 }, recommended_actions_priority_order: ACTS,
  chain_to: [
    { api: 'web-content-type-classifier', reason: 'Confirm the URL is a webpage before archiving it.' },
    { api: 'web-content-freshness-scorer', reason: 'Once retrieved, score how fresh the archived snapshot is.' },
  ],
  privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection, _Tail: Tail, WaybackUrls, ArchiveTodayUrls, GoogleCacheUrls, Archives, Timestamp, BuildCore, BuildRequest,
  DiscoveryResponse: discoverySchema(),
  BuildResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/BuildCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/BuildCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const REQ_EXAMPLE = { url: 'example.com/article', timestamp: '2023-06-15T12:00:00Z' };
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/build', summary: 'Build archive URLs + normalized timestamp', operationId: 'build', priceUsdc: 0.004,
    requestSchemaRef: 'BuildRequest', responseSchemaRef: 'BuildResponse', requestExample: REQ_EXAMPLE,
    responseExample: { trace_id: 'wau1-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL archive URLs + reasoning + retrieval tips', operationId: 'lookup', priceUsdc: 0.008, oneCall: true,
    requestSchemaRef: 'BuildRequest', responseSchemaRef: 'LookupResponse', requestExample: REQ_EXAMPLE,
    responseExample: {
      trace_id: 'wau2-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE,
      reasoning: { why_result_generated: 'Normalized the URL and built 3 archive service URL set(s) for timestamp 20230615120000.', key_factors: ['Service: all.', 'Timestamp supplied: yes.', 'Normalized URL: https://example.com/article.'], invalidators: ['URLs are constructed, not verified — a snapshot may not exist at the requested time.', 'Google Cache is deprecated and usually 404s.', 'Wayback matches the nearest available capture, which can differ from the exact requested timestamp.'] },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'web-archive-url-builder', title: 'Web Archive URL Builder API', version: '1.0.0',
  description: 'Deterministic web-archive URL builder. Constructs Wayback Machine, archive.today, and Google Cache URLs (snapshot, latest, save/submit, calendar, availability API) for a URL + optional timestamp, and normalizes the timestamp to Wayback 14-digit + ISO. Pure string math — no fetch, no LLM.',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
