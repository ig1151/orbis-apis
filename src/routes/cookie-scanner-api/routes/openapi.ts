import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Cookie Scanner API', version: '1.0.0', description: 'Scan and classify cookies for GDPR/CCPA compliance', 'x-agent-callable': true },
    servers: [{ url: 'https://orbis-apis.onrender.com/cookie-scanner', description: 'Production' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/scan': { post: { operationId: 'scanCookies', summary: 'Scan and classify cookies from a URL or cookie string', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'URL or raw cookie header string to scan' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Cookie scan result' } } } },
      '/compliance-check': { post: { operationId: 'complianceCheck', summary: 'Check cookies for GDPR/CCPA compliance', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'URL or raw cookie header string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Compliance check result' } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Validate input before calling intelligence endpoint', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result' } } } },
      '/cookie-intelligence': { post: { operationId: 'cookieIntelligence', summary: 'Full cookie intelligence combining all sub-endpoints', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'URL or raw cookie header string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Complete cookie intelligence result' } } } }
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' } } }
  });
});
export default router;
