import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'CSP Analyzer API', version: '1.0.0', description: 'Analyze Content Security Policy headers', 'x-agent-callable': true },
    servers: [{ url: 'https://orbis-apis.onrender.com/csp-analyzer', description: 'Production' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/analyze': { post: { operationId: 'analyzeCSP', summary: 'Analyze a Content Security Policy header', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'CSP header string or URL' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'CSP analysis result' } } } },
      '/validate': { post: { operationId: 'validateCSP', summary: 'Validate CSP syntax and check for bypass risks', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'CSP header string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'CSP validation result' } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Validate input before calling intelligence endpoint', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result' } } } },
      '/csp-intelligence': { post: { operationId: 'cspIntelligence', summary: 'Full CSP intelligence combining all sub-endpoints', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'CSP header string or URL' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Complete CSP intelligence result' } } } }
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' } } }
  });
});
export default router;
