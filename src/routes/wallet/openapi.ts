import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Wallet Balance API',
      version: '1.0.0',
      description: 'Ethereum wallet ETH balance, ERC-20 token holdings, and transaction history.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': { '/balance/{address}': 0.001, '/tokens/{address}': 0.001, '/transactions/{address}': 0.001, '/portfolio/{address}': 0.002 },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/wallet' }],
    paths: {
      '/balance/{address}': { get: { operationId: 'getBalance', summary: 'Get ETH and token balances', 'x-agent-callable': true,
        parameters: [{ name: 'address', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Wallet balances', content: { 'application/json': { schema: { type: 'object', properties: {
          address: { type: 'string' }, eth_balance: { type: 'string' }, eth_balance_usd: { type: 'number' },
          tokens: { type: 'array', items: { type: 'object' } }, confidence_per_section: { type: 'object' },
        }}}}}}}},
      '/tokens/{address}': { get: { operationId: 'getTokens', summary: 'Get ERC-20 token holdings', 'x-agent-callable': true,
        parameters: [{ name: 'address', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Token holdings' }}}},
      '/transactions/{address}': { get: { operationId: 'getTransactions', summary: 'Get transaction history', 'x-agent-callable': true,
        parameters: [{ name: 'address', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Transaction history' }}}},
      '/portfolio/{address}': { get: { operationId: 'getPortfolio', summary: 'Get full wallet portfolio snapshot', 'x-agent-callable': true,
        parameters: [{ name: 'address', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Portfolio snapshot' }}}},
      '/balance': { get: { operationId: 'getBalanceQuery', summary: 'Get balance by query param', 'x-agent-callable': true,
        parameters: [{ name: 'address', in: 'query', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Wallet balances' }}}},
    },
  });
});
export default router;
