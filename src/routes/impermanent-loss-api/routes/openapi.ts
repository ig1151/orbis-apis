import { Router, Request, Response } from 'express';
const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Impermanent Loss API',
      version: '1.0.0',
      description: 'Calculate and simulate impermanent loss for AMM liquidity pool positions. Supports x*y=k constant product formula, multi-scenario simulation, and exit recommendations for DeFi LP agents.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-pricing': { free_tier: { requests_per_day: 100 }, pay_per_call: { calculate: '$0.003', simulate: '$0.004', lookup: '$0.005' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice.',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/impermanent-loss' }],
    paths: {
      '/calculate': { post: { operationId: 'ilCalculate', summary: 'Calculate current impermanent loss for an LP position', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['token_a', 'token_b', 'entry_price_a', 'entry_price_b', 'current_price_a', 'current_price_b'], properties: { token_a: { type: 'string' }, token_b: { type: 'string' }, entry_price_a: { type: 'number' }, entry_price_b: { type: 'number' }, current_price_a: { type: 'number' }, current_price_b: { type: 'number' }, liquidity_usd: { type: 'number' } } } } } }, responses: { '200': { description: 'IL calculation' }, '400': { description: 'Missing fields' } } } },
      '/simulate': { post: { operationId: 'ilSimulate', summary: 'Simulate impermanent loss across price change scenarios', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['token_a', 'token_b', 'entry_price_a', 'entry_price_b'], properties: { token_a: { type: 'string' }, token_b: { type: 'string' }, entry_price_a: { type: 'number' }, entry_price_b: { type: 'number' }, liquidity_usd: { type: 'number' }, scenarios: { type: 'array', items: { type: 'string' } } } } } } }, responses: { '200': { description: 'Scenario simulation' } } } },
      '/lookup': { post: { operationId: 'ilLookup', summary: 'ONE-CALL: IL calculation + scenarios + position value + recommendation', 'x-one-call': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['token_a', 'token_b', 'entry_price_a', 'entry_price_b', 'current_price_a', 'current_price_b'] } } } }, responses: { '200': { description: 'Full IL intelligence' } } } },
    },
  });
});

export default router;
