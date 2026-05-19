import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'HTTP Header Inspector API', version: '1.0.0', description: 'Inspect HTTP response headers for security compliance', 'x-agent-callable': true },
    servers: [{ url: 'https://orbis-apis.onrender.com/http-header-inspector', description: 'Production' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/inspect': { post: { operationId: 'inspectHeaders', summary: 'Inspect HTTP response headers', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'URL or raw header string to inspect' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Header inspection result' } } } },
      '/security-audit': { post: { operationId: 'securityAudit', summary: 'Audit headers for security vulnerabilities', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'URL or raw header string to audit' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Security audit result' } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Validate input before calling intelligence endpoint', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result' } } } },
      '/header-intelligence': { post: { operationId: 'headerIntelligence', summary: 'Full header intelligence combining all sub-endpoints', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'URL or raw header string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Complete header intelligence result' } } } }
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' } } }
  });
});
export default router;
