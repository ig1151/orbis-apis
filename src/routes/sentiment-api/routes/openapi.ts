import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };
const provenance = { type: 'object', properties: { provider: { type: 'string' }, retrieved_at: { type: 'string', format: 'date-time' }, freshness_score: { type: 'number', minimum: 0, maximum: 1 } } };
const chainFields = { source_provenance: provenance, cache_ttl_seconds: { type: 'integer' }, cache_recommended: { type: 'boolean' }, recommended_next_api: { type: 'string' }, recommended_next_endpoint: { type: 'string' }, automation_safe: { type: 'boolean' } };

const sentimentLabel = { type: 'string', enum: ['positive', 'negative', 'neutral', 'mixed'] };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Sentiment API',
      version: '2.0.0',
      description: 'Analyze text sentiment, brand reputation, emotional trends, and topic-level sentiment for customer intelligence and monitoring agents',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-pricing': { free_tier: { requests_per_day: 500, requests_per_month: 15000 }, pay_per_call: { sentiment: '$0.001', 'bulk-sentiment': '$0.003', 'brand-sentiment': '$0.004', 'execution-gate': '$0.001', 'sentiment-intelligence': '$0.005', 'trend-sentiment': '$0.004', batch: '$0.008' } },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/sentiment' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/sentiment': {
        post: {
          operationId: 'analyzeSentiment',
          summary: 'Analyze sentiment of a single text',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, context: { type: 'string' } } } } } },
          responses: { '200': { description: 'Sentiment result', content: { 'application/json': { schema: { type: 'object', required: ['trace_id', 'computed_at', 'success'], properties: { ...traceFields, sentiment: { type: 'object', properties: { label: sentimentLabel, score: { type: 'number', minimum: -1, maximum: 1 }, positive_score: { type: 'number', minimum: 0, maximum: 1 }, negative_score: { type: 'number', minimum: 0, maximum: 1 }, neutral_score: { type: 'number', minimum: 0, maximum: 1 } } }, aspects: { type: 'array', items: { type: 'object', properties: { aspect: { type: 'string' }, sentiment: sentimentLabel, score: { type: 'number' } } } }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/bulk-sentiment': {
        post: {
          operationId: 'bulkSentiment',
          summary: 'Analyze sentiment for a list of texts with aggregate summary',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['texts'], properties: { texts: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 100 } } } } } },
          responses: { '200': { description: 'Bulk sentiment results', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, results: { type: 'array', items: { type: 'object', properties: { index: { type: 'integer' }, text_snippet: { type: 'string' }, label: sentimentLabel, score: { type: 'number' } } } }, aggregate: { type: 'object', properties: { positive_count: { type: 'integer' }, negative_count: { type: 'integer' }, neutral_count: { type: 'integer' }, avg_sentiment_score: { type: 'number' }, overall_label: sentimentLabel } }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/brand-sentiment': {
        post: {
          operationId: 'brandSentiment',
          summary: 'Analyze brand sentiment across provided texts',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['brand'], properties: { brand: { type: 'string' }, texts: { type: 'array', items: { type: 'string' } } } } } } },
          responses: { '200': { description: 'Brand sentiment', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, brand: { type: 'string' }, brand_sentiment: { type: 'object', properties: { overall_label: sentimentLabel, overall_score: { type: 'number' }, mention_count: { type: 'integer' }, positive_mentions: { type: 'integer' }, negative_mentions: { type: 'integer' }, neutral_mentions: { type: 'integer' }, top_positive_themes: { type: 'array', items: { type: 'string' } }, top_negative_themes: { type: 'array', items: { type: 'string' } } } }, reputation_score: { type: 'number', minimum: 0, maximum: 1 }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Execution readiness check',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, objective: { type: 'string' } } } } } },
          responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, blocking_flags: actions, next_api: { type: 'string' }, ...chainFields, confidence_per_section: confidence, privacy } } } } } },
        },
      },
      '/sentiment-intelligence': {
        post: {
          operationId: 'sentimentIntelligence',
          summary: 'ONE-CALL: overall sentiment + emotion scores + topic themes + alerts',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { texts: { type: 'array', items: { type: 'string' } }, brand: { type: 'string' }, context: { type: 'string' } } } } } },
          responses: { '200': { description: 'Full sentiment intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, overall_sentiment: sentimentLabel, sentiment_score: { type: 'number' }, emotions: { type: 'object', properties: { joy: { type: 'number' }, anger: { type: 'number' }, sadness: { type: 'number' }, fear: { type: 'number' }, surprise: { type: 'number' }, disgust: { type: 'number' }, dominant: { type: 'string' } } }, top_themes: { type: 'array', items: { type: 'string' } }, alerts: { type: 'array', items: { type: 'object', properties: { type: { type: 'string', enum: ['negative_spike', 'positive_surge'] }, theme: { type: 'string' }, severity: { type: 'string', enum: ['high', 'medium', 'low'] } } } }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/trend-sentiment': {
        post: {
          operationId: 'trendSentiment',
          summary: 'Analyze sentiment trend over time for a topic with emotion breakdown',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { topic: { type: 'string' }, texts: { type: 'array', items: { type: 'string' } }, time_window: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Trend sentiment',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields, topic: { type: 'string' }, time_window: { type: 'string' },
                      trend: { type: 'object', properties: { direction: { type: 'string', enum: ['improving', 'declining', 'stable', 'volatile'] }, current_score: { type: 'number' }, previous_score: { type: 'number' }, change_pct: { type: 'number' }, data_points: { type: 'array', items: { type: 'object', properties: { date: { type: 'string', format: 'date' }, score: { type: 'number' }, label: sentimentLabel } } } } },
                      emotions: { type: 'object', properties: { joy: { type: 'number' }, anger: { type: 'number' }, sadness: { type: 'number' }, fear: { type: 'number' }, surprise: { type: 'number' }, disgust: { type: 'number' }, dominant: { type: 'string' } } },
                      inflection_points: { type: 'array', items: { type: 'object', properties: { date: { type: 'string', format: 'date' }, event: { type: 'string' }, impact: { type: 'string', enum: ['positive', 'negative'] } } } },
                      ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy,
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/batch': {
        post: {
          operationId: 'batchSentiment',
          summary: 'Batch analyze sentiment for multiple items (max 10)',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['items'], properties: { items: { type: 'array', items: { type: 'object', properties: { text: { type: 'string' }, context: { type: 'string' } }, required: ['text'] }, minItems: 1, maxItems: 10 } } } } } },
          responses: { '200': { description: 'Batch sentiment results', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, batch_count: { type: 'integer' }, results: { type: 'array', items: { type: 'object', properties: { text_snippet: { type: 'string' }, label: sentimentLabel, score: { type: 'number' }, success: { type: 'boolean' } } } }, ...chainFields } } } } } },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
