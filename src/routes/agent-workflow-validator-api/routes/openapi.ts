import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Agent Workflow Validator API', version: '1.0.0', description: 'Validate agent workflow definitions for correctness, loops, and safety constraints.' },
    servers: [{ url: 'https://orbis-apis.onrender.com/agent-workflow-validator' }],
    paths: {
      '/validate': { post: { summary: 'Validate agent workflow definition', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'Agent workflow definition as JSON or YAML' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Validation result' } } } },
      '/analyze': { post: { summary: 'Analyze workflow for safety and optimization', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Workflow analysis result' } } } },
      '/execution-gate': { post: { summary: 'Execution readiness gate', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Execution gate result' } } } },
      '/workflow-intelligence': { post: { summary: 'ONE-CALL: Full workflow validator intelligence', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Full intelligence result' } } } }
    }
  });
});
export default router;
