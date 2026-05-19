import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Domain Availability API', version: '1.0.0', description: 'Check domain name availability across TLDs', 'x-agent-callable': true },
    servers: [{ url: 'https://orbis-apis.onrender.com/domain-availability', description: 'Production' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/check': { post: { operationId: 'checkDomainAvailability', summary: 'Check if a domain name is available for registration', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'Domain name to check (e.g. example.com)' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Domain availability result' } } } },
      '/suggest': { post: { operationId: 'suggestDomains', summary: 'Suggest available domain name alternatives', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'Base name or taken domain to get suggestions for' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Domain suggestions result' } } } },
      '/batch': { post: { operationId: 'batchCheckDomains', summary: 'Check availability of multiple domains at once', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['domains'], properties: { domains: { type: 'array', items: { type: 'string' }, description: 'Array of domain names to check' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Batch availability result' } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Validate input before calling check endpoint', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result' } } } }
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' } } }
  });
});
export default router;
