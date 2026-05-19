import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'CTR Prediction API', version: '1.0.0', description: 'Predict and optimize click-through rate for search result snippets' },
    servers: [{ url: 'https://orbis-apis.onrender.com/ctr-prediction' }],
    paths: {
      '/predict': {
        post: {
          summary: 'Predict CTR for a title/description',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } },
          responses: { '200': { description: 'CTR prediction result' } },
        },
      },
      '/optimize': {
        post: {
          summary: 'Optimize title and description for higher CTR',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } },
          responses: { '200': { description: 'CTR optimization result' } },
        },
      },
      '/execution-gate': {
        post: {
          summary: 'Execution readiness gate',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } },
          responses: { '200': { description: 'Execution gate result' } },
        },
      },
      '/ctr-intelligence': {
        post: {
          summary: 'ONE-CALL: full CTR intelligence',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } },
          responses: { '200': { description: 'Full intelligence result' } },
        },
      },
    },
  });
});

export default router;
