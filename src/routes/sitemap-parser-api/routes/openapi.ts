import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Sitemap Parser API',
      version: '1.0.0',
      description: 'Parse and validate XML sitemaps for SEO and crawl intelligence.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': {
        free_tier: { requests_per_day: 500 },
        pay_per_call: { parse: '$0.003', validate: '$0.002', 'execution-gate': '$0.001', 'sitemap-intelligence': '$0.007' }
      }
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/sitemap-parser', description: 'Production' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/parse': {
        post: {
          operationId: 'parseSitemap',
          summary: 'Parse a sitemap URL and extract all URLs with metadata',
          tags: ['Core'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['input'],
                  properties: {
                    input: { type: 'string', description: 'Sitemap URL to parse', example: 'https://example.com/sitemap.xml' },
                    options: { type: 'object' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Parsed sitemap data', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object' }, confidence: { type: 'object' }, provenance: { type: 'object' } } } } } },
            '400': { description: 'Bad request' },
            '500': { description: 'Server error' }
          }
        }
      },
      '/validate': {
        post: {
          operationId: 'validateSitemap',
          summary: 'Validate sitemap structure, schema, and encoding',
          tags: ['Core'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['input'],
                  properties: {
                    input: { type: 'string', description: 'Sitemap URL to validate', example: 'https://example.com/sitemap.xml' },
                    options: { type: 'object' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Sitemap validation result', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object' }, confidence: { type: 'object' }, provenance: { type: 'object' } } } } } },
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
      '/sitemap-intelligence': {
        post: {
          operationId: 'sitemapIntelligence',
          summary: 'ONE-CALL: parse + validate + health score in one request',
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
                    input: { type: 'string', description: 'Sitemap URL', example: 'https://example.com/sitemap.xml' },
                    options: { type: 'object' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Full sitemap intelligence', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object' }, confidence: { type: 'object' }, provenance: { type: 'object' } } } } } },
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
