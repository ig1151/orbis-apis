import { Router, Request, Response } from 'express';
const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Staking Rewards API',
      version: '1.0.0',
      description: 'Staking APY rates, provider comparison, reward estimates, and network health for PoS assets. Built for yield-seeking agents, portfolio managers, and DeFi automation workflows.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-pricing': { free_tier: { requests_per_day: 100 }, pay_per_call: { rates: '$0.003', estimate: '$0.003', compare: '$0.004', lookup: '$0.006' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice.',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/staking-rewards' }],
    paths: {
      '/rates': { post: { operationId: 'stakingRates', summary: 'Staking rates — native APY, real APY, providers, lock-up, slash risk', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['symbol'], properties: { symbol: { type: 'string', example: 'ETH' } } } } } }, responses: { '200': { description: 'Staking rates' }, '400': { description: 'Missing symbol' } } } },
      '/estimate': { post: { operationId: 'stakingEstimate', summary: 'Estimate staking rewards — tokens, USD, and price scenarios', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['symbol', 'amount'], properties: { symbol: { type: 'string' }, amount: { type: 'number' }, duration_days: { type: 'integer', default: 365 }, provider: { type: 'string' } } } } } }, responses: { '200': { description: 'Reward estimate with scenarios' } } } },
      '/compare': { post: { operationId: 'stakingCompare', summary: 'Compare staking yields across up to 15 PoS assets', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['symbols'], properties: { symbols: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 15 } } } } } }, responses: { '200': { description: 'Comparison ranked by risk-adjusted yield' } } } },
      '/lookup': { post: { operationId: 'stakingLookup', summary: 'ONE-CALL: rates + providers + estimate + network health', 'x-one-call': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['symbol'], properties: { symbol: { type: 'string' }, amount: { type: 'number' } } } } } }, responses: { '200': { description: 'Full staking intelligence' } } } },
    },
  });
});

export default router;
