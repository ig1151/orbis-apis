import { Router, Request, Response } from 'express';
const router = Router();
const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string' }, success: { type: 'boolean' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Transcript Extraction API', version: '1.0.0', description: 'Extract transcripts from YouTube videos, podcast episodes, and audio URLs with speaker detection and timestamping for research, RAG, and media intelligence agents', 'x-agent-callable': true, 'x-mcp-compatible': true, 'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { youtube: '$0.004', podcast: '$0.005', 'audio-url': '$0.006', 'execution-gate': '$0.001', extract: '$0.008' } } },
    servers: [{ url: 'https://orbis-apis.onrender.com/transcript-extraction' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/youtube': { post: { operationId: 'youtubeTranscript', summary: 'Extract transcript from a YouTube video', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['video_url'], properties: { video_url: { type: 'string' } } } } } }, responses: { '200': { description: 'YouTube transcript', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, transcript: { type: 'object' }, speakers_detected: { type: 'array', items: { type: 'string' } }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/podcast': { post: { operationId: 'podcastTranscript', summary: 'Extract transcript from a podcast episode', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['episode_url'], properties: { episode_url: { type: 'string' } } } } } }, responses: { '200': { description: 'Podcast transcript', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, transcript: { type: 'object' }, speakers_detected: { type: 'array', items: { type: 'string' } }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/audio-url': { post: { operationId: 'audioUrlTranscript', summary: 'Extract transcript from an audio URL', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['audio_url'], properties: { audio_url: { type: 'string' } } } } } }, responses: { '200': { description: 'Audio transcript', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, transcript: { type: 'object' }, speakers_detected: { type: 'array', items: { type: 'string' } }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['url'], properties: { url: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, blocking_flags: actions, confidence_per_section: confidence, privacy } } } } } } } },
      '/extract': { post: { operationId: 'extract', summary: 'ONE-CALL: extract + summarize transcript from any source', 'x-one-call': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['url', 'type'], properties: { url: { type: 'string' }, type: { type: 'string', enum: ['youtube', 'podcast', 'audio'] } } } } } }, responses: { '200': { description: 'Full transcript extraction', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, transcript: { type: 'object' }, summary: { type: 'string' }, action_items: { type: 'array', items: { type: 'string' } }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
