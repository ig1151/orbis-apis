import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Website Tech Stack Detector API',
      version: '1.0.0',
      description: 'Detect website technology stack, frameworks, CMS, analytics, and infrastructure.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': {
        free_tier: { requests_per_day: 500 },
        pay_per_call: { detect: '$0.003', analyze: '$0.003', 'execution-gate': '$0.001', 'tech-stack-intelligence': '$0.007' }
      }
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/website-tech-stack-detector', description: 'Production' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/detect': {
        post: {
          operationId: 'detectTechStack',
          summary: 'Detect all technologies used by a website',
          tags: ['Core'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['input'],
                  properties: {
                    input: { type: 'string', description: 'Website URL or domain', example: 'https://example.com' },
                    options: { type: 'object' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Detected technologies', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object' }, confidence: { type: 'object' }, provenance: { type: 'object' } } } } } },
            '400': { description: 'Bad request' },
            '500': { description: 'Server error' }
          }
        }
      },
      '/analyze': {
        post: {
          operationId: 'analyzeTechStack',
          summary: 'Analyze tech stack maturity, security posture, and compatibility',
          tags: ['Core'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['input'],
                  properties: {
                    input: { type: 'string', description: 'Website URL or domain' },
                    options: { type: 'object' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Tech stack analysis', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object' }, confidence: { type: 'object' }, provenance: { type: 'object' } } } } } },
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
      '/tech-stack-intelligence': {
        post: {
          operationId: 'techStackIntelligence',
          summary: 'ONE-CALL: detect + analyze + insights in one request',
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
                    input: { type: 'string', description: 'Website URL or domain', example: 'https://example.com' },
                    options: { type: 'object' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Full tech stack intelligence', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object' }, confidence: { type: 'object' }, provenance: { type: 'object' } } } } } },
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
