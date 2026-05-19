import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Rate Limit Estimator API', version: '1.0.0', description: 'Estimate safe API call rate limits based on observed patterns and response headers.' },
    servers: [{ url: 'https://orbis-apis.onrender.com/rate-limit-estimator' }],
    paths: {
      '/estimate': { post: { summary: 'Estimate rate limits from headers or patterns', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'API headers, response, or rate limit context' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Rate limit estimate result' } } } },
      '/analyze': { post: { summary: 'Analyze rate limit violations and efficiency', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Rate limit analysis result' } } } },
      '/execution-gate': { post: { summary: 'Execution readiness gate', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Execution gate result' } } } },
      '/rate-limit-intelligence': { post: { summary: 'ONE-CALL: Full rate limit intelligence', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Full intelligence result' } } } }
    }
  });
});
export default router;
