import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Market Trigger API',
      version: '1.0.0',
      description: 'Create and evaluate market condition triggers for automated agent responses and trading automation.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': { '/evaluate': 0.005, '/create': 0.005, '/list': 0.001, '/delete': 0.001 },
      disclaimer: 'For informational purposes only. Not financial advice.',
      execution_gate_required: true,
      privacy: { data_stored: false, retention: 'none' },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/market-trigger' }],
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
    paths: {
      '/': { get: { summary: 'API discovery', operationId: 'discovery', responses: { '200': { description: 'API info' } } } },
      '/evaluate': { post: { operationId: 'evaluateTrigger', summary: 'Evaluate market conditions against a trigger definition', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['asset', 'conditions', 'context'], properties: {
          asset: { type: 'string', description: 'Asset symbol e.g. BTC' },
          conditions: { type: 'object', properties: {
            min_impact_score: { type: 'number', minimum: 0, maximum: 100 },
            max_impact_score: { type: 'number', minimum: 0, maximum: 100 },
            action_bias: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
            sentiment: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
            min_confidence: { type: 'number', minimum: 0, maximum: 1 },
            event_types: { type: 'array', items: { type: 'string' } },
          }},
          context: { type: 'object', minProperties: 1, properties: {
            news_impact: { type: 'object' }, market_signal: { type: 'object' },
          }},
        }}}}},
        responses: { '200': { description: 'Trigger evaluation result', content: { 'application/json': { schema: { type: 'object', properties: {
          triggered: { type: 'boolean' }, asset: { type: 'string' },
          score: { type: 'number', minimum: 0, maximum: 100 },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          action: { type: 'string', enum: ['buy', 'sell', 'hold', 'alert', 'monitor'] },
          matching_conditions: { type: 'array', items: { type: 'string' } },
          failing_conditions: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['active', 'triggered', 'inactive'] },
          confidence_per_section: { type: 'object', properties: { conditions: { type: 'number' }, context: { type: 'number' } } },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'string' },
          disclaimer: { type: 'string' },
        }}}}}}}},
      '/create': { post: { operationId: 'createTrigger', summary: 'Create a persistent market trigger', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['asset', 'conditions', 'context'], properties: {
          asset: { type: 'string' }, conditions: { type: 'object' },
          context: { type: 'object', minProperties: 1 },
          webhook_url: { type: 'string', format: 'uri', description: 'Optional webhook to fire on trigger' },
          name: { type: 'string', description: 'Human-readable trigger name' },
        }}}}},
        responses: { '200': { description: 'Trigger created', content: { 'application/json': { schema: { type: 'object', properties: {
          id: { type: 'string' }, name: { type: 'string' }, asset: { type: 'string' },
          status: { type: 'string', enum: ['active', 'paused'] },
          created_at: { type: 'string', format: 'date-time' },
          chain_to: { type: 'string' },
        }}}}}}}},
      '/list': { get: { operationId: 'listTriggers', summary: 'List all active triggers', 'x-agent-callable': true,
        responses: { '200': { description: 'Active triggers' }}}},
      '/delete': { post: { operationId: 'deleteTrigger', summary: 'Delete a trigger by ID', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['id'], properties: { id: { type: 'string' } }}}}},
        responses: { '200': { description: 'Trigger deleted' }}}},
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Gate action execution based on trigger state', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['trigger_id', 'action'], properties: {
          trigger_id: { type: 'string' }, action: { type: 'string' },
        }}}}},
        responses: { '200': { description: 'Gate decision', content: { 'application/json': { schema: { type: 'object', properties: {
          execute: { type: 'boolean' }, confidence: { type: 'number' },
          blocking_flags: { type: 'array', items: { type: 'string' } },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'string' }, disclaimer: { type: 'string' },
        }}}}}}}},
    },
  });
});
export default router;
