import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'API Schema Validator', version: '1.0.0', description: 'Validate OpenAPI 3.x and JSON Schema documents for correctness and best practices.' },
    servers: [{ url: 'https://orbis-apis.onrender.com/api-schema-validator' }],
    paths: {
      '/validate': { post: { summary: 'Validate an OpenAPI or JSON Schema document', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'OpenAPI or JSON Schema document as string or URL' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Validation result' } } } },
      '/lint': { post: { summary: 'Lint schema for style and best practices', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Lint result' } } } },
      '/execution-gate': { post: { summary: 'Execution readiness gate', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Execution gate result' } } } },
      '/schema-validator-intelligence': { post: { summary: 'ONE-CALL: Full schema validator intelligence', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Full intelligence result' } } } }
    }
  });
});
export default router;
