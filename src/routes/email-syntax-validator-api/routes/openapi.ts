import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Email Syntax Validator API', version: '1.0.0', description: 'Validate email address syntax, format, and structure' },
    paths: {
      '/validate': { post: { summary: 'Validate a single email address', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Email validated successfully' } } } },
      '/batch': { post: { summary: 'Batch validate multiple email addresses', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['inputs'], properties: { inputs: { type: 'array', items: { type: 'string' } }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Batch validation completed' } } } },
      '/execution-gate': { post: { summary: 'Check execution readiness', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Execution gate response' } } } },
      '/email-syntax-intelligence': { post: { summary: 'Full email syntax intelligence (one-call)', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Full intelligence response' } } } },
    },
  });
});

export default router;
