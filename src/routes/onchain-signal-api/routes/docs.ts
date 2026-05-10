import { Router, Request, Response } from 'express';
const router = Router();
router.get('/openapi.json', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'On-Chain Signal API',
      version: '1.0.0',
      description: 'Whale movements, smart money flows, and on-chain event signals for crypto.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': { '/signals': 0.002, '/flows': 0.002, '/analyze': 0.003 },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/onchain-signal' }],
    paths: {
      '/signals': { get: { operationId: 'getSignals', summary: 'Get current on-chain signals for a wallet address', 'x-agent-callable': true,
        parameters: [
          { name: 'address', in: 'query', required: true, schema: { type: 'string' }, description: 'Wallet address 0x...' },
          { name: 'chain', in: 'query', required: false, schema: { type: 'string', default: 'ethereum' } },
        ],
        responses: { '200': { description: 'On-chain signals', content: { 'application/json': { schema: { type: 'object', properties: {
          address: { type: 'string' }, signals: { type: 'array', items: { type: 'object' } },
          confidence_per_section: { type: 'object' },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'string' },
        }}}}}}}},
      '/flows': { get: { operationId: 'getFlows', summary: 'Get smart money flow data for a token contract', 'x-agent-callable': true,
        parameters: [
          { name: 'contract', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'chain', in: 'query', required: false, schema: { type: 'string', default: 'ethereum' } },
          { name: 'timeframe', in: 'query', required: false, schema: { type: 'string', enum: ['1h', '4h', '24h', '7d'], default: '24h' } },
        ],
        responses: { '200': { description: 'Flow data' }}}},
      '/analyze': { post: { operationId: 'analyzeAddress', summary: 'Analyze on-chain activity for an address', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['address'], properties: {
          address: { type: 'string' }, chain: { type: 'string', default: 'ethereum' },
        }}}}},
        responses: { '200': { description: 'Address analysis' }}}},
    },
  });
});
router.get('/docs', (_req: Request, res: Response) => {
  res.send("<h1>On-Chain Signal API Docs</h1><p><a href='/onchain-signal/openapi.json'>OpenAPI Spec</a></p>");
});
export default router;
