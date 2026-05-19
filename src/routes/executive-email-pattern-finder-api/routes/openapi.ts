import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Executive Email Pattern Finder API', version: '2.0.0', description: 'Find executive email patterns from company domain.', 'x-agent-callable': true, 'x-mcp-compatible': true },
    servers: [{ url: 'https://orbis-apis.onrender.com/executive-email-pattern-finder', description: 'Production' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/find': { post: { operationId: 'find_pattern', summary: 'Find email patterns for a company domain', tags: ['Intelligence'], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', example: 'acme.com' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Pattern found', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } }, '400': { $ref: '#/components/responses/BadRequest' }, '500': { $ref: '#/components/responses/ServerError' } } } },
      '/verify': { post: { operationId: 'verify_email', summary: 'Verify an email address against detected pattern', tags: ['Intelligence'], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', example: 'john.doe@acme.com' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Verification result', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } }, '400': { $ref: '#/components/responses/BadRequest' }, '500': { $ref: '#/components/responses/ServerError' } } } },
      '/execution-gate': { post: { operationId: 'execution_gate', summary: 'Execution readiness check', tags: ['Execution'], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } }, '400': { $ref: '#/components/responses/BadRequest' } } } },
      '/email-pattern-intelligence': { post: { operationId: 'email_pattern_intelligence', summary: 'ONE-CALL: full email pattern intelligence', tags: ['Intelligence'], 'x-one-call': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Full intelligence', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } }, '400': { $ref: '#/components/responses/BadRequest' }, '500': { $ref: '#/components/responses/ServerError' } } } },
    },
    components: {
      securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } },
      schemas: { StandardResponse: { type: 'object', properties: { success: { type: 'boolean' }, request_id: { type: 'string', format: 'uuid' }, data: { type: 'object' }, confidence: { type: 'object' }, provenance: { type: 'object' }, cache: { type: 'object' }, recommended_next_api: { type: 'array' }, recommended_actions_priority_order: { type: 'array' }, execution_metadata: { type: 'object' } } }, Error: { type: 'object', properties: { error: { type: 'string' }, code: { type: 'string' }, retryable: { type: 'boolean' } } } },
      responses: { BadRequest: { description: 'Bad request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }, ServerError: { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } } },
    },
  });
});
export default router;
