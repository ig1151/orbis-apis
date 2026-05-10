import { Router, Request, Response } from 'express';
const router = Router();
const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Portfolio Rebalance API', version: '2.0.0', description: 'Generate portfolio rebalancing recommendations with trade instructions, risk constraints and compliance disclaimers. Not financial advice — for informational and simulation purposes only.', 'x-agent-callable': true, 'x-mcp-compatible': true, 'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { rebalance: '$0.007', strategies: '$0.003' }, high_volume: { rebalance: '$0.004' } } },
    servers: [{ url: 'https://orbis-apis.onrender.com/portfolio-rebalance' }],
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/rebalance': { post: { operationId: 'rebalancePortfolio', summary: 'Generate portfolio rebalancing recommendations with trade instructions and risk analysis — not financial advice', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['portfolio', 'target_allocation'], properties: { portfolio: { type: 'array', items: { type: 'object', properties: { asset: { type: 'string' }, value: { type: 'number' }, quantity: { type: 'number' } } } }, target_allocation: { type: 'object', additionalProperties: { type: 'number' } }, risk_profile: { type: 'string', enum: ['conservative', 'moderate', 'aggressive'] }, constraints: { type: 'object', properties: { max_trade_size_pct: { type: 'number' }, min_trade_value: { type: 'number' }, excluded_assets: { type: 'array', items: { type: 'string' } } } } } } } } }, responses: { '200': { description: 'Rebalancing recommendations', content: { 'application/json': { schema: { type: 'object', properties: { disclaimer: { type: 'string' }, current_allocation: { type: 'object' }, target_allocation: { type: 'object' }, drift_pct: { type: 'number' }, trades: { type: 'array', items: { type: 'object', properties: { asset: { type: 'string' }, action: { type: 'string', enum: ['buy', 'sell', 'hold'] }, quantity: { type: 'number' }, value_usdc: { type: 'number' }, reason: { type: 'string' } } } }, estimated_total_cost: { type: 'number' }, risk_score: { type: 'number', minimum: 0, maximum: 1 }, compliance_notes: actions, confidence_per_section: confidence, privacy } } } } }, '400': { description: 'Missing portfolio or target allocation' }, '500': { description: 'Rebalancing failed' } } } },
      '/strategies': { get: { operationId: 'listStrategies', summary: 'List available rebalancing strategies with descriptions and risk profiles', responses: { '200': { description: 'Available strategies', content: { 'application/json': { schema: { type: 'object', properties: { strategies: { type: 'array', items: { type: 'object', properties: { strategy_id: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' }, risk_profile: { type: 'string' }, rebalance_frequency: { type: 'string' } } } }, privacy } } } } }, '500': { description: 'Failed to list strategies' } } } }
    }
  });
});
export default router;
