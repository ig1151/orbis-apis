import { Router, Request, Response } from 'express';
const router = Router();
const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string' }, success: { type: 'boolean' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Sentiment API', version: '1.0.0', description: 'Analyze text sentiment, batch-score multiple strings, and extract aspect-level sentiment for brand monitoring, customer feedback, and NLP pipeline agents', 'x-agent-callable': true, 'x-mcp-compatible': true, 'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { sentiment: '$0.002', batch: '$0.006', 'aspect-sentiment': '$0.004', 'execution-gate': '$0.001', analyze: '$0.005' } } },
    servers: [{ url: 'https://orbis-apis.onrender.com/sentiment' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/sentiment': { post: { operationId: 'analyzeSentiment', summary: 'Analyze sentiment with score and emotion breakdown', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' } } } } } }, responses: { '200': { description: 'Sentiment analysis', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] }, score: { type: 'number' }, emotions: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/batch': { post: { operationId: 'batchSentiment', summary: 'Batch sentiment for up to 50 texts', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['texts'], properties: { texts: { type: 'array', items: { type: 'string' }, maxItems: 50 } } } } } }, responses: { '200': { description: 'Batch sentiment results', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, results: { type: 'array', items: { type: 'object' } }, summary: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/aspect-sentiment': { post: { operationId: 'aspectSentiment', summary: 'Analyze sentiment by specific aspects', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text', 'aspects'], properties: { text: { type: 'string' }, aspects: { type: 'array', items: { type: 'string' } } } } } } }, responses: { '200': { description: 'Aspect-level sentiment', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, aspect_scores: { type: 'array', items: { type: 'object' } }, overall_sentiment: { type: 'string' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, blocking_flags: actions, confidence_per_section: confidence, privacy } } } } } } } },
      '/analyze': { post: { operationId: 'analyze', summary: 'ONE-CALL: full sentiment analysis — sentiment + emotions + topics', 'x-one-call': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' } } } } } }, responses: { '200': { description: 'Full sentiment analysis', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, overall_sentiment: { type: 'string' }, score: { type: 'number' }, emotions: { type: 'object' }, topic_sentiments: { type: 'array', items: { type: 'object' } }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
