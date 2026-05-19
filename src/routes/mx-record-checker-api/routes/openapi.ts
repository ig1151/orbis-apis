import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'MX Record Checker API', version: '1.0.0', description: 'Check MX records for a domain', 'x-agent-callable': true },
    servers: [{ url: 'https://orbis-apis.onrender.com/mx-record-checker', description: 'Production' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/mx': { post: { operationId: 'getMXRecords', summary: 'Look up MX records for a domain', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'Domain name to look up MX records for' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'MX record lookup result' } } } },
      '/email-ready': { post: { operationId: 'checkEmailReady', summary: 'Check if a domain is ready to receive email', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'Domain name to check email readiness' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Email readiness result' } } } },
      '/batch': { post: { operationId: 'batchMXCheck', summary: 'Check MX records for multiple domains', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['domains'], properties: { domains: { type: 'array', items: { type: 'string' }, description: 'Array of domain names' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Batch MX check result' } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Validate input before calling email-ready endpoint', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result' } } } }
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' } } }
  });
});
export default router;
