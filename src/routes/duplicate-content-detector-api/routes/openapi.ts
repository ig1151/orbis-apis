import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Duplicate Content Detector API', version: '1.0.0', description: 'Detect duplicate or near-duplicate content between URLs' },
    servers: [{ url: 'https://orbis-apis.onrender.com/duplicate-content-detector' }],
    paths: {
      '/detect': {
        post: {
          summary: 'Detect duplicate content for a URL',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } },
          responses: { '200': { description: 'Duplicate detection result' } },
        },
      },
      '/compare': {
        post: {
          summary: 'Compare two URLs for content similarity',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } },
          responses: { '200': { description: 'Content comparison result' } },
        },
      },
      '/execution-gate': {
        post: {
          summary: 'Execution readiness gate',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } },
          responses: { '200': { description: 'Execution gate result' } },
        },
      },
      '/duplicate-intelligence': {
        post: {
          summary: 'ONE-CALL: full duplicate content intelligence',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } },
          responses: { '200': { description: 'Full intelligence result' } },
        },
      },
    },
  });
});

export default router;
