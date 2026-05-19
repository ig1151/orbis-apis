import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Redirect Chain Analyzer API', version: '1.0.0', description: 'Trace and analyze HTTP redirect chains', 'x-agent-callable': true },
    servers: [{ url: 'https://orbis-apis.onrender.com/redirect-chain-analyzer', description: 'Production' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/analyze': { post: { operationId: 'analyzeRedirects', summary: 'Analyze redirect chain for a URL', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'URL to analyze for redirects' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Redirect analysis result' } } } },
      '/trace': { post: { operationId: 'traceRedirects', summary: 'Trace each hop in the redirect chain with latency', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'URL to trace' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Redirect trace result' } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Validate input before calling intelligence endpoint', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result' } } } },
      '/redirect-intelligence': { post: { operationId: 'redirectIntelligence', summary: 'Full redirect chain intelligence combining all sub-endpoints', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'URL to fully analyze' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Complete redirect intelligence result' } } } }
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' } } }
  });
});
export default router;
