import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Meeting Invite Parser API', version: '2.0.0', description: 'Parse meeting invite emails to extract time, attendees, location, agenda.', 'x-agent-callable': true, 'x-mcp-compatible': true },
    servers: [{ url: 'https://orbis-apis.onrender.com/meeting-invite-parser', description: 'Production' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/parse': { post: { operationId: 'parse_invite', summary: 'Parse a meeting invite email', tags: ['Intelligence'], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', example: 'Meeting: Q3 Planning\nWhen: Monday 10am EST\nZoom: https://zoom.us/j/123456' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Meeting parsed', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } }, '400': { $ref: '#/components/responses/BadRequest' }, '500': { $ref: '#/components/responses/ServerError' } } } },
      '/extract': { post: { operationId: 'extract_invite', summary: 'Extract raw fields from invite or calendar data', tags: ['Intelligence'], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Extraction result', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } }, '400': { $ref: '#/components/responses/BadRequest' }, '500': { $ref: '#/components/responses/ServerError' } } } },
      '/execution-gate': { post: { operationId: 'execution_gate', summary: 'Execution readiness check', tags: ['Execution'], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } }, '400': { $ref: '#/components/responses/BadRequest' } } } },
      '/meeting-intelligence': { post: { operationId: 'meeting_intelligence', summary: 'ONE-CALL: full meeting invite intelligence', tags: ['Intelligence'], 'x-one-call': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Full intelligence', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } }, '400': { $ref: '#/components/responses/BadRequest' }, '500': { $ref: '#/components/responses/ServerError' } } } },
    },
    components: {
      securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } },
      schemas: { StandardResponse: { type: 'object', properties: { success: { type: 'boolean' }, request_id: { type: 'string', format: 'uuid' }, data: { type: 'object' }, confidence: { type: 'object' }, provenance: { type: 'object' }, cache: { type: 'object' }, recommended_next_api: { type: 'array' }, recommended_actions_priority_order: { type: 'array' }, execution_metadata: { type: 'object' } } }, Error: { type: 'object', properties: { error: { type: 'string' }, code: { type: 'string' }, retryable: { type: 'boolean' } } } },
      responses: { BadRequest: { description: 'Bad request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }, ServerError: { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } } },
    },
  });
});
export default router;
