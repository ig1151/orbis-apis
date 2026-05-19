import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'SPF DKIM DMARC Checker API', version: '1.0.0', description: 'Validate SPF, DKIM, and DMARC email authentication records', 'x-agent-callable': true },
    servers: [{ url: 'https://orbis-apis.onrender.com/spf-dkim-dmarc-checker', description: 'Production' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/spf': { post: { operationId: 'checkSPF', summary: 'Validate SPF record for a domain', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'Domain name to check SPF record' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'SPF validation result' } } } },
      '/dkim': { post: { operationId: 'checkDKIM', summary: 'Validate DKIM record for a domain', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'Domain name to check DKIM record' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'DKIM validation result' } } } },
      '/dmarc': { post: { operationId: 'checkDMARC', summary: 'Validate DMARC record for a domain', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'Domain name to check DMARC record' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'DMARC validation result' } } } },
      '/check': { post: { operationId: 'checkAllEmailAuth', summary: 'Check SPF, DKIM, and DMARC in a single call', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'Domain name to fully check email authentication' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Complete email authentication result' } } } },
      '/batch': { post: { operationId: 'batchEmailAuthCheck', summary: 'Check email authentication for multiple domains', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['domains'], properties: { domains: { type: 'array', items: { type: 'string' }, description: 'Array of domain names' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Batch email authentication result' } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Validate input before calling check endpoint', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result' } } } }
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' } } }
  });
});
export default router;
