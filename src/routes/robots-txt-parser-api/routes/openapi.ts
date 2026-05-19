import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Robots TXT Parser API', version: '1.0.0', description: 'Parse and validate robots.txt files', 'x-agent-callable': true },
    servers: [{ url: 'https://orbis-apis.onrender.com/robots-txt-parser', description: 'Production' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/parse': { post: { operationId: 'parseRobots', summary: 'Parse a robots.txt file from URL or raw content', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'URL of robots.txt or raw robots.txt content' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Robots.txt parse result' } } } },
      '/validate': { post: { operationId: 'validateRobots', summary: 'Validate robots.txt syntax and SEO implications', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'URL of robots.txt or raw robots.txt content' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Robots.txt validation result' } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Validate input before calling intelligence endpoint', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result' } } } },
      '/robots-intelligence': { post: { operationId: 'robotsIntelligence', summary: 'Full robots.txt intelligence combining all sub-endpoints', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'URL or robots.txt content to fully analyze' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Complete robots.txt intelligence result' } } } }
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' } } }
  });
});
export default router;
