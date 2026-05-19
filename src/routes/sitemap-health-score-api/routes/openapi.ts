import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Sitemap Health Score API', version: '1.0.0', description: 'Score sitemap health, URL coverage, indexability, and freshness' },
    servers: [{ url: 'https://orbis-apis.onrender.com/sitemap-health-score' }],
    paths: {
      '/score': {
        post: {
          summary: 'Score sitemap health',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } },
          responses: { '200': { description: 'Sitemap health score' } },
        },
      },
      '/analyze': {
        post: {
          summary: 'Analyze sitemap structure and coverage',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } },
          responses: { '200': { description: 'Sitemap analysis result' } },
        },
      },
      '/execution-gate': {
        post: {
          summary: 'Execution readiness gate',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } },
          responses: { '200': { description: 'Execution gate result' } },
        },
      },
      '/sitemap-health-intelligence': {
        post: {
          summary: 'ONE-CALL: full sitemap health intelligence',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } },
          responses: { '200': { description: 'Full intelligence result' } },
        },
      },
    },
  });
});

export default router;
