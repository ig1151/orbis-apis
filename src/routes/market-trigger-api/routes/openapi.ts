import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Market Trigger API',
      version: '1.0.0',
      description: 'Create and evaluate market condition triggers for automated agent responses.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': { '/evaluate': 0.005, '/create': 0.005 },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/market-trigger' }],
    paths: {
      '/evaluate': { post: { operationId: 'evaluateTrigger', summary: 'Evaluate market conditions against trigger definition', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['asset', 'conditions', 'context'], properties: {
          asset: { type: 'string', description: 'Asset symbol e.g. BTC' },
          conditions: { type: 'object', properties: {
            min_impact_score: { type: 'number', minimum: 0, maximum: 100 },
            max_impact_score: { type: 'number', minimum: 0, maximum: 100 },
            action_bias: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
            sentiment: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
            min_confidence: { type: 'number', minimum: 0, maximum: 1 },
          }},
          context: { type: 'object', required: [], properties: {
            news_impact: { type: 'object' }, market_signal: { type: 'object' },
          }, minProperties: 1 },
        }}}}},
        responses: { '200': { description: 'Trigger evaluation result', content: { 'application/json': { schema: { type: 'object', properties: {
          triggered: { type: 'boolean' }, asset: { type: 'string' }, score: { type: 'number' },
          confidence: { type: 'number' }, action: { type: 'string' },
          confidence_per_section: { type: 'object' },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'string' },
        }}}}}}}},
      '/create': { post: { operationId: 'createTrigger', summary: 'Create a persistent market trigger', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['asset', 'conditions', 'context'], properties: {
          asset: { type: 'string' }, conditions: { type: 'object' }, context: { type: 'object', minProperties: 1 },
        }}}}},
        responses: { '200': { description: 'Trigger created' }}}},
    },
  });
});
export default router;
