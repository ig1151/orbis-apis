import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Webhook Payload Inspector API', version: '1.0.0', description: 'Inspect and validate webhook payload structure, signatures, and delivery.' },
    servers: [{ url: 'https://orbis-apis.onrender.com/webhook-payload-inspector' }],
    paths: {
      '/inspect': { post: { summary: 'Inspect webhook payload structure', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'Webhook payload as JSON string or raw body' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Inspection result' } } } },
      '/validate': { post: { summary: 'Validate webhook signature and schema', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Validation result' } } } },
      '/execution-gate': { post: { summary: 'Execution readiness gate', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Execution gate result' } } } },
      '/webhook-intelligence': { post: { summary: 'ONE-CALL: Full webhook payload intelligence', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Full intelligence result' } } } }
    }
  });
});
export default router;
