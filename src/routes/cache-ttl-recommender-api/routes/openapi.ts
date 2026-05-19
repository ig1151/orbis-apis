import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Cache TTL Recommender API', version: '1.0.0', description: 'Recommend optimal cache TTL values for API responses based on content type and volatility.' },
    servers: [{ url: 'https://orbis-apis.onrender.com/cache-ttl-recommender' }],
    paths: {
      '/recommend': { post: { summary: 'Recommend cache TTL for an API endpoint or resource', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'API endpoint, response type, or content description' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Cache TTL recommendation' } } } },
      '/analyze': { post: { summary: 'Analyze cache efficiency and suggest improvements', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Cache analysis result' } } } },
      '/execution-gate': { post: { summary: 'Execution readiness gate', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Execution gate result' } } } },
      '/cache-ttl-intelligence': { post: { summary: 'ONE-CALL: Full cache TTL intelligence', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Full intelligence result' } } } }
    }
  });
});
export default router;
