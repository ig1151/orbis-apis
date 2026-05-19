import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'FAQ Schema Validator API',
      version: '1.0.0',
      description: 'Validate FAQ Schema.org markup for Google rich snippets and structured data eligibility.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': {
        free_tier: { requests_per_day: 500 },
        pay_per_call: { validate: '$0.003', check: '$0.002', 'execution-gate': '$0.001', 'faq-schema-intelligence': '$0.007' }
      }
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/faq-schema-validator', description: 'Production' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/validate': {
        post: {
          operationId: 'validateFaqSchema',
          summary: 'Validate FAQ schema — questions, answers, rich result eligibility',
          tags: ['Core'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['input'],
                  properties: {
                    input: { type: 'string', description: 'URL to validate FAQ schema on', example: 'https://example.com/faq' },
                    options: { type: 'object' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'FAQ schema validation result', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object' }, confidence: { type: 'object' }, provenance: { type: 'object' } } } } } },
            '400': { description: 'Bad request' },
            '500': { description: 'Server error' }
          }
        }
      },
      '/check': {
        post: {
          operationId: 'checkFaqSchema',
          summary: 'Quick FAQ schema presence and status check',
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
            '200': { description: 'FAQ schema check result', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object' }, confidence: { type: 'object' }, provenance: { type: 'object' } } } } } },
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
      '/faq-schema-intelligence': {
        post: {
          operationId: 'faqSchemaIntelligence',
          summary: 'ONE-CALL: validate + check + rich snippet potential in one request',
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
                    input: { type: 'string', description: 'URL', example: 'https://example.com/faq' },
                    options: { type: 'object' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Full FAQ schema intelligence', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object' }, confidence: { type: 'object' }, provenance: { type: 'object' } } } } } },
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
