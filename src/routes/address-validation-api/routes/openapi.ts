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
      title: 'Address Validation API',
      version: '1.0.0',
      description: 'Validate, normalize, and geocode postal addresses for data quality, logistics, and compliance workflows.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': {
        free_tier: { requests_per_day: 100, requests_per_month: 3000 },
        pay_per_call: { validate: '$0.001', normalize: '$0.002', geocode: '$0.002', 'execution-gate': '$0.001', lookup: '$0.004' },
      },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/address-validation' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/validate': {
        post: {
          operationId: 'validateAddress',
          summary: 'Validate address — deliverability, residential/commercial, DPV status',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['address'], properties: { address: { type: 'string', example: '1600 Pennsylvania Ave NW, Washington DC 20500' } } } } } },
          responses: {
            '200': { description: 'Validation result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, address_input: { type: 'string' }, validation: { type: 'object', properties: { is_valid: { type: 'boolean' }, is_deliverable: { type: 'boolean' }, is_residential: { type: 'boolean' }, completeness: { type: 'string' }, confidence_score: { type: 'number' }, dpv_status: { type: 'string' } } }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing address' }, '500': { description: 'Failed' },
          },
        },
      },
      '/normalize': {
        post: {
          operationId: 'normalizeAddress',
          summary: 'Normalize address — standardize abbreviations, format components, corrections',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['address'], properties: { address: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'Normalized address', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, address_input: { type: 'string' }, normalized: { type: 'object' }, corrections_made: actions, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing address' }, '500': { description: 'Failed' },
          },
        },
      },
      '/geocode': {
        post: {
          operationId: 'geocodeAddress',
          summary: 'Geocode address — lat/lon, accuracy, place ID, timezone',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['address'], properties: { address: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'Geocoded result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, address_input: { type: 'string' }, geocoded: { type: 'object', properties: { lat: { type: 'number' }, lon: { type: 'number' }, accuracy: { type: 'string' }, formatted_address: { type: 'string' }, timezone: { type: 'string' } } }, address_components: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing address' }, '500': { description: 'Failed' },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Execution readiness check before address validation workflow',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['address'], properties: { address: { type: 'string' }, objective: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, blocking_flags: actions, confidence_per_section: confidence, privacy } } } } },
          },
        },
      },
      '/lookup': {
        post: {
          operationId: 'lookup',
          summary: 'ONE-CALL: full address intelligence — validate + normalize + geocode + quality grade',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['address'], properties: { address: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'Full address intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, address_input: { type: 'string' }, validation: { type: 'object' }, normalized: { type: 'object' }, geocoded: { type: 'object' }, data_quality_grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'] }, corrections_made: actions, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing address' }, '500': { description: 'Failed' },
          },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
