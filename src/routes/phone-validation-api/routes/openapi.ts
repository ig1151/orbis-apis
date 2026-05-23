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
      title: 'Phone Validation API',
      version: '1.0.0',
      description: 'Validate phone numbers, detect carrier and line type, format for international standards, and score risk for fraud prevention workflows.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': {
        free_tier: { requests_per_day: 100, requests_per_month: 3000 },
        pay_per_call: { validate: '$0.001', carrier: '$0.002', format: '$0.001', 'execution-gate': '$0.001', lookup: '$0.003' },
      },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/phone-validation' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/v1/validate': {
        post: {
          operationId: 'validatePhone',
          summary: 'Validate phone number — valid/possible, country, number type, risk score',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['phone'], properties: { phone: { type: 'string', example: '+14155552671' } } } } } },
          responses: {
            '200': { description: 'Validation result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, phone_input: { type: 'string' }, validation: { type: 'object' }, risk_score: { type: 'number' }, risk_signals: actions, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing phone' }, '500': { description: 'Failed' },
          },
        },
      },
      '/v1/carrier': {
        post: {
          operationId: 'phoneCarrier',
          summary: 'Carrier and line type detection — carrier name, network type, VOIP, ported status',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['phone'], properties: { phone: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'Carrier info', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, phone_input: { type: 'string' }, carrier: { type: 'object' }, line_type: { type: 'string' }, ported: { type: 'boolean' }, sms_deliverable: { type: 'boolean' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing phone' }, '500': { description: 'Failed' },
          },
        },
      },
      '/v1/format': {
        post: {
          operationId: 'phoneFormat',
          summary: 'Format phone in international standards — E.164, national, international, RFC3966',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['phone'], properties: { phone: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'Formatted phone', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, phone_input: { type: 'string' }, formats: { type: 'object', properties: { e164: { type: 'string' }, national: { type: 'string' }, international: { type: 'string' }, rfc3966: { type: 'string' } } }, is_valid: { type: 'boolean' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing phone' }, '500': { description: 'Failed' },
          },
        },
      },
      '/v1/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Execution readiness check before phone validation workflow',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['phone'], properties: { phone: { type: 'string' }, objective: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, blocking_flags: actions, confidence_per_section: confidence, privacy } } } } },
          },
        },
      },
      '/v1/lookup': {
        post: {
          operationId: 'lookup',
          summary: 'ONE-CALL: full phone intelligence — validate + carrier + format + risk score',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['phone'], properties: { phone: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'Full phone intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, phone_input: { type: 'string' }, validation: { type: 'object' }, formats: { type: 'object' }, carrier: { type: 'object' }, risk: { type: 'object' }, recommendation: { type: 'string', enum: ['use', 'flag', 'block'] }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing phone' }, '500': { description: 'Failed' },
          },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
