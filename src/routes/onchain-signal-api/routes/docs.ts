import { Router, Request, Response } from 'express';
const router = Router();
router.get('/openapi.json', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'On-Chain Signal API',
      version: '1.0.0',
      description: 'Whale movements, smart money flows, and on-chain event signals for crypto assets.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': { '/signals': 0.002, '/flows': 0.002, '/analyze': 0.003 },
      disclaimer: 'For informational purposes only. Not financial advice.',
      privacy: { data_stored: false, retention: 'none' },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/onchain-signal' }],
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
    paths: {
      '/': { get: { summary: 'API discovery', operationId: 'discovery', responses: { '200': { description: 'API info' } } } },
      '/signals': { get: { operationId: 'getSignals', summary: 'Get on-chain signals for a wallet address', 'x-agent-callable': true,
        parameters: [
          { name: 'address', in: 'query', required: true, schema: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' }, description: 'Wallet address' },
          { name: 'chain', in: 'query', required: false, schema: { type: 'string', default: 'ethereum' } },
        ],
        responses: { '200': { description: 'On-chain signals', content: { 'application/json': { schema: { type: 'object', properties: {
          address: { type: 'string' }, chain: { type: 'string' },
          signals: { type: 'array', items: { type: 'object', properties: {
            type: { type: 'string', enum: ['whale_move', 'smart_money', 'unusual_activity', 'accumulation', 'distribution'] },
            strength: { type: 'string', enum: ['high', 'medium', 'low'] },
            direction: { type: 'string', enum: ['bullish', 'bearish', 'neutral'] },
            value_usd: { type: 'number' }, description: { type: 'string' },
            source_confidence: { type: 'number', minimum: 0, maximum: 1 },
            timestamp: { type: 'string', format: 'date-time' },
          }}},
          wallet_risk: { type: 'object', properties: { score: { type: 'number' }, level: { type: 'string' } } },
          confidence_per_section: { type: 'object', properties: { signals: { type: 'number' }, wallet_risk: { type: 'number' } } },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'string' },
          privacy: { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } },
        }}}}}}}},
      '/flows': { get: { operationId: 'getFlows', summary: 'Get smart money flow data for a token contract', 'x-agent-callable': true,
        parameters: [
          { name: 'contract', in: 'query', required: true, schema: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' } },
          { name: 'chain', in: 'query', required: false, schema: { type: 'string', default: 'ethereum' } },
          { name: 'timeframe', in: 'query', required: false, schema: { type: 'string', enum: ['1h', '4h', '24h', '7d'], default: '24h' } },
        ],
        responses: { '200': { description: 'Flow data', content: { 'application/json': { schema: { type: 'object', properties: {
          contract: { type: 'string' }, chain: { type: 'string' }, timeframe: { type: 'string' },
          net_flow_usd: { type: 'number' }, inflow_usd: { type: 'number' }, outflow_usd: { type: 'number' },
          whale_transactions: { type: 'integer' }, smart_money_score: { type: 'number', minimum: 0, maximum: 100 },
          confidence_per_section: { type: 'object', properties: { flows: { type: 'number' }, source: { type: 'number' } } },
          chain_to: { type: 'string' },
        }}}}}}}},
      '/analyze': { post: { operationId: 'analyzeAddress', summary: 'Deep on-chain activity analysis for an address', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['address'], properties: {
          address: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
          chain: { type: 'string', default: 'ethereum' },
        }}}}},
        responses: { '200': { description: 'Address analysis', content: { 'application/json': { schema: { type: 'object', properties: {
          address: { type: 'string' }, chain: { type: 'string' },
          activity_score: { type: 'number', minimum: 0, maximum: 100 },
          transaction_count: { type: 'integer' }, unique_contracts: { type: 'integer' },
          is_whale: { type: 'boolean' }, is_smart_money: { type: 'boolean' },
          behavior_tags: { type: 'array', items: { type: 'string' } },
          confidence_per_section: { type: 'object' },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'string' },
        }}}}}}}},
    },
  });
});
router.get('/docs', (_req: Request, res: Response) => {
  res.send("<h1>On-Chain Signal API</h1><p><a href='/onchain-signal/openapi.json'>OpenAPI Spec</a></p>");
});
export default router;
