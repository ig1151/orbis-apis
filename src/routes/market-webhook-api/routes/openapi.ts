import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Market Webhook API',
      version: '1.0.0',
      description: 'Subscribe to real-time crypto market events via webhooks.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': { '/subscriptions': 0.002, '/': 0.002 },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/market-webhook' }],
    paths: {
      '/subscriptions': { get: { operationId: 'listSubscriptions', summary: 'List active webhook subscriptions', 'x-agent-callable': true,
        responses: { '200': { description: 'Active subscriptions', content: { 'application/json': { schema: { type: 'object', properties: {
          subscriptions: { type: 'array', items: { type: 'object', properties: {
            id: { type: 'string' }, url: { type: 'string' }, events: { type: 'array', items: { type: 'string' } },
            created_at: { type: 'string' }, status: { type: 'string' },
          }}},
          confidence_per_section: { type: 'object' },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
        }}}}}}}},
      '/': { post: { operationId: 'registerWebhook', summary: 'Register a new webhook subscription', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['url', 'events'], properties: {
          url: { type: 'string', format: 'uri' },
          events: { type: 'array', items: { type: 'string' } },
          filters: { type: 'object' },
        }}}}},
        responses: { '200': { description: 'Webhook registered' }}}},
      '/{id}/logs': { get: { operationId: 'getWebhookLogs', summary: 'Get delivery logs for a webhook', 'x-agent-callable': true,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Delivery logs' }}}},
    },
  });
});
export default router;
