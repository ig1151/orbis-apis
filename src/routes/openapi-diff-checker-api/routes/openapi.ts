import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'OpenAPI Diff Checker API', version: '1.0.0', description: 'Compare two OpenAPI specs and detect breaking changes for CI/CD pipelines.' },
    servers: [{ url: 'https://orbis-apis.onrender.com/openapi-diff-checker' }],
    paths: {
      '/diff': { post: { summary: 'Diff two OpenAPI specs', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'Two OpenAPI specs to compare (JSON with old/new keys or URLs)' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Diff result' } } } },
      '/breaking-changes': { post: { summary: 'Detect breaking changes between specs', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Breaking changes result' } } } },
      '/execution-gate': { post: { summary: 'Execution readiness gate', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Execution gate result' } } } },
      '/diff-intelligence': { post: { summary: 'ONE-CALL: Full OpenAPI diff intelligence', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Full intelligence result' } } } }
    }
  });
});
export default router;
