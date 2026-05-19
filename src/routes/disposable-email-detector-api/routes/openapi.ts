import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Disposable Email Detector API', version: '1.0.0', description: 'Detect disposable and temporary email addresses' },
    paths: {
      '/detect': { post: { summary: 'Detect if an email is disposable', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Detection result returned' } } } },
      '/domain': { post: { summary: 'Check if a domain is a known disposable provider', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['domain'], properties: { domain: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Domain check result returned' } } } },
      '/batch': { post: { summary: 'Batch detect multiple emails', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['inputs'], properties: { inputs: { type: 'array', items: { type: 'string' } }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Batch detection completed' } } } },
      '/execution-gate': { post: { summary: 'Check execution readiness', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Execution gate response' } } } },
    },
  });
});

export default router;
