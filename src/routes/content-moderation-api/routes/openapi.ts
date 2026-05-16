import { Router, Request, Response } from 'express';
const router = Router();
const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string' }, success: { type: 'boolean' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Content Moderation API', version: '1.0.0', description: 'Moderate text for policy violations, classify content categories, and generate safe rewrites for trust-and-safety, UGC platforms, and compliance automation agents', 'x-agent-callable': true, 'x-mcp-compatible': true, 'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { moderate: '$0.003', categories: '$0.002', 'safe-rewrite': '$0.005', 'execution-gate': '$0.001', analyze: '$0.007' } } },
    servers: [{ url: 'https://orbis-apis.onrender.com/content-moderation' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/moderate': { post: { operationId: 'moderate', summary: 'Moderate text for policy violations', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, policy: { type: 'string' } } } } } }, responses: { '200': { description: 'Moderation decision', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, decision: { type: 'string', enum: ['approved', 'rejected', 'review'] }, violations: { type: 'array', items: { type: 'object' } }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/categories': { post: { operationId: 'classifyCategories', summary: 'Classify content into safety categories', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' } } } } } }, responses: { '200': { description: 'Content categories', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, categories: { type: 'array', items: { type: 'object' } }, overall_safety: { type: 'string' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/safe-rewrite': { post: { operationId: 'safeRewrite', summary: 'Rewrite content to remove policy violations', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, tone: { type: 'string' } } } } } }, responses: { '200': { description: 'Safe rewritten text', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, rewritten_text: { type: 'string' }, changes_made: { type: 'array', items: { type: 'string' } }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, blocking_flags: actions, confidence_per_section: confidence, privacy } } } } } } } },
      '/analyze': { post: { operationId: 'analyze', summary: 'ONE-CALL: full moderation — decision + categories + safe rewrite', 'x-one-call': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, policy: { type: 'string' } } } } } }, responses: { '200': { description: 'Full moderation analysis', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, decision: { type: 'string' }, categories: { type: 'array', items: { type: 'object' } }, safe_rewrite: { type: 'string' }, risk_score: { type: 'number' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
