import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Bullet Point Extractor API', version: '1.0.0', description: 'Extract key bullet points from long-form text or generate from topic' },
    paths: {
      '/extract': { post: { summary: 'Extract bullet points from text', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Bullet points extracted successfully' } } } },
      '/generate': { post: { summary: 'Generate bullet points from a topic', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Bullet points generated successfully' } } } },
      '/execution-gate': { post: { summary: 'Check execution readiness', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Execution gate response' } } } },
      '/bullet-intelligence': { post: { summary: 'Full bullet intelligence (one-call)', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Full intelligence response' } } } },
    },
  });
});

export default router;
