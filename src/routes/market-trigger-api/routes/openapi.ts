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
      'x-pricing': { '/evaluate': 0.005, '/create': 0.005, '/list': 0.001, '/delete': 0.001 },
      disclaimer: 'For informational purposes only. Not financial advice.',
      execution_gate_required: true,
      privacy: { data_stored: false, retention: 'none' },
    
    'x-human-approval-required': true,},
    servers: [{ url: 'https://orbis-apis.onrender.com/market-trigger' }],
    security: [{ ApiKeyAuth: [] }],
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
    paths: {
      '/': { get: { summary: 'API discovery', operationId: 'discovery', responses: { '200': { description: 'API info' } } } },
      '/evaluate': { post: { operationId: 'evaluateTrigger', summary: 'Evaluate market conditions against trigger definition', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['asset', 'conditions', 'context'], properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          asset: { type: 'string' },
          conditions: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
            min_impact_score: { type: 'number', minimum: 0, maximum: 100 },
            max_impact_score: { type: 'number', minimum: 0, maximum: 100 },
            action_bias: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
            sentiment: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
            min_confidence: { type: 'number', minimum: 0, maximum: 1 },
          }},
          context: { type: 'object', minProperties: 1, properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
            news_impact: { type: 'object' }, market_signal: { type: 'object' },
          }},
        }}}}},
        responses: { '200': { description: 'Trigger evaluation result', content: { 'application/json': { schema: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          triggered: { type: 'boolean' }, asset: { type: 'string' },
          score: { type: 'number', minimum: 0, maximum: 100 },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          action: { type: 'string', enum: ['buy', 'sell', 'hold', 'alert', 'monitor'] },
          matching_conditions: { type: 'array', items: { type: 'string' } },
          failing_conditions: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['active', 'triggered', 'inactive'] },
          confidence_per_section: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' }, conditions: { type: 'number' }, context: { type: 'number' } } },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'array', items: { type: 'string' } },
          disclaimer: { type: 'string' },
        } } } } } } } },
      '/create': { post: { operationId: 'createTrigger', summary: 'Create a persistent market trigger', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['asset', 'conditions', 'context'], properties: {
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' }, description: 'Ordered list of recommended next actions for the agent' },
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
          asset: { type: 'string' }, conditions: { type: 'object' },
          context: { type: 'object', minProperties: 1 },
          webhook_url: { type: 'string', format: 'uri' },
          name: { type: 'string' },
        } } } } },
        responses: { '200': { description: 'Trigger created', content: { 'application/json': { schema: { type: 'object', properties: {
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' }, description: 'Ordered list of recommended next actions for the agent' },
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
          id: { type: 'string' }, name: { type: 'string' }, asset: { type: 'string' },
          status: { type: 'string', enum: ['active', 'paused'] },
          created_at: { type: 'string', format: 'date-time' },
          chain_to: { type: 'array', items: { type: 'string' } },
        } } } } } } } },
      '/list': { get: { operationId: 'listTriggers', summary: 'List all active triggers', 'x-agent-callable': true,
        responses: { '200': { description: 'Active triggers', content: { 'application/json': { schema: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
          triggers: { type: 'array', items: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
            id: { type: 'string' }, name: { type: 'string' }, asset: { type: 'string' },
            status: { type: 'string', enum: ['active', 'paused', 'triggered'] },
            created_at: { type: 'string', format: 'date-time' },
            last_evaluated_at: { type: 'string', format: 'date-time', nullable: true },
            trigger_count: { type: 'integer' },
          } } },
          count: { type: 'integer' },
        } } } } } } } },
      '/delete': { post: { operationId: 'deleteTrigger', summary: 'Delete a trigger by ID', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['id'], properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' }, id: { type: 'string' } } } } } },
        responses: { '200': { description: 'Trigger deleted', content: { 'application/json': { schema: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
          id: { type: 'string' }, deleted: { type: 'boolean' }, message: { type: 'string' },
        } } } } } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Gate action execution based on trigger state', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['trigger_id', 'action'], properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
          trigger_id: { type: 'string' }, action: { type: 'string' },
        } } } } },
        responses: { '200': { description: 'Gate decision', content: { 'application/json': { schema: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
          execute: { type: 'boolean' }, confidence: { type: 'number', minimum: 0, maximum: 1 },
          blocking_flags: { type: 'array', items: { type: 'string' } },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'array', items: { type: 'string' } }, disclaimer: { type: 'string' },
        } } } } } } } },
    },
  });
});
export default router;
