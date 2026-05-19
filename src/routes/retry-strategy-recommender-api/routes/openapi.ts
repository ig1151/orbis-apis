import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Retry Strategy Recommender API', version: '1.0.0', description: 'Recommend optimal retry strategies for API calls with backoff and jitter.' },
    servers: [{ url: 'https://orbis-apis.onrender.com/retry-strategy-recommender' }],
    paths: {
      '/recommend': { post: { summary: 'Recommend a retry strategy', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'Error context, API name, or failure description' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Retry strategy recommendation' } } } },
      '/analyze': { post: { summary: 'Analyze failure patterns for retry optimization', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Failure pattern analysis result' } } } },
      '/execution-gate': { post: { summary: 'Execution readiness gate', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Execution gate result' } } } },
      '/retry-intelligence': { post: { summary: 'ONE-CALL: Full retry strategy intelligence', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Full intelligence result' } } } }
    }
  });
});
export default router;
