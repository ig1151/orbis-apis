import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Wallet Balance API',
      version: '1.0.0',
      description: 'Ethereum wallet ETH balance, ERC-20 token holdings, portfolio snapshots and transaction history.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': { '/balance': 0.001, '/tokens/{address}': 0.001, '/transactions/{address}': 0.001, '/portfolio/{address}': 0.002 },
      privacy: { data_stored: false, retention: 'none' },
    
    'x-human-approval-required': true,},
    servers: [{ url: 'https://orbis-apis.onrender.com/wallet' }],
    security: [{ ApiKeyAuth: [] }],
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
    paths: {
      '/': { get: { summary: 'API discovery', operationId: 'discovery', responses: { '200': { description: 'API info' } } } },
      '/balance': { get: { operationId: 'getBalanceQuery', summary: 'Get ETH and ERC-20 token balances by query param', 'x-agent-callable': true,
        parameters: [
          { name: 'address', in: 'query', required: true, schema: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' }, description: 'Ethereum wallet address' },
          { name: 'chain', in: 'query', required: false, schema: { type: 'string', default: 'ethereum' } },
        ],
        responses: { '200': { description: 'Wallet balances', content: { 'application/json': { schema: { type: 'object', properties: {
          address: { type: 'string' }, chain: { type: 'string' },
          eth_balance: { type: 'string', description: 'ETH balance as string to preserve precision' },
          eth_balance_usd: { type: 'number' },
          tokens: { type: 'array', items: { type: 'object', properties: {
            symbol: { type: 'string' }, name: { type: 'string' },
            contract_address: { type: 'string' }, balance: { type: 'string' },
            decimals: { type: 'integer' }, usd_value: { type: 'number', nullable: true },
          }}},
          confidence_per_section: { type: 'object', properties: { balances: { type: 'number' }, prices: { type: 'number' } } },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'array', items: { type: 'string' } },
          privacy: { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } },
        }}}}}}}},
      '/balance/{address}': { get: { operationId: 'getBalance', summary: 'Get ETH and ERC-20 token balances by path param', 'x-agent-callable': true,
        parameters: [
          { name: 'address', in: 'path', required: true, schema: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' } },
          { name: 'chain', in: 'query', required: false, schema: { type: 'string', default: 'ethereum' } },
        ],
        responses: { '200': { description: 'Wallet balances', content: { 'application/json': { schema: { type: 'object', properties: {
          address: { type: 'string' }, chain: { type: 'string' },
          eth_balance: { type: 'string' }, eth_balance_usd: { type: 'number' },
          tokens: { type: 'array', items: { type: 'object', properties: {
            symbol: { type: 'string' }, name: { type: 'string' }, contract_address: { type: 'string' },
            balance: { type: 'string' }, decimals: { type: 'integer' },
            usd_value: { type: 'number', nullable: true },
          }}},
          confidence_per_section: { type: 'object', properties: {
          balances: { type: 'number' }, prices: { type: 'number' } } },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'array', items: { type: 'string' } },
          privacy: { type: 'object', properties: {
          data_stored: { type: 'boolean' }, retention: { type: 'string' } } },
        }}}}}}}},
      '/tokens/{address}': { get: { operationId: 'getTokens', summary: 'Get ERC-20 token holdings for a wallet', 'x-agent-callable': true,
        parameters: [
          { name: 'address', in: 'path', required: true, schema: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' } },
        ],
        responses: { '200': { description: 'ERC-20 token holdings', content: { 'application/json': { schema: { type: 'object', properties: {
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' }, description: 'Ordered list of recommended next actions for the agent' },
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
          address: { type: 'string' },
          tokens: { type: 'array', items: { type: 'object', properties: {
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' }, description: 'Ordered list of recommended next actions for the agent' },
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
            symbol: { type: 'string' }, name: { type: 'string' }, contract_address: { type: 'string' },
            balance: { type: 'string' }, decimals: { type: 'integer' },
            usd_value: { type: 'number', nullable: true }, price_usd: { type: 'number', nullable: true },
          }}},
          count: { type: 'integer' }, chain: { type: 'string' },
        }}}}}}}},
      '/transactions/{address}': { get: { operationId: 'getTransactions', summary: 'Get recent transaction history for a wallet', 'x-agent-callable': true,
        parameters: [
          { name: 'address', in: 'path', required: true, schema: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 20, maximum: 100 } },
        ],
        responses: { '200': { description: 'Transaction history', content: { 'application/json': { schema: { type: 'object', properties: {
          address: { type: 'string' },
          transactions: { type: 'array', items: { type: 'object', properties: {
          hash: { type: 'string' }, from: { type: 'string' }, to: { type: 'string' },
            value_eth: { type: 'string' }, value_usd: { type: 'number', nullable: true },
            gas_used: { type: 'integer' }, timestamp: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['success', 'failed'] },
          }}},
          count: { type: 'integer' }, chain: { type: 'string' },
        }}}}}}}},
      '/portfolio/{address}': { get: { operationId: 'getPortfolio', summary: 'Get full wallet portfolio snapshot with USD values', 'x-agent-callable': true,
        parameters: [
          { name: 'address', in: 'path', required: true, schema: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' } },
        ],
        responses: { '200': { description: 'Portfolio snapshot', content: { 'application/json': { schema: { type: 'object', properties: {
          address: { type: 'string' }, chain: { type: 'string' },
          total_usd: { type: 'number' }, eth_usd: { type: 'number' }, tokens_usd: { type: 'number' },
          tokens: { type: 'array', items: { type: 'object' } },
          allocation: { type: 'array', items: { type: 'object', properties: {
          asset: { type: 'string' }, pct: { type: 'number' } } } },
          confidence_per_section: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' }, balances: { type: 'number' }, prices: { type: 'number' } } },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'array', items: { type: 'string' } },
          transfer_simulation: { type: 'object', properties: { estimated_gas: { type: 'number' }, estimated_fee_eth: { type: 'string' }, feasible: { type: 'boolean' } }, description: 'Simulated transfer cost estimate' },
          approval_risk_estimate: { type: 'object', properties: { risk_level: { type: 'string', enum: ['low', 'medium', 'high'] }, flags: { type: 'array', items: { type: 'string' } } }, description: 'Risk estimate before approving a transaction' },
        }}}}}}}},
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Gate agent action based on wallet state', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['address', 'action'], properties: {
          address: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
          action: { type: 'string' },
          min_balance_eth: { type: 'number', description: 'Minimum ETH balance required' },
        }}}}},
        responses: { '200': { description: 'Gate decision', content: { 'application/json': { schema: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
          execute: { type: 'boolean' }, confidence: { type: 'number', minimum: 0, maximum: 1 },
          blocking_flags: { type: 'array', items: { type: 'string' } },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'array', items: { type: 'string' } },
        }}}}}}}},
    },
  });
});
export default router;
