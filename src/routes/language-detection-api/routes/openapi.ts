import { Router, Request, Response } from 'express';
const router = Router();
const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string' }, success: { type: 'boolean' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Language Detection API', version: '1.0.0', description: 'Detect language from text with confidence scores, batch-detect multiple strings, and return ISO language codes for multilingual routing and content classification agents', 'x-agent-callable': true, 'x-mcp-compatible': true, 'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { detect: '$0.001', batch: '$0.004', confidence: '$0.002', 'execution-gate': '$0.001', analyze: '$0.003' } } },
    servers: [{ url: 'https://orbis-apis.onrender.com/language-detection' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/detect': { post: { operationId: 'detectLanguage', summary: 'Detect language with ISO code', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' } } } } } }, responses: { '200': { description: 'Language detection', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, language: { type: 'string' }, iso_code: { type: 'string' }, confidence: { type: 'number' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/batch': { post: { operationId: 'batchDetect', summary: 'Detect language for up to 50 texts', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['texts'], properties: { texts: { type: 'array', items: { type: 'string' }, maxItems: 50 } } } } } }, responses: { '200': { description: 'Batch detection results', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, results: { type: 'array', items: { type: 'object' } }, summary: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/confidence': { post: { operationId: 'detectWithConfidence', summary: 'Detect language with full confidence breakdown and alternatives', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' } } } } } }, responses: { '200': { description: 'Confidence breakdown', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, top_language: { type: 'object' }, alternatives: { type: 'array', items: { type: 'object' } }, detection_certainty: { type: 'string' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, blocking_flags: actions, confidence_per_section: confidence, privacy } } } } } } } },
      '/analyze': { post: { operationId: 'analyze', summary: 'ONE-CALL: full language analysis — detection + script + routing recommendation', 'x-one-call': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' } } } } } }, responses: { '200': { description: 'Full language analysis', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, primary_language: { type: 'object' }, script: { type: 'string' }, multilingual: { type: 'boolean' }, routing_recommendation: { type: 'string' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
