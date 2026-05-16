import { Router, Request, Response } from 'express';
const router = Router();
const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string' }, success: { type: 'boolean' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Entity Extraction API', version: '1.0.0', description: 'Extract named entities, keywords, and topics from text for knowledge graph construction, document tagging, and NLP pipeline automation agents', 'x-agent-callable': true, 'x-mcp-compatible': true, 'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { entities: '$0.003', keywords: '$0.002', topics: '$0.003', 'execution-gate': '$0.001', analyze: '$0.006' } } },
    servers: [{ url: 'https://orbis-apis.onrender.com/entity-extraction' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/entities': { post: { operationId: 'extractEntities', summary: 'Extract named entities (persons, orgs, locations, dates, money)', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, types: { type: 'array', items: { type: 'string', enum: ['person', 'org', 'location', 'date', 'money'] } } } } } } }, responses: { '200': { description: 'Extracted entities', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, entities: { type: 'array', items: { type: 'object' } }, entity_counts: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/keywords': { post: { operationId: 'extractKeywords', summary: 'Extract keywords and key phrases', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' } } } } } }, responses: { '200': { description: 'Keywords', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, keywords: { type: 'array', items: { type: 'object' } }, key_phrases: { type: 'array', items: { type: 'object' } }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/topics': { post: { operationId: 'extractTopics', summary: 'Extract main topics from text', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, max_topics: { type: 'integer' } } } } } }, responses: { '200': { description: 'Topics', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, topics: { type: 'array', items: { type: 'object' } }, primary_topic: { type: 'string' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, blocking_flags: actions, confidence_per_section: confidence, privacy } } } } } } } },
      '/analyze': { post: { operationId: 'analyze', summary: 'ONE-CALL: full NLP extraction — entities + keywords + topics + relationships', 'x-one-call': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' } } } } } }, responses: { '200': { description: 'Full NLP extraction', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, entities: { type: 'array', items: { type: 'object' } }, keywords: { type: 'array', items: { type: 'object' } }, topics: { type: 'array', items: { type: 'object' } }, relationships: { type: 'array', items: { type: 'object' } }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
