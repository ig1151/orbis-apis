import { Router, Request, Response } from 'express';
const router = Router();

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Crypto Alerts API',
    version: '1.0.0',
    description: 'Crypto price alerts, whale movement detection, and market alert summaries. Create price above/below/change alerts, monitor whale transactions, and get AI-powered market condition summaries.',
    contact: { url: 'https://orbisapi.com' },
  },
  servers: [{ url: 'https://crypto-alerts-api.onrender.com' }],
  paths: {
    '/v1/health': { get: { summary: 'Health check', responses: { 200: { description: 'OK' } } } },
    '/v1/alerts/create': {
      post: {
        summary: 'Create a price or whale movement alert',
        operationId: 'createAlert',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['type', 'symbol', 'threshold'],
                properties: {
                  type: { type: 'string', enum: ['price_above', 'price_below', 'price_change_percent', 'whale_movement', 'funding_rate_spike'] },
                  symbol: { type: 'string', description: 'BTC, ETH, SOL, etc.' },
                  threshold: { type: 'number', description: 'Price level or % change threshold' },
                  ttlHours: { type: 'number', default: 24, description: 'Alert TTL in hours (max 168)' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Alert created with alertId' } },
      },
    },
    '/v1/alerts/check': {
      get: {
        summary: 'Check if alerts have triggered against current prices',
        operationId: 'checkAlerts',
        parameters: [
          { name: 'alertId', in: 'query', schema: { type: 'string' }, description: 'Check specific alert' },
          { name: 'symbol', in: 'query', schema: { type: 'string' }, description: 'Check all alerts for a symbol' },
        ],
        responses: { 200: { description: 'Alert status with current values' } },
      },
    },
    '/v1/alerts/feed': {
      get: {
        summary: 'Recent triggered alerts feed',
        operationId: 'alertsFeed',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'number', default: 20 } },
          { name: 'symbol', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'List of recently triggered alerts' } },
      },
    },
    '/v1/whale/activity': {
      get: {
        summary: 'Recent whale transactions with exchange labels and sentiment',
        operationId: 'whaleActivity',
        parameters: [
          { name: 'symbol', in: 'query', schema: { type: 'string', enum: ['USDC', 'USDT', 'WETH', 'LINK', 'UNI'], default: 'USDC' } },
          { name: 'minUsd', in: 'query', schema: { type: 'number', default: 100000 } },
          { name: 'limit', in: 'query', schema: { type: 'number', default: 10 } },
        ],
        responses: { 200: { description: 'Whale transactions with sentiment' } },
      },
    },
    '/v1/alerts/summary': {
      get: {
        summary: 'AI summary of current market alert conditions',
        operationId: 'alertsSummary',
        responses: { 200: { description: 'Alert summary with AI market analysis' } },
      },
    },
  },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'Crypto Alerts API',
    version: '1.0.0',
    description: 'Crypto price alerts, whale movement detection, and AI market summaries',
    docs: '/docs',
    openapi: '/openapi.json',
    health: '/v1/health',
    endpoints: {
      createAlert: 'POST /v1/alerts/create',
      checkAlerts: 'GET /v1/alerts/check?alertId=...',
      feed: 'GET /v1/alerts/feed',
      whaleActivity: 'GET /v1/whale/activity?symbol=USDC',
      summary: 'GET /v1/alerts/summary',
    },
    source: 'https://orbisapi.com',
  });
});

router.get('/openapi.json', (_req: Request, res: Response) => { res.json(openApiSpec); });
router.get('/docs', (_req: Request, res: Response) => {
  res.send(`<!DOCTYPE html><html><head><title>Crypto Alerts API — Docs</title><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.css"></head><body><div id="swagger-ui"></div><script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js"></script><script>SwaggerUIBundle({ url: '/openapi.json', dom_id: '#swagger-ui', presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset], layout: 'BaseLayout' });</script></body></html>`);
});

export default router;
