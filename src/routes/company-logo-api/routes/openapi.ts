import { Router } from 'express';
const router = Router();

const errorSchema = { type: 'object', properties: { error: { type: 'string' }, details: { type: 'string' } } };
const successSchema = { type: 'object', properties: { success: { type: 'boolean' }, confidence_score: { type: 'number' }, analyzed_at: { type: 'string', format: 'date-time' } } };
const commonErrors = {
  400: { description: 'Bad Request', content: { 'application/json': { schema: errorSchema } } },
  401: { description: 'Unauthorized', content: { 'application/json': { schema: errorSchema } } },
  429: { description: 'Rate limit exceeded', content: { 'application/json': { schema: errorSchema } } },
  500: { description: 'Server error', content: { 'application/json': { schema: errorSchema } } },
};

router.get('/', (_req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Agent company-logo API',
      version: '1.0.0',
      description: 'Fetch company logos, favicons, and brand assets by domain or company name',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-monetization-grade': 'A',
      'x-pricing': {
        '/analyze': 0.004,
        '/analyze-company-logo': 0.008,
        '/execution-gate': 0.004,
      },
      'x-rate-limits': { free: '100 req/day', builder: '50000 req/day', execution: '250000 req/day' },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/company-logo', description: 'Production' }],
    components: {
      securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' } },
      schemas: { Error: errorSchema },
    },
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/analyze': {
        post: {
          summary: 'Analyze input and return structured intelligence',
          tags: ['Intelligence'],
          'x-agent-callable': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { input: { type: 'string' }, context: { type: 'string' } }, required: ['input'] }, examples: { basic: { value: { input: 'sample input here', context: 'optional context' } } } } } },
          responses: { 200: { description: 'Structured analysis result', content: { 'application/json': { schema: { type: 'object', properties: { endpoint: { type: 'string' }, data: { type: 'object' }, latency_ms: { type: 'number' }, timestamp: { type: 'string' } } } } } }, ...commonErrors },
        },
      },
      '/analyze-company-logo': {
        post: {
          summary: 'ONE-CALL: Complete company-logo intelligence workflow',
          description: 'Combines analysis, scoring, and execution gating into a single request.',
          tags: ['Intelligence', 'Execution'],
          'x-agent-callable': true,
          'x-one-call-workflow': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { input: { type: 'string' }, context: { type: 'string' } }, required: ['input'] }, examples: { basic: { value: { input: 'sample input here', context: 'optional goal context' } } } } } },
          responses: {
            200: {
              description: 'Complete intelligence result with execution gate',
              content: { 'application/json': { schema: { type: 'object', properties: { endpoint: { type: 'string' }, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, next_endpoint: { type: 'string' }, data: { type: 'object', properties: { summary: { type: 'string' }, confidence: { type: 'number', minimum: 0, maximum: 1 }, risk_level: { type: 'string', enum: ['high', 'medium', 'low'] }, key_findings: { type: 'array', items: { type: 'string' } }, recommended_action: { type: 'string' }, execute: { type: 'boolean' }, blocking_flags: { type: 'array', items: { type: 'string' } } } }, metadata: { type: 'object', properties: { latency_ms: { type: 'number' }, estimated_cost: { type: 'number' }, timestamp: { type: 'string' } } } } } } },
            },
            ...commonErrors,
          },
        },
      },
      '/execution-gate': {
        post: {
          summary: 'Gate autonomous agent actions',
          tags: ['Execution'],
          'x-agent-callable': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { input: { type: 'string' }, context: { type: 'string' } }, required: ['input'] } } } },
          responses: {
            200: {
              description: 'execution_ready, next_api, blocking_flags, confidence, metadata',
              content: { 'application/json': { schema: { type: 'object', properties: { endpoint: { type: 'string' }, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, next_endpoint: { type: 'string' }, data: { type: 'object', properties: { execute: { type: 'boolean' }, confidence: { type: 'number' }, risk_level: { type: 'string', enum: ['high', 'medium', 'low'] }, blocking_flags: { type: 'array', items: { type: 'string' } }, recommended_action: { type: 'string' } } }, metadata: { type: 'object', properties: { latency_ms: { type: 'number' }, estimated_cost: { type: 'number' }, timestamp: { type: 'string' } } } } } } },
            },
            ...commonErrors,
          },
        },
      },
    },
  });
});

export default router;
