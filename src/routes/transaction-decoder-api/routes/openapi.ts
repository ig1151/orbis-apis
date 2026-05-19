import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Transaction Decoder API', version: '1.0.0', description: 'Decode blockchain transaction data and function calls from EVM-compatible networks.' },
    servers: [{ url: 'https://orbis-apis.onrender.com/transaction-decoder' }],
    paths: {
      '/decode': { post: { summary: 'Decode transaction data', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'Transaction hash or raw transaction hex' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Decoded transaction result' } } } },
      '/analyze': { post: { summary: 'Analyze transaction for risk and MEV', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Transaction analysis result' } } } },
      '/execution-gate': { post: { summary: 'Execution readiness gate', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Execution gate result' } } } },
      '/transaction-intelligence': { post: { summary: 'ONE-CALL: Full transaction decoder intelligence', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Full intelligence result' } } } }
    }
  });
});
export default router;
