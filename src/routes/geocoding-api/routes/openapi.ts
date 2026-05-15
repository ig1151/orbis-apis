import { Router, Request, Response } from 'express';
const router = Router();
const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string' }, success: { type: 'boolean' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Geocoding API',
      version: '1.0.0',
      description: 'Forward and reverse geocoding, timezone lookup, and place intelligence for mapping, logistics, and location-aware agent workflows.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': {
        free_tier: { requests_per_day: 100, requests_per_month: 3000 },
        pay_per_call: { geocode: '$0.001', reverse: '$0.001', timezone: '$0.001', 'execution-gate': '$0.001', lookup: '$0.003' },
      },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/geocoding' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/geocode': {
        post: {
          operationId: 'geocode',
          summary: 'Forward geocoding — address to lat/lon, address components, accuracy',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['address'], properties: { address: { type: 'string', example: '1600 Pennsylvania Ave NW, Washington DC' } } } } } },
          responses: {
            '200': { description: 'Geocoding result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, address_input: { type: 'string' }, result: { type: 'object', properties: { formatted_address: { type: 'string' }, lat: { type: 'number' }, lon: { type: 'number' }, accuracy: { type: 'string' }, address_components: { type: 'object' } } }, alternatives: { type: 'array', items: { type: 'object' } }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing address' }, '500': { description: 'Failed' },
          },
        },
      },
      '/reverse': {
        post: {
          operationId: 'reverseGeocode',
          summary: 'Reverse geocoding — lat/lon to formatted address',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['lat', 'lon'], properties: { lat: { type: 'number', example: 40.7128 }, lon: { type: 'number', example: -74.006 } } } } } },
          responses: {
            '200': { description: 'Reverse geocoding result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, lat: { type: 'number' }, lon: { type: 'number' }, result: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing lat/lon' }, '500': { description: 'Failed' },
          },
        },
      },
      '/timezone': {
        post: {
          operationId: 'timezone',
          summary: 'Timezone lookup — timezone ID, UTC offset, DST status, local time',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['lat', 'lon'], properties: { lat: { type: 'number' }, lon: { type: 'number' } } } } } },
          responses: {
            '200': { description: 'Timezone result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, lat: { type: 'number' }, lon: { type: 'number' }, timezone: { type: 'object' }, local_time: { type: 'string' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing lat/lon' }, '500': { description: 'Failed' },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Execution readiness check before geocoding workflow',
          requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { address: { type: 'string' }, lat: { type: 'number' }, lon: { type: 'number' }, objective: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, blocking_flags: actions, confidence_per_section: confidence, privacy } } } } },
          },
        },
      },
      '/lookup': {
        post: {
          operationId: 'lookup',
          summary: 'ONE-CALL: full geocoding intelligence — geocode + timezone + place intelligence',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['address'], properties: { address: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'Full geocoding intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, address_input: { type: 'string' }, geocoded: { type: 'object' }, timezone: { type: 'object' }, place_intelligence: { type: 'object' }, alternatives: { type: 'array', items: { type: 'object' } }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing address' }, '500': { description: 'Failed' },
          },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
