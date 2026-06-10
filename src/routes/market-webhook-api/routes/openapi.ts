import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Market Webhook API',
      version: '1.0.0',
      description: 'Subscribe to real-time crypto market events via webhooks with delivery retry, signing secrets and verification.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': { '/subscriptions': 0.002, '/': 0.002 },
      privacy: { data_stored: false, retention: 'none' },
    
    'x-human-approval-required': false,},
    servers: [{ url: 'https://orbis-apis.onrender.com/market-webhook' }],
    security: [{ ApiKeyAuth: [] }],
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
    paths: {
      '/': { get: { summary: 'API discovery', operationId: 'discovery', responses: { '200': { description: 'API info' } } },
        post: { operationId: 'registerWebhook', summary: 'Register a new webhook subscription', 'x-agent-callable': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['url', 'events'], properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
            url: { type: 'string', format: 'uri', description: 'HTTPS endpoint to receive events' },
            events: { type: 'array', items: { type: 'string', enum: ['price_move', 'volume_spike', 'whale_alert', 'liquidation', 'all'] }, description: 'Event types to subscribe to' },
            filters: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
              assets: { type: 'array', items: { type: 'string' } },
              min_move_pct: { type: 'number', description: 'Minimum price move % to trigger' },
            }},
            secret: { type: 'string', description: 'Optional signing secret for HMAC verification' },
          }}}}},
          responses: { '200': { description: 'Webhook registered', content: { 'application/json': { schema: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
            id: { type: 'string' }, url: { type: 'string' }, events: { type: 'array', items: { type: 'string' } },
            status: { type: 'string', enum: ['active', 'paused', 'failed'] },
            signing_secret: { type: 'string', description: 'Use to verify webhook payloads via X-Signature header' },
            created_at: { type: 'string', format: 'date-time' },
            retry_policy: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' }, max_retries: { type: 'integer' }, backoff_seconds: { type: 'integer' } } },
            confidence_per_section: { type: 'object' },
            recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
            chain_to: { type: 'array', items: { type: 'string' } },
          }}}}}}}},
      '/subscriptions': { get: { operationId: 'listSubscriptions', summary: 'List active webhook subscriptions', 'x-agent-callable': true,
        responses: { '200': { description: 'Active subscriptions', content: { 'application/json': { schema: { type: 'object', properties: {
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' }, description: 'Ordered list of recommended next actions for the agent' },
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
          subscriptions: { type: 'array', items: { type: 'object', properties: {
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' }, description: 'Ordered list of recommended next actions for the agent' },
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
            id: { type: 'string' }, url: { type: 'string' },
            events: { type: 'array', items: { type: 'string' } },
            status: { type: 'string' }, delivery_count: { type: 'integer' },
            last_delivered_at: { type: 'string', format: 'date-time' },
            created_at: { type: 'string', format: 'date-time' },
          }}},
          count: { type: 'integer' },
        }}}}}}}},
      '/{id}/logs': { get: { operationId: 'getWebhookLogs', summary: 'Get delivery logs for a webhook', 'x-agent-callable': true,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Delivery logs', content: { 'application/json': { schema: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
          id: { type: 'string' },
          logs: { type: 'array', items: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
            event_type: { type: 'string' }, delivered_at: { type: 'string', format: 'date-time' },
            status_code: { type: 'integer' }, response_time_ms: { type: 'number' },
            retry_count: { type: 'integer' }, success: { type: 'boolean' },
          }}},
          total_deliveries: { type: 'integer' }, success_rate: { type: 'number' },
        }}}}}}}},
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Gate webhook delivery based on event risk', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['event_type', 'action'], properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
          event_type: { type: 'string' }, action: { type: 'string' }, min_confidence: { type: 'number', default: 0.7, minimum: 0, maximum: 1 },
        }}}}},
        responses: { '200': { description: 'Gate decision', content: { 'application/json': { schema: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
          execute: { type: 'boolean' }, confidence: { type: 'number', minimum: 0, maximum: 1 },
          blocking_flags: { type: 'array', items: { type: 'string' } },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'array', items: { type: 'string' } },
        }}}}}}}},
      '/verify': { post: { operationId: 'verifyWebhook', summary: 'Verify webhook signature for security', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['payload', 'signature', 'secret'], properties: {
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' }, description: 'Ordered list of recommended next actions for the agent' },
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
          payload: { type: 'string' }, signature: { type: 'string' }, secret: { type: 'string' },
        }}}}},
        responses: { '200': { description: 'Verification result', content: { 'application/json': { schema: { type: 'object', properties: {
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' }, description: 'Ordered list of recommended next actions for the agent' },
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
          valid: { type: 'boolean' }, message: { type: 'string' },
        }}}}}}}},
    },
  });
});
export default router;
