import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Contact Card Extractor API', version: '2.0.0', description: 'Extract structured contact data from email signatures or vCards.', 'x-agent-callable': true, 'x-mcp-compatible': true },
    servers: [{ url: 'https://orbis-apis.onrender.com/contact-card-extractor', description: 'Production' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/extract': { post: { operationId: 'extract_contact', summary: 'Extract structured contact from signature or vCard', tags: ['Intelligence'], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', example: 'John Doe\nCTO, Acme Corp\njohn@acme.com\n+1 555-0100' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Contact extracted', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } }, '400': { $ref: '#/components/responses/BadRequest' }, '500': { $ref: '#/components/responses/ServerError' } } } },
      '/parse': { post: { operationId: 'parse_contact', summary: 'Parse and normalize contact data', tags: ['Intelligence'], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Parse result', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } }, '400': { $ref: '#/components/responses/BadRequest' }, '500': { $ref: '#/components/responses/ServerError' } } } },
      '/execution-gate': { post: { operationId: 'execution_gate', summary: 'Execution readiness check', tags: ['Execution'], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } }, '400': { $ref: '#/components/responses/BadRequest' } } } },
      '/contact-intelligence': { post: { operationId: 'contact_intelligence', summary: 'ONE-CALL: full contact extraction intelligence', tags: ['Intelligence'], 'x-one-call': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Full intelligence', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } }, '400': { $ref: '#/components/responses/BadRequest' }, '500': { $ref: '#/components/responses/ServerError' } } } },
    },
    components: {
      securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } },
      schemas: { StandardResponse: { type: 'object', properties: { success: { type: 'boolean' }, request_id: { type: 'string', format: 'uuid' }, data: { type: 'object' }, confidence: { type: 'object' }, provenance: { type: 'object' }, cache: { type: 'object' }, recommended_next_api: { type: 'array' }, recommended_actions_priority_order: { type: 'array' }, execution_metadata: { type: 'object' } } }, Error: { type: 'object', properties: { error: { type: 'string' }, code: { type: 'string' }, retryable: { type: 'boolean' } } } },
      responses: { BadRequest: { description: 'Bad request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }, ServerError: { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } } },
    },
  });
});
export default router;
