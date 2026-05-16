import { Router, Request, Response } from 'express';
const router = Router();
const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string' }, success: { type: 'boolean' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'PII Detection API', version: '1.0.0', description: 'Detect personally identifiable information in text, redact PII for compliance, and classify PII types for GDPR, HIPAA, and data governance automation agents', 'x-agent-callable': true, 'x-mcp-compatible': true, 'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { detect: '$0.003', redact: '$0.004', classify: '$0.003', 'execution-gate': '$0.001', analyze: '$0.007' } } },
    servers: [{ url: 'https://orbis-apis.onrender.com/pii-detection' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/detect': { post: { operationId: 'detectPII', summary: 'Detect PII in text', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' } } } } } }, responses: { '200': { description: 'PII detected', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, pii_found: { type: 'boolean' }, pii_items: { type: 'array', items: { type: 'object' } }, risk_level: { type: 'string' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/redact': { post: { operationId: 'redactPII', summary: 'Redact PII from text', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, replacement: { type: 'string', default: '[REDACTED]' } } } } } }, responses: { '200': { description: 'Redacted text', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, redacted_text: { type: 'string' }, items_redacted: { type: 'number' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/classify': { post: { operationId: 'classifyPII', summary: 'Classify PII types and applicable regulations', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' } } } } } }, responses: { '200': { description: 'PII classification', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, classifications: { type: 'array', items: { type: 'object' } }, applicable_regulations: { type: 'array', items: { type: 'string' } }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, blocking_flags: actions, confidence_per_section: confidence, privacy } } } } } } } },
      '/analyze': { post: { operationId: 'analyze', summary: 'ONE-CALL: detect + redact + classify PII with compliance recommendations', 'x-one-call': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' } } } } } }, responses: { '200': { description: 'Full PII analysis', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, pii_items: { type: 'array', items: { type: 'object' } }, redacted_text: { type: 'string' }, classifications: { type: 'array', items: { type: 'object' } }, compliance_recommendations: { type: 'array', items: { type: 'string' } }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
