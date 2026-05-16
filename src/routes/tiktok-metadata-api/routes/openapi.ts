import { Router, Request, Response } from 'express';
const router = Router();
const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string' }, success: { type: 'boolean' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'TikTok Metadata API', version: '1.0.0', description: 'Extract TikTok video metadata, creator analytics, and trending content signals for social intelligence, influencer discovery, and content strategy agents', 'x-agent-callable': true, 'x-mcp-compatible': true, 'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { video: '$0.002', creator: '$0.003', trend: '$0.004', 'execution-gate': '$0.001', analyze: '$0.007' } } },
    servers: [{ url: 'https://orbis-apis.onrender.com/tiktok-metadata' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/video': { post: { operationId: 'getVideo', summary: 'Get TikTok video metadata', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['video_url'], properties: { video_url: { type: 'string' } } } } } }, responses: { '200': { description: 'Video metadata', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, video: { type: 'object' }, engagement_rate: { type: 'number' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/creator': { post: { operationId: 'getCreator', summary: 'Get TikTok creator analytics', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['username'], properties: { username: { type: 'string' } } } } } }, responses: { '200': { description: 'Creator analytics', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, creator: { type: 'object' }, influence_tier: { type: 'string' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/trend': { post: { operationId: 'getTrend', summary: 'Get trending TikTok content by keyword', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['keyword'], properties: { keyword: { type: 'string' }, region: { type: 'string' } } } } } }, responses: { '200': { description: 'Trending content', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, trending_videos: { type: 'array', items: { type: 'object' } }, trend_score: { type: 'number' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['username'], properties: { username: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, blocking_flags: actions, confidence_per_section: confidence, privacy } } } } } } } },
      '/analyze': { post: { operationId: 'analyze', summary: 'ONE-CALL: full TikTok intelligence — creator + videos + trends', 'x-one-call': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['username'], properties: { username: { type: 'string' } } } } } }, responses: { '200': { description: 'Full TikTok intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, creator: { type: 'object' }, top_videos: { type: 'array', items: { type: 'object' } }, content_strategy: { type: 'object' }, audience_demographics: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
