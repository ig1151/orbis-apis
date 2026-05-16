import { Router, Request, Response } from 'express';
const router = Router();
const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string' }, success: { type: 'boolean' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Audio Transcription API', version: '1.0.0', description: 'Transcribe audio files with timestamps, speaker labels, and summaries for meeting intelligence, compliance recording, and voice workflow automation agents', 'x-agent-callable': true, 'x-mcp-compatible': true, 'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { transcribe: '$0.008', timestamps: '$0.006', summary: '$0.005', 'execution-gate': '$0.001', analyze: '$0.012' } } },
    servers: [{ url: 'https://orbis-apis.onrender.com/audio-transcription' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/transcribe': { post: { operationId: 'transcribe', summary: 'Transcribe an audio file', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['audio_url'], properties: { audio_url: { type: 'string' }, language: { type: 'string' } } } } } }, responses: { '200': { description: 'Transcription', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, transcription: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/timestamps': { post: { operationId: 'timestamps', summary: 'Transcribe with word-level timestamps', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['audio_url'], properties: { audio_url: { type: 'string' } } } } } }, responses: { '200': { description: 'Timestamped transcript', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, timestamped_transcript: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/summary': { post: { operationId: 'summary', summary: 'Transcribe and summarize audio', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['audio_url'], properties: { audio_url: { type: 'string' } } } } } }, responses: { '200': { description: 'Audio summary', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, summary: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['audio_url'], properties: { audio_url: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, blocking_flags: actions, confidence_per_section: confidence, privacy } } } } } } } },
      '/analyze': { post: { operationId: 'analyze', summary: 'ONE-CALL: full audio intelligence — transcribe + timestamps + speakers + summary', 'x-one-call': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['audio_url'], properties: { audio_url: { type: 'string' }, context: { type: 'string' } } } } } }, responses: { '200': { description: 'Full audio intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, transcription: { type: 'object' }, speakers: { type: 'array', items: { type: 'object' } }, summary: { type: 'string' }, action_items: { type: 'array', items: { type: 'string' } }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
