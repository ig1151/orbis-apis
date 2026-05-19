import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Smart Contract Metadata API', version: '1.0.0', description: 'Fetch and analyze smart contract metadata from blockchain networks.' },
    servers: [{ url: 'https://orbis-apis.onrender.com/smart-contract-metadata' }],
    paths: {
      '/fetch': { post: { summary: 'Fetch contract metadata', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'Contract address or identifier' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Contract metadata fetched successfully' } } } },
      '/analyze': { post: { summary: 'Analyze contract metadata for risk flags', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Contract analysis complete' } } } },
      '/execution-gate': { post: { summary: 'Execution readiness gate', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Execution gate result' } } } },
      '/contract-metadata-intelligence': { post: { summary: 'ONE-CALL: Full smart contract metadata intelligence', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Full intelligence result' } } } }
    }
  });
});
export default router;
