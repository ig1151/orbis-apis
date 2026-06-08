import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';

const EnvelopeOk = {
  type: 'object',
  required: ['trace_id', 'computed_at', 'success', 'latency_ms'],
  properties: {
    trace_id: { type: 'string' },
    computed_at: { type: 'string', format: 'date-time' },
    success: { type: 'boolean', enum: [true] },
    latency_ms: { type: 'integer', minimum: 0 },
  },
};

const CronFields = {
  type: 'object',
  required: ['minute', 'hour', 'day_of_month', 'month', 'day_of_week'],
  additionalProperties: false,
  properties: {
    minute: { type: 'string' }, hour: { type: 'string' }, day_of_month: { type: 'string' },
    month: { type: 'string' }, day_of_week: { type: 'string' },
  },
};

const ExplainCore = {
  type: 'object',
  required: ['expression', 'fields', 'description'],
  // allOf branch — strictness via unevaluatedProperties:false on the composite.
  properties: {
    expression: { type: 'string' },
    fields: { $ref: '#/components/schemas/CronFields' },
    description: { type: 'string', description: 'Plain-English description (UTC).' },
  },
};

const Tail = {
  type: 'object',
  required: ['confidence_score', 'recommended_actions_priority_order', 'chain_to', 'privacy'],
  properties: {
    confidence_score: { type: 'number', minimum: 0, maximum: 1 },
    recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
    chain_to: { type: 'array', items: { $ref: '#/components/schemas/ChainTo' } },
    privacy: { $ref: '#/components/schemas/Privacy' },
  },
};

const schemas = {
  EnvelopeOk,
  CronFields,
  ExplainCore,
  _Tail: Tail,
  ExplainRequest: {
    type: 'object', required: ['expression'], additionalProperties: false,
    properties: { expression: { type: 'string', description: 'A standard 5-field cron expression.', example: '0 9 * * 1-5' } },
  },
  LookupRequest: {
    type: 'object', required: ['expression'], additionalProperties: false,
    properties: {
      expression: { type: 'string', example: '0 9 * * 1-5' },
      from: { type: 'string', format: 'date-time', description: 'Reference time (ISO-8601); defaults to now.' },
      count: { type: 'integer', minimum: 1, maximum: 20, description: 'How many next runs to return (default 5).' },
      timezone: { type: 'string', default: 'UTC', description: 'IANA timezone the cron fields are interpreted in (DST-aware), e.g. "America/New_York". Defaults to UTC.', example: 'America/New_York' },
    },
  },
  DiscoveryResponse: {
    type: 'object',
    required: ['name', 'version', 'description', 'openapi_url', 'auth', 'endpoints', 'pricing', 'x402_compatible'],
    additionalProperties: false,
    properties: {
      name: { type: 'string' }, version: { type: 'string' }, description: { type: 'string' },
      openapi_url: { type: 'string', format: 'uri' },
      auth: {
        type: 'object', required: ['type', 'header'], additionalProperties: false,
        properties: { type: { type: 'string' }, header: { type: 'string' } },
      },
      endpoints: {
        type: 'array',
        items: {
          type: 'object', required: ['method', 'path', 'summary', 'price_usdc'], additionalProperties: false,
          properties: { method: { type: 'string' }, path: { type: 'string' }, summary: { type: 'string' }, price_usdc: { type: 'number' } },
        },
      },
      pricing: {
        type: 'array',
        items: {
          type: 'object', required: ['path', 'price_usdc', 'currency'], additionalProperties: false,
          properties: { path: { type: 'string' }, price_usdc: { type: 'number' }, currency: { type: 'string', enum: ['USDC'] } },
        },
      },
      x402_compatible: { type: 'boolean' },
    },
  },
  ExplainResponse: {
    allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ExplainCore' }, { $ref: '#/components/schemas/_Tail' }],
    unevaluatedProperties: false,
  },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      { $ref: '#/components/schemas/ExplainCore' },
      {
        type: 'object',
        required: ['next_runs', 'next_runs_timezone', 'next_run_count', 'reasoning'],
        properties: {
          next_runs: { type: 'array', items: { type: 'string', format: 'date-time' }, description: 'Next matching instants as ISO-8601 with the timezone offset (or Z for UTC).' },
          next_runs_timezone: { type: 'string', description: 'IANA timezone the runs are expressed in.' },
          next_run_count: { type: 'integer', minimum: 0, description: 'Number of next_runs returned (≤ requested count; fewer if the horizon has no more matches).' },
          reasoning: { $ref: '#/components/schemas/Reasoning' },
        },
      },
      { $ref: '#/components/schemas/_Tail' },
    ],
    unevaluatedProperties: false,
  },
};

const FIELDS_EXAMPLE = { minute: '0', hour: '9', day_of_month: '*', month: '*', day_of_week: '1-5' };
const DESC = 'At 09:00, on Monday, Tuesday, Wednesday, Thursday, Friday (UTC).';
const DESC_TZ = 'At 09:00, on Monday, Tuesday, Wednesday, Thursday, Friday (America/New_York).';

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/explain', summary: 'Parse a cron expression into fields + a plain-English description', operationId: 'explain',
    priceUsdc: 0.005, requestSchemaRef: 'ExplainRequest', responseSchemaRef: 'ExplainResponse',
    requestExample: { expression: '0 9 * * 1-5' },
    responseExample: {
      trace_id: 'c1-1780000000000', computed_at: '2026-06-08T12:00:00.000Z', success: true, latency_ms: 0,
      expression: '0 9 * * 1-5', fields: FIELDS_EXAMPLE, description: DESC,
      confidence_score: 1.0,
      recommended_actions_priority_order: [DESC, 'Use /lookup to compute the next scheduled run times.'],
      chain_to: [], privacy: { data_stored: false, retention: 'none' },
    },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL explain + next run times (any IANA timezone, DST-aware) + reasoning', operationId: 'lookup',
    priceUsdc: 0.015, oneCall: true, requestSchemaRef: 'LookupRequest', responseSchemaRef: 'LookupResponse',
    requestExample: { expression: '0 9 * * 1-5', from: '2026-06-08T00:00:00Z', count: 3, timezone: 'America/New_York' },
    responseExample: {
      trace_id: 'c2-1780000000000', computed_at: '2026-06-08T12:00:00.000Z', success: true, latency_ms: 0,
      expression: '0 9 * * 1-5', fields: FIELDS_EXAMPLE, description: DESC_TZ,
      next_runs: ['2026-06-08T09:00:00-04:00', '2026-06-09T09:00:00-04:00', '2026-06-10T09:00:00-04:00'],
      next_runs_timezone: 'America/New_York',
      next_run_count: 3,
      reasoning: {
        why_result_generated: 'Parsed the cron expression and computed the next 3 matching minute(s) interpreted in America/New_York after the reference time.',
        key_factors: [DESC_TZ, 'standard day matching', 'wall-clock times in America/New_York, DST-aware (returned with UTC offset)'],
        invalidators: ['Interpreting the schedule in a different timezone changes the absolute instants.', 'A schedule with no occurrence within ~2.8 years returns fewer runs.'],
      },
      confidence_score: 1.0,
      recommended_actions_priority_order: [DESC_TZ, 'Next run: 2026-06-08T09:00:00-04:00 (America/New_York).'],
      chain_to: [], privacy: { data_stored: false, retention: 'none' },
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'cron-explainer',
  title: 'Cron Explainer API',
  version: '1.1.0',
  description: 'Deterministic 5-field cron parsing: plain-English description plus the next scheduled run times in any IANA timezone (DST-aware). Real parsing and date arithmetic; deterministic schemas; confidence always 1.0.',
  endpoints,
  schemas,
});

export default specRouter(spec);
