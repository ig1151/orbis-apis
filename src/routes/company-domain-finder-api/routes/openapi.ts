import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Company Domain Finder API', version: '2.0.0', description: 'Find and verify company domains from company names.', 'x-agent-callable': true, 'x-mcp-compatible': true },
    servers: [{ url: 'https://orbis-apis.onrender.com/company-domain-finder', description: 'Production' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/find-domain': { post: { operationId: 'find_domain', summary: 'Find primary domain for a company name', tags: ['Intelligence'], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', example: 'Acme Corporation' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Domain found', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } }, '400': { $ref: '#/components/responses/BadRequest' }, '500': { $ref: '#/components/responses/ServerError' } } } },
      '/verify-domain': { post: { operationId: 'verify_domain', summary: 'Verify a domain belongs to a given company', tags: ['Intelligence'], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', example: 'acme.com' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Verification result', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } }, '400': { $ref: '#/components/responses/BadRequest' }, '500': { $ref: '#/components/responses/ServerError' } } } },
      '/batch': { post: { operationId: 'batch_find', summary: 'Batch company domain lookup', tags: ['Intelligence'], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['companies'], properties: { companies: { type: 'array', items: { type: 'string' }, maxItems: 20, example: ['Acme Corp', 'Globex Inc'] }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Batch results', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } }, '400': { $ref: '#/components/responses/BadRequest' }, '500': { $ref: '#/components/responses/ServerError' } } } },
      '/execution-gate': { post: { operationId: 'execution_gate', summary: 'Execution readiness check', tags: ['Execution'], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } }, '400': { $ref: '#/components/responses/BadRequest' } } } },
    },
    components: {
      securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } },
      schemas: { StandardResponse: { type: 'object', properties: { success: { type: 'boolean' }, request_id: { type: 'string', format: 'uuid' }, data: { type: 'object' }, confidence: { type: 'object' }, provenance: { type: 'object' }, cache: { type: 'object' }, recommended_next_api: { type: 'array' }, recommended_actions_priority_order: { type: 'array' }, execution_metadata: { type: 'object' } } }, Error: { type: 'object', properties: { error: { type: 'string' }, code: { type: 'string' }, retryable: { type: 'boolean' } } } },
      responses: { BadRequest: { description: 'Bad request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }, ServerError: { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } } },
    },
  });
});
export default router;
