import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const SseEvent = {
  type: 'object', required: ['event', 'id', 'data', 'data_json', 'data_is_json', 'retry', 'is_done'], additionalProperties: false,
  properties: {
    event: { type: ['string', 'null'] }, id: { type: ['string', 'null'] }, data: { type: 'string' },
    data_json: { description: 'Parsed data payload (any JSON), or null when data is not JSON.' },
    data_is_json: { type: 'boolean' }, retry: { type: ['integer', 'null'] }, is_done: { type: 'boolean' },
  },
};
const ParseCore = {
  type: 'object',
  required: ['event_count', 'comment_count', 'json_parsed_count', 'done', 'byte_length', 'stream_type_detected', 'assembled_text', 'events'],
  properties: {
    event_count: { type: 'integer' }, comment_count: { type: 'integer' }, json_parsed_count: { type: 'integer' },
    done: { type: 'boolean' }, byte_length: { type: 'integer' },
    stream_type_detected: { type: 'string', enum: ['openai', 'anthropic', 'generic', 'unknown'], description: 'Heuristic provider detection from event shapes.' },
    assembled_text: { type: ['string', 'null'], description: 'Concatenated content fragments when assemble=true; null otherwise.' },
    events: { type: 'array', items: { $ref: '#/components/schemas/SseEvent' } },
  },
};

const ParseRequest = {
  type: 'object', required: ['text'], additionalProperties: false,
  properties: {
    text: { type: 'string', minLength: 1, maxLength: 500000, description: 'Raw text/event-stream text.' },
    parse_json: { type: 'boolean', description: 'Best-effort JSON.parse each data field. Default true.' },
    assemble: { type: 'boolean', description: 'Reconstruct concatenated content into assembled_text. Default false.' },
    content_path: { type: 'string', description: 'Dotted path into each data_json to pull the text fragment (e.g. choices.0.delta.content). Overrides auto-detection.' },
  },
};

const CORE = {
  event_count: 3, comment_count: 0, json_parsed_count: 2, done: true, byte_length: 74,
  stream_type_detected: 'generic', assembled_text: 'Hello',
  events: [
    { event: 'message', id: null, data: '{"delta":"Hel"}', data_json: { delta: 'Hel' }, data_is_json: true, retry: null, is_done: false },
    { event: null, id: null, data: '{"delta":"lo"}', data_json: { delta: 'lo' }, data_is_json: true, retry: null, is_done: false },
    { event: null, id: null, data: '[DONE]', data_json: null, data_is_json: false, retry: null, is_done: true },
  ],
};
const ACTS = [
  'Parsed 3 SSE event(s); 2 with JSON data.',
  'Assembled 5 chars of content (stream_type_detected=generic).',
  'Stream terminated: [DONE] sentinel present.',
];
const CHAIN = [
  { api: 'json-repair', reason: 'Salvage a data payload that failed to parse as JSON.' },
  { api: 'conversation-cost-ledger', reason: 'Tally token usage if the stream carried usage events.' },
];
const INVALIDATORS = [
  'Parsing follows the text/event-stream spec on the full text you provide; transport chunk boundaries are ignored.',
  'data_json is a best-effort JSON.parse of each data field — provider-specific delta formats are not interpreted or assembled into final content.',
  'A trailing event without a terminating blank line is still emitted for convenience, which a strict client would not dispatch.',
];
const TAIL = {
  confidence_score: 1, confidence_per_section: { parse: 1 }, recommended_actions_priority_order: ACTS,
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('parse'), _Tail: Tail, SseEvent, ParseCore, ParseRequest,
  DiscoveryResponse: discoverySchema(),
  ParseResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ParseCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ParseCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'sse-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0 };
const reqEx = { text: 'event: message\ndata: {"delta":"Hel"}\n\ndata: {"delta":"lo"}\n\ndata: [DONE]\n\n', assemble: true };
const endpoints: AplusEndpoint[] = [
  {
    method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse',
    responseExample: {
      name: 'SSE / Streaming Chunk Parser API', version: '1.0.0',
      description: 'Deterministic Server-Sent Events parser for LLM streaming responses. Parses raw text/event-stream text (event/data/id/retry fields, multi-line data, comments, blank-line boundaries) into structured events, best-effort JSON-parses each data payload, and flags the [DONE] terminator. Pure parsing — no LLM.',
      openapi_url: 'https://orbis-apis.onrender.com/sse-parser/openapi.json',
      auth: { type: 'apiKey', header: 'X-API-Key' },
      endpoints: [
        { method: 'POST', path: '/parse', summary: 'Parse raw SSE into structured events', price_usdc: 0.004 },
        { method: 'POST', path: '/lookup', summary: 'ONE-CALL parse + reasoning', price_usdc: 0.008 },
      ],
      pricing: [
        { path: '/parse', price_usdc: 0.004, currency: 'USDC' },
        { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
      ],
      x402_compatible: true,
    },
  },
  {
    method: 'post', path: '/parse', summary: 'Parse raw SSE into structured events', operationId: 'parse', priceUsdc: 0.004,
    requestSchemaRef: 'ParseRequest', responseSchemaRef: 'ParseResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL parse + reasoning', operationId: 'lookup', priceUsdc: 0.008, oneCall: true,
    requestSchemaRef: 'ParseRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: '3 event(s) parsed from 74 bytes; 2 JSON, done=true, stream_type=generic.',
        key_factors: ['3 events, 0 comments; detected generic.', '2 data payloads parsed as JSON.', 'Assembled 5 chars.'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'sse-parser', title: 'SSE / Streaming Chunk Parser API', version: '1.0.0',
  description: 'Deterministic Server-Sent Events parser for LLM streaming responses. Parses raw text/event-stream text (event/data/id/retry fields, multi-line data, comments, blank-line boundaries) into structured events, best-effort JSON-parses each data payload, and flags the [DONE] terminator. Pure parsing — no LLM.',
  endpoints, schemas, infoExtensions: { 'x-llm-infra': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
