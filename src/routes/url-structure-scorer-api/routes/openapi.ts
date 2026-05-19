import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'URL Structure Scorer API', version: '1.0.0', description: 'Score URL structure for SEO best practices (length, keywords, hyphens, depth)' },
    servers: [{ url: 'https://orbis-apis.onrender.com/url-structure-scorer' }],
    paths: {
      '/score': {
        post: {
          summary: 'Score URL structure for SEO',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } },
          responses: { '200': { description: 'URL structure score result' } },
        },
      },
      '/analyze': {
        post: {
          summary: 'Analyze URL components and issues',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } },
          responses: { '200': { description: 'URL analysis result' } },
        },
      },
      '/execution-gate': {
        post: {
          summary: 'Execution readiness gate',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } },
          responses: { '200': { description: 'Execution gate result' } },
        },
      },
      '/url-structure-intelligence': {
        post: {
          summary: 'ONE-CALL: full URL structure intelligence',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } },
          responses: { '200': { description: 'Full intelligence result' } },
        },
      },
    },
  });
});

export default router;
