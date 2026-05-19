import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Toxicity Detection API', version: '1.0.0', description: 'Detect toxic, harmful, or offensive content' },
    servers: [{ url: 'https://orbis-apis.onrender.com/toxicity-detection' }],
    paths: {
      '/detect': {
        post: {
          summary: 'Detect toxicity in a single text',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } },
          responses: { '200': { description: 'Toxicity detection result' } },
        },
      },
      '/batch': {
        post: {
          summary: 'Batch detect toxicity across multiple texts',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['inputs'], properties: { inputs: { type: 'array', items: { type: 'string' } }, options: { type: 'object' } } } } } },
          responses: { '200': { description: 'Batch toxicity detection result' } },
        },
      },
      '/execution-gate': {
        post: {
          summary: 'Execution readiness gate',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } },
          responses: { '200': { description: 'Execution gate result' } },
        },
      },
      '/toxicity-intelligence': {
        post: {
          summary: 'ONE-CALL: full toxicity intelligence',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } },
          responses: { '200': { description: 'Full intelligence result' } },
        },
      },
    },
  });
});

export default router;
