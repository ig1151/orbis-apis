import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Smart Contract ABI Lookup API', version: '1.0.0', description: 'Look up and decode smart contract ABI from blockchain networks.' },
    servers: [{ url: 'https://orbis-apis.onrender.com/smart-contract-abi-lookup' }],
    paths: {
      '/lookup': { post: { summary: 'Look up contract ABI', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'Contract address or identifier' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'ABI lookup result' } } } },
      '/decode': { post: { summary: 'Decode ABI function call or event log', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string', description: 'Hex encoded calldata or log data' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Decoded ABI result' } } } },
      '/execution-gate': { post: { summary: 'Execution readiness gate', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Execution gate result' } } } },
      '/abi-intelligence': { post: { summary: 'ONE-CALL: Full ABI lookup intelligence', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['input'], properties: { input: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Full intelligence result' } } } }
    }
  });
});
export default router;
