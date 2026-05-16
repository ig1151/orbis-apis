import { Router, Request, Response } from 'express';
const router = Router();
const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string' }, success: { type: 'boolean' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'X/Twitter Post Lookup API', version: '1.0.0', description: 'Look up Twitter/X posts and threads, analyze profile metrics, and measure engagement signals for social intelligence, brand monitoring, and sentiment agents', 'x-agent-callable': true, 'x-mcp-compatible': true, 'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { post: '$0.002', profile: '$0.003', engagement: '$0.003', 'execution-gate': '$0.001', analyze: '$0.006' } } },
    servers: [{ url: 'https://orbis-apis.onrender.com/twitter-post-lookup' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/post': { post: { operationId: 'getPost', summary: 'Look up a Twitter/X post by URL or ID', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { post_url: { type: 'string' }, post_id: { type: 'string' } } } } } }, responses: { '200': { description: 'Post data', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, post: { type: 'object' }, sentiment: { type: 'string' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/profile': { post: { operationId: 'getProfile', summary: 'Get profile metrics for a Twitter/X username', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['username'], properties: { username: { type: 'string' } } } } } }, responses: { '200': { description: 'Profile metrics', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, profile: { type: 'object' }, influence_score: { type: 'number' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/engagement': { post: { operationId: 'getEngagement', summary: 'Measure engagement signals for a post', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['post_url'], properties: { post_url: { type: 'string' } } } } } }, responses: { '200': { description: 'Engagement metrics', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, engagement: { type: 'object' }, audience_reaction: { type: 'string' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['username'], properties: { username: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, blocking_flags: actions, confidence_per_section: confidence, privacy } } } } } } } },
      '/analyze': { post: { operationId: 'analyze', summary: 'ONE-CALL: full Twitter/X profile intelligence — profile + posts + sentiment', 'x-one-call': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['username'], properties: { username: { type: 'string' } } } } } }, responses: { '200': { description: 'Full Twitter/X intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, profile: { type: 'object' }, engagement_avg: { type: 'object' }, sentiment_distribution: { type: 'object' }, influence_assessment: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
