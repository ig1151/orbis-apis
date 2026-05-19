import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Email Reputation API', version: '1.0.0', description: 'Score email address reputation and blacklist status' },
    paths: {
      '/score': { post: { summary: 'Score email reputation', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Reputation score returned' } } } },
      '/blacklist-check': { post: { summary: 'Check email against blacklists', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Blacklist check completed' } } } },
      '/batch': { post: { summary: 'Batch score multiple emails', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['inputs'], properties: { inputs: { type: 'array', items: { type: 'string' } }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Batch scoring completed' } } } },
      '/execution-gate': { post: { summary: 'Check execution readiness', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Execution gate response' } } } },
    },
  });
});

export default router;
