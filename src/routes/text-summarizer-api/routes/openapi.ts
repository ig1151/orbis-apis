import { Router, Request, Response } from 'express';
const router = Router();
const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string' }, success: { type: 'boolean' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Text Summarizer API', version: '1.0.0', description: 'Summarize long-form text into concise paragraphs, bullet points, or TL;DR formats for research agents, document intelligence, and content automation workflows', 'x-agent-callable': true, 'x-mcp-compatible': true, 'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { summarize: '$0.004', bullets: '$0.003', tldr: '$0.002', 'execution-gate': '$0.001', analyze: '$0.006' } } },
    servers: [{ url: 'https://orbis-apis.onrender.com/text-summarizer' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/summarize': { post: { operationId: 'summarize', summary: 'Summarize text as a concise paragraph', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, max_words: { type: 'integer' } } } } } }, responses: { '200': { description: 'Summary', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, summary: { type: 'string' }, compression_ratio: { type: 'number' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/bullets': { post: { operationId: 'bullets', summary: 'Summarize text as bullet points', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, max_bullets: { type: 'integer' } } } } } }, responses: { '200': { description: 'Bullet summary', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, bullets: { type: 'array', items: { type: 'string' } }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/tldr': { post: { operationId: 'tldr', summary: 'Generate a TL;DR (1-2 sentences)', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' } } } } } }, responses: { '200': { description: 'TL;DR', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, tldr: { type: 'string' }, key_point: { type: 'string' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, blocking_flags: actions, confidence_per_section: confidence, privacy } } } } } } } },
      '/analyze': { post: { operationId: 'analyze', summary: 'ONE-CALL: full summarization — paragraph + bullets + TL;DR + topics', 'x-one-call': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, focus: { type: 'string' } } } } } }, responses: { '200': { description: 'Full summarization', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, summary: { type: 'string' }, bullets: { type: 'array', items: { type: 'string' } }, tldr: { type: 'string' }, key_topics: { type: 'array', items: { type: 'string' } }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
