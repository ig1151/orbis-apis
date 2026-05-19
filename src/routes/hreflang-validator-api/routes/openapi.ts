import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Hreflang Validator API',
      version: '1.0.0',
      description: 'Validate hreflang tags for international SEO correctness and completeness.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': {
        free_tier: { requests_per_day: 500 },
        pay_per_call: { validate: '$0.003', check: '$0.002', 'execution-gate': '$0.001', 'hreflang-intelligence': '$0.007' }
      }
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/hreflang-validator', description: 'Production' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/validate': {
        post: {
          operationId: 'validateHreflang',
          summary: 'Validate hreflang tags — detect missing return links, invalid codes, and x-default issues',
          tags: ['Core'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['input'],
                  properties: {
                    input: { type: 'string', description: 'URL to validate hreflang tags on', example: 'https://example.com/en/page' },
                    options: { type: 'object' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Hreflang validation result', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object' }, confidence: { type: 'object' }, provenance: { type: 'object' } } } } } },
            '400': { description: 'Bad request' },
            '500': { description: 'Server error' }
          }
        }
      },
      '/check': {
        post: {
          operationId: 'checkHreflang',
          summary: 'Quick hreflang presence and status check',
          tags: ['Core'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['input'],
                  properties: {
                    input: { type: 'string', description: 'URL to check' },
                    options: { type: 'object' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Hreflang check result', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object' }, confidence: { type: 'object' }, provenance: { type: 'object' } } } } } },
            '400': { description: 'Bad request' },
            '500': { description: 'Server error' }
          }
        }
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Execution readiness check — validate input and get next-step routing',
          tags: ['Execution'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['input'],
                  properties: {
                    input: { type: 'string' },
                    objective: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Execution gate result', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, next_endpoint: { type: 'string' } } } } } },
            '400': { description: 'Bad request' }
          }
        }
      },
      '/hreflang-intelligence': {
        post: {
          operationId: 'hreflangIntelligence',
          summary: 'ONE-CALL: validate + check + SEO impact in one request',
          tags: ['Intelligence'],
          'x-one-call': true,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['input'],
                  properties: {
                    input: { type: 'string', description: 'URL to analyze', example: 'https://example.com/en/page' },
                    options: { type: 'object' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Full hreflang intelligence', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object' }, confidence: { type: 'object' }, provenance: { type: 'object' } } } } } },
            '400': { description: 'Bad request' },
            '500': { description: 'Server error' }
          }
        }
      }
    },
    components: {
      securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } }
    }
  });
});
export default router;
