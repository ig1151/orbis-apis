import { Router, Request, Response } from 'express';
const router = Router();
const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string' }, success: { type: 'boolean' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'YouTube Metadata API', version: '1.0.0', description: 'Extract YouTube video metadata, channel analytics, and transcripts for content intelligence, competitive research, and media monitoring agents', 'x-agent-callable': true, 'x-mcp-compatible': true, 'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { video: '$0.002', channel: '$0.003', transcript: '$0.005', 'execution-gate': '$0.001', analyze: '$0.008' } } },
    servers: [{ url: 'https://orbis-apis.onrender.com/youtube-metadata' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/video': { post: { operationId: 'getVideo', summary: 'Get YouTube video metadata', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { video_url: { type: 'string' }, video_id: { type: 'string' } } } } } }, responses: { '200': { description: 'Video metadata', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, video: { type: 'object' }, engagement_rate: { type: 'number' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/channel': { post: { operationId: 'getChannel', summary: 'Get YouTube channel analytics', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { channel_url: { type: 'string' }, channel_id: { type: 'string' } } } } } }, responses: { '200': { description: 'Channel analytics', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, channel: { type: 'object' }, growth_trend: { type: 'string' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/transcript': { post: { operationId: 'getTranscript', summary: 'Extract transcript from a YouTube video', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['video_url'], properties: { video_url: { type: 'string' } } } } } }, responses: { '200': { description: 'Video transcript', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, transcript: { type: 'object' }, key_topics: { type: 'array', items: { type: 'string' } }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['video_url'], properties: { video_url: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, blocking_flags: actions, confidence_per_section: confidence, privacy } } } } } } } },
      '/analyze': { post: { operationId: 'analyze', summary: 'ONE-CALL: full YouTube intelligence — video + channel + transcript', 'x-one-call': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['video_url'], properties: { video_url: { type: 'string' } } } } } }, responses: { '200': { description: 'Full YouTube intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, video_metadata: { type: 'object' }, channel_summary: { type: 'object' }, transcript_summary: { type: 'string' }, content_grade: { type: 'string' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
