import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Domain Age API', version: '1.0.0', description: 'Look up domain age and registration date', 'x-agent-callable': true },
    servers: [{ url: 'https://orbis-apis.onrender.com/domain-age', description: 'Production' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/age': { get: { operationId: 'getDomainAge', summary: 'Get the age and registration date of a domain', parameters: [{ name: 'domain', in: 'query', required: true, schema: { type: 'string' }, description: 'Domain name to look up' }], responses: { '200': { description: 'Domain age result' } } } },
      '/whois-lite': { get: { operationId: 'getWhoisLite', summary: 'Get lite WHOIS information for a domain', parameters: [{ name: 'domain', in: 'query', required: true, schema: { type: 'string' }, description: 'Domain name to look up' }], responses: { '200': { description: 'WHOIS lite result' } } } },
      '/lookup': { post: { operationId: 'domainLookup', summary: 'Full domain age and WHOIS intelligence in one call', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'Domain name' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Complete domain lookup result' } } } },
      '/batch': { post: { operationId: 'batchDomainAge', summary: 'Batch domain age lookup for multiple domains', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['domains'], properties: { domains: { type: 'array', items: { type: 'string' }, description: 'Array of domain names' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Batch domain age result' } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Validate input before calling lookup endpoint', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result' } } } }
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' } } }
  });
});
export default router;
