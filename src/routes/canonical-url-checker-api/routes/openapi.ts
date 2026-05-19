import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Canonical URL Checker API', version: '1.0.0', description: 'Check canonical URL tags for SEO correctness', 'x-agent-callable': true },
    servers: [{ url: 'https://orbis-apis.onrender.com/canonical-url-checker', description: 'Production' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/check': { post: { operationId: 'checkCanonical', summary: 'Check canonical URL tag for a page', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'URL of the page to check' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Canonical check result' } } } },
      '/validate': { post: { operationId: 'validateCanonical', summary: 'Validate canonical URL for SEO correctness', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'URL or canonical tag value to validate' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Canonical validation result' } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Validate input before calling intelligence endpoint', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result' } } } },
      '/canonical-intelligence': { post: { operationId: 'canonicalIntelligence', summary: 'Full canonical URL intelligence combining all sub-endpoints', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'URL to fully analyze' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Complete canonical intelligence result' } } } }
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' } } }
  });
});
export default router;
