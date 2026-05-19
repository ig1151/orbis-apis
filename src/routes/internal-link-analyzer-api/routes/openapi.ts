import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Internal Link Analyzer API',
      version: '1.0.0',
      description: 'Analyze internal link structure of a webpage for SEO and link equity distribution.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': {
        free_tier: { requests_per_day: 500 },
        pay_per_call: { analyze: '$0.003', audit: '$0.003', 'execution-gate': '$0.001', 'link-intelligence': '$0.007' }
      }
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/internal-link-analyzer', description: 'Production' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/analyze': {
        post: {
          operationId: 'analyzeInternalLinks',
          summary: 'Analyze internal link structure, anchor text, and link equity',
          tags: ['Core'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['input'],
                  properties: {
                    input: { type: 'string', description: 'URL to analyze internal links on', example: 'https://example.com/page' },
                    options: { type: 'object' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Internal link analysis', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object' }, confidence: { type: 'object' }, provenance: { type: 'object' } } } } } },
            '400': { description: 'Bad request' },
            '500': { description: 'Server error' }
          }
        }
      },
      '/audit': {
        post: {
          operationId: 'auditInternalLinks',
          summary: 'Audit internal links for issues — broken links, redirect chains, nofollow overuse',
          tags: ['Core'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['input'],
                  properties: {
                    input: { type: 'string', description: 'URL to audit' },
                    options: { type: 'object' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Internal link audit result', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object' }, confidence: { type: 'object' }, provenance: { type: 'object' } } } } } },
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
      '/link-intelligence': {
        post: {
          operationId: 'linkIntelligence',
          summary: 'ONE-CALL: analyze + audit + SEO recommendations in one request',
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
                    input: { type: 'string', description: 'URL', example: 'https://example.com/page' },
                    options: { type: 'object' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Full internal link intelligence', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object' }, confidence: { type: 'object' }, provenance: { type: 'object' } } } } } },
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
