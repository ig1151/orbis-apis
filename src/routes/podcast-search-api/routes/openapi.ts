import { Router, Request, Response } from 'express';
const router = Router();
const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string' }, success: { type: 'boolean' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Podcast Search API', version: '1.0.0', description: 'Search podcasts and episodes, retrieve episode metadata, and extract transcripts for content intelligence, research, and media monitoring agents', 'x-agent-callable': true, 'x-mcp-compatible': true, 'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { search: '$0.002', episode: '$0.002', transcript: '$0.006', 'execution-gate': '$0.001', lookup: '$0.007' } } },
    servers: [{ url: 'https://orbis-apis.onrender.com/podcast-search' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/search': { post: { operationId: 'searchPodcasts', summary: 'Search podcasts by query and language', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['query'], properties: { query: { type: 'string' }, language: { type: 'string' } } } } } }, responses: { '200': { description: 'Podcasts found', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, podcasts: { type: 'array', items: { type: 'object' } }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/episode': { post: { operationId: 'getEpisode', summary: 'Get episode metadata by URL or ID', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { episode_url: { type: 'string' }, episode_id: { type: 'string' } } } } } }, responses: { '200': { description: 'Episode metadata', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, episode: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/transcript': { post: { operationId: 'getTranscript', summary: 'Extract transcript from a podcast episode', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['episode_url'], properties: { episode_url: { type: 'string' } } } } } }, responses: { '200': { description: 'Podcast transcript', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, transcript: { type: 'object' }, key_topics: { type: 'array', items: { type: 'string' } }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['query'], properties: { query: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, blocking_flags: actions, confidence_per_section: confidence, privacy } } } } } } } },
      '/lookup': { post: { operationId: 'lookup', summary: 'ONE-CALL: full podcast intelligence — search + episodes + transcript', 'x-one-call': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['query'], properties: { query: { type: 'string' } } } } } }, responses: { '200': { description: 'Full podcast intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, top_podcasts: { type: 'array', items: { type: 'object' } }, top_episodes: { type: 'array', items: { type: 'object' } }, best_match: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
