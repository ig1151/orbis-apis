import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Orchestration Dependency Mapper API', version: '1.0.0', description: 'Map API orchestration dependencies and execution chains for agent pipelines.' },
    servers: [{ url: 'https://orbis-apis.onrender.com/orchestration-dependency-mapper' }],
    paths: {
      '/map': { post: { summary: 'Map orchestration dependencies and execution chains', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'Pipeline definition, workflow JSON, or service list' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Dependency map result' } } } },
      '/analyze': { post: { summary: 'Analyze dependencies for bottlenecks and failure points', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Dependency analysis result' } } } },
      '/execution-gate': { post: { summary: 'Execution readiness gate', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Execution gate result' } } } },
      '/orchestration-intelligence': { post: { summary: 'ONE-CALL: Full orchestration dependency intelligence', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Full intelligence result' } } } }
    }
  });
});
export default router;
