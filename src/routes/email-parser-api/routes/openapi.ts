import { Router, Request, Response } from 'express';
const router = Router();
const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string' }, success: { type: 'boolean' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Email Parser API', version: '1.0.0', description: 'Parse raw email content, extract action items and commitments, and classify emails by type for CRM automation, inbox intelligence, and workflow trigger agents', 'x-agent-callable': true, 'x-mcp-compatible': true, 'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { parse: '$0.003', 'extract-action-items': '$0.005', classify: '$0.003', 'execution-gate': '$0.001', analyze: '$0.008' } } },
    servers: [{ url: 'https://orbis-apis.onrender.com/email-parser' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/parse': { post: { operationId: 'parseEmail', summary: 'Parse raw email into structured fields', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email_text'], properties: { email_text: { type: 'string' }, include_headers: { type: 'boolean' } } } } } }, responses: { '200': { description: 'Parsed email', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, parsed: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/extract-action-items': { post: { operationId: 'extractActionItems', summary: 'Extract action items and commitments from email', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email_text'], properties: { email_text: { type: 'string' } } } } } }, responses: { '200': { description: 'Action items', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, action_items: { type: 'array', items: { type: 'object' } }, commitments: { type: 'array', items: { type: 'object' } }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/classify': { post: { operationId: 'classifyEmail', summary: 'Classify email by type and urgency', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email_text'], properties: { email_text: { type: 'string' }, categories: { type: 'array', items: { type: 'string' } } } } } } }, responses: { '200': { description: 'Email classification', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, primary_category: { type: 'string' }, urgency: { type: 'string' }, suggested_workflow: { type: 'string' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email_text'], properties: { email_text: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, blocking_flags: actions, confidence_per_section: confidence, privacy } } } } } } } },
      '/analyze': { post: { operationId: 'analyze', summary: 'ONE-CALL: parse + extract action items + classify + CRM fields', 'x-one-call': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email_text'], properties: { email_text: { type: 'string' } } } } } }, responses: { '200': { description: 'Full email intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, parsed: { type: 'object' }, action_items: { type: 'array', items: { type: 'object' } }, classification: { type: 'object' }, suggested_reply: { type: 'string' }, crm_fields: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
