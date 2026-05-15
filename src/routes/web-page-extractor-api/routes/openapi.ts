import { Router, Request, Response } from 'express';
const router = Router();
const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string' }, success: { type: 'boolean' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Web Page Extractor API',
      version: '1.0.0',
      description: 'Extract clean text, links, and metadata from any URL for ingestion into RAG pipelines, research agents, and content workflows.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': {
        free_tier: { requests_per_day: 100, requests_per_month: 3000 },
        pay_per_call: { 'extract-text': '$0.003', 'extract-links': '$0.002', 'extract-metadata': '$0.002', 'execution-gate': '$0.001', extract: '$0.006' },
      },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/web-page-extractor' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/extract-text': {
        post: {
          operationId: 'extractText',
          summary: 'Extract clean readable text — body, summary, word count, language',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['url'], properties: { url: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'Extracted text', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, url: { type: 'string' }, text: { type: 'object' }, content_type: { type: 'string' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing url' }, '500': { description: 'Failed' },
          },
        },
      },
      '/extract-links': {
        post: {
          operationId: 'extractLinks',
          summary: 'Extract all links — internal, external, social, downloads',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['url'], properties: { url: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'Extracted links', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, url: { type: 'string' }, links: { type: 'object' }, link_summary: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing url' }, '500': { description: 'Failed' },
          },
        },
      },
      '/extract-metadata': {
        post: {
          operationId: 'extractMetadata',
          summary: 'Extract metadata — title, description, author, OG tags, schema types',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['url'], properties: { url: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'Extracted metadata', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, url: { type: 'string' }, metadata: { type: 'object' }, seo_signals: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing url' }, '500': { description: 'Failed' },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Execution readiness check before page extraction workflow',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['url'], properties: { url: { type: 'string' }, objective: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, blocking_flags: actions, confidence_per_section: confidence, privacy } } } } },
          },
        },
      },
      '/extract': {
        post: {
          operationId: 'extract',
          summary: 'ONE-CALL: full page extraction — text + metadata + links + RAG-ready chunks',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['url'], properties: { url: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'Full page extraction', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, url: { type: 'string' }, text: { type: 'object' }, metadata: { type: 'object' }, links: { type: 'object' }, content_type: { type: 'string' }, rag_ready: { type: 'boolean' }, chunks: { type: 'array', items: { type: 'object' } }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing url' }, '500': { description: 'Failed' },
          },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
