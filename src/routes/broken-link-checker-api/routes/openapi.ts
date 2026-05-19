import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Broken Link Checker API', version: '1.0.0', description: 'Check URLs for broken links and 404s', 'x-agent-callable': true },
    servers: [{ url: 'https://orbis-apis.onrender.com/broken-link-checker', description: 'Production' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/check': { post: { operationId: 'checkLink', summary: 'Check a single URL for broken link status', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'URL to check' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Link check result' } } } },
      '/batch': { post: { operationId: 'batchCheckLinks', summary: 'Check multiple URLs for broken links', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['inputs'], properties: { inputs: { type: 'array', items: { type: 'string' }, description: 'Array of URLs to check' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Batch link check result' } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Validate input before calling intelligence endpoint', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result' } } } },
      '/link-intelligence': { post: { operationId: 'linkIntelligence', summary: 'Full broken link intelligence combining all sub-endpoints', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'URL to fully analyze' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Complete link intelligence result' } } } }
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' } } }
  });
});
export default router;
