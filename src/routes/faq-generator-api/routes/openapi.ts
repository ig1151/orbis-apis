import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'FAQ Generator API', version: '1.0.0', description: 'Generate FAQ questions and answers from content' },
    paths: {
      '/generate': { post: { summary: 'Generate FAQs from content or topic', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'FAQs generated successfully' } } } },
      '/expand': { post: { summary: 'Expand a FAQ answer with detail', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'FAQ expanded successfully' } } } },
      '/execution-gate': { post: { summary: 'Check execution readiness', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Execution gate response' } } } },
      '/faq-intelligence': { post: { summary: 'Full FAQ intelligence (one-call)', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Full intelligence response' } } } },
    },
  });
});

export default router;
