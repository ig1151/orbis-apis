import { Router, Request, Response } from 'express';
const router = Router();
const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string' }, success: { type: 'boolean' } };
const articleSchema = {
  type: 'object', properties: {
    title: { type: 'string' }, source: { type: 'string' }, published_at: { type: 'string' },
    url: { type: 'string' }, summary: { type: 'string' }, sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
  },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'News Search API',
      version: '1.0.0',
      description: 'Search latest news, filter by topic or company, and surface signals for market, competitive, and risk intelligence workflows.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': {
        free_tier: { requests_per_day: 100, requests_per_month: 3000 },
        pay_per_call: { latest: '$0.002', 'by-topic': '$0.003', 'by-company': '$0.003', 'execution-gate': '$0.001', search: '$0.006' },
      },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/news-search' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/latest': {
        post: {
          operationId: 'latestNews',
          summary: 'Latest top news articles with sentiment classification',
          requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { limit: { type: 'integer', default: 10 } } } } } },
          responses: {
            '200': { description: 'Latest news', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, articles: { type: 'array', items: articleSchema }, total: { type: 'number' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '500': { description: 'Failed' },
          },
        },
      },
      '/by-topic': {
        post: {
          operationId: 'newsByTopic',
          summary: 'Search news by topic with sentiment trend analysis',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['topic'], properties: { topic: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'Topic news', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, topic: { type: 'string' }, articles: { type: 'array', items: articleSchema }, topic_sentiment_trend: { type: 'string' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing topic' }, '500': { description: 'Failed' },
          },
        },
      },
      '/by-company': {
        post: {
          operationId: 'newsByCompany',
          summary: 'Company news — sentiment, key themes, risk signals',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['company'], properties: { company: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'Company news', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, company: { type: 'string' }, articles: { type: 'array', items: articleSchema }, company_news_summary: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing company' }, '500': { description: 'Failed' },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Execution readiness check before news search workflow',
          requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { query: { type: 'string' }, topic: { type: 'string' }, company: { type: 'string' }, objective: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, blocking_flags: actions, confidence_per_section: confidence, privacy } } } } },
          },
        },
      },
      '/search': {
        post: {
          operationId: 'search',
          summary: 'ONE-CALL: full news intelligence — articles + sentiment + themes + risk signals',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['query'], properties: { query: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'Full news intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, query: { type: 'string' }, articles: { type: 'array', items: articleSchema }, search_intelligence: { type: 'object' }, source_diversity_score: { type: 'number' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing query' }, '500': { description: 'Failed' },
          },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
