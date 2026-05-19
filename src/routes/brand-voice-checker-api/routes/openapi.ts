import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Brand Voice Checker API', version: '1.0.0', description: 'Check content consistency against brand voice guidelines' },
    paths: {
      '/check': { post: { summary: 'Check content for brand voice consistency', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Brand voice check completed' } } } },
      '/analyze': { post: { summary: 'Deep analyze brand voice dimensions', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Brand voice analyzed successfully' } } } },
      '/execution-gate': { post: { summary: 'Check execution readiness', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Execution gate response' } } } },
      '/brand-voice-intelligence': { post: { summary: 'Full brand voice intelligence (one-call)', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Full intelligence response' } } } },
    },
  });
});

export default router;
