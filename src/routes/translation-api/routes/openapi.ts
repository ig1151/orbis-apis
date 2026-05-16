import { Router, Request, Response } from 'express';
const router = Router();
const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string' }, success: { type: 'boolean' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Translation API', version: '1.0.0', description: 'Translate text between languages, batch-translate multiple strings, and auto-detect source language before translating for multilingual automation and content localization agents', 'x-agent-callable': true, 'x-mcp-compatible': true, 'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { translate: '$0.002', batch: '$0.008', 'detect-and-translate': '$0.003', 'execution-gate': '$0.001', lookup: '$0.004' } } },
    servers: [{ url: 'https://orbis-apis.onrender.com/translation' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/translate': { post: { operationId: 'translate', summary: 'Translate text to a target language', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text', 'target_language'], properties: { text: { type: 'string' }, target_language: { type: 'string' }, source_language: { type: 'string' } } } } } }, responses: { '200': { description: 'Translation', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, translation: { type: 'string' }, source_language: { type: 'string' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/batch': { post: { operationId: 'batchTranslate', summary: 'Batch translate multiple texts', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['texts', 'target_language'], properties: { texts: { type: 'array', items: { type: 'string' } }, target_language: { type: 'string' } } } } } }, responses: { '200': { description: 'Batch translations', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, results: { type: 'array', items: { type: 'object' } }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/detect-and-translate': { post: { operationId: 'detectAndTranslate', summary: 'Auto-detect language then translate', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text', 'target_language'], properties: { text: { type: 'string' }, target_language: { type: 'string' } } } } } }, responses: { '200': { description: 'Detected language and translation', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, detected_language: { type: 'object' }, translation: { type: 'string' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, blocking_flags: actions, confidence_per_section: confidence, privacy } } } } } } } },
      '/lookup': { post: { operationId: 'lookup', summary: 'ONE-CALL: detect + translate + back-translate + quality score', 'x-one-call': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text', 'target_language'], properties: { text: { type: 'string' }, target_language: { type: 'string' } } } } } }, responses: { '200': { description: 'Full translation intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, translation: { type: 'string' }, back_translation: { type: 'string' }, quality_score: { type: 'number' }, source_language: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
