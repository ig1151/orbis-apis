import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Wallet Address Risk API', version: '2.0.0', description: 'Check blockchain wallet address risk and exposure to illicit activity.', 'x-agent-callable': true, 'x-mcp-compatible': true },
    servers: [{ url: 'https://orbis-apis.onrender.com/wallet-address-risk', description: 'Production' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/check': { post: { operationId: 'check_wallet', summary: 'Quick risk check for a wallet address', tags: ['Intelligence'], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', example: '1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf Na' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Wallet risk check', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } }, '400': { $ref: '#/components/responses/BadRequest' }, '500': { $ref: '#/components/responses/ServerError' } } } },
      '/analyze': { post: { operationId: 'analyze_wallet', summary: 'Deep wallet address analysis with cluster and exposure', tags: ['Intelligence'], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Analysis result', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } }, '400': { $ref: '#/components/responses/BadRequest' }, '500': { $ref: '#/components/responses/ServerError' } } } },
      '/execution-gate': { post: { operationId: 'execution_gate', summary: 'Execution readiness check', tags: ['Execution'], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } }, '400': { $ref: '#/components/responses/BadRequest' } } } },
      '/wallet-risk-intelligence': { post: { operationId: 'wallet_risk_intelligence', summary: 'ONE-CALL: full wallet risk intelligence', tags: ['Intelligence'], 'x-one-call': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Full intelligence', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } }, '400': { $ref: '#/components/responses/BadRequest' }, '500': { $ref: '#/components/responses/ServerError' } } } },
    },
    components: {
      securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } },
      schemas: { StandardResponse: { type: 'object', properties: { success: { type: 'boolean' }, request_id: { type: 'string', format: 'uuid' }, data: { type: 'object' }, confidence: { type: 'object' }, provenance: { type: 'object' }, cache: { type: 'object' }, recommended_next_api: { type: 'array' }, recommended_actions_priority_order: { type: 'array' }, execution_metadata: { type: 'object' } } }, Error: { type: 'object', properties: { error: { type: 'string' }, code: { type: 'string' }, retryable: { type: 'boolean' } } } },
      responses: { BadRequest: { description: 'Bad request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }, ServerError: { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } } },
    },
  });
});
export default router;
