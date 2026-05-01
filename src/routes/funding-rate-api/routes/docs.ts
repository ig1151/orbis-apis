import { Router, Request, Response } from 'express';
const router = Router();

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Funding Rate API',
    version: '1.0.0',
    description: 'Real-time perpetual futures funding rates across 25+ exchanges with arbitrage detection and AI sentiment signals. Covers Binance, Bybit, OKX, Hyperliquid, Drift, and more. Updated every 60 seconds.',
    contact: { url: 'https://orbisapi.com' },
  },
  servers: [{ url: 'https://funding-rate-api.onrender.com' }],
  paths: {
    '/v1/health': { get: { summary: 'Health check', responses: { 200: { description: 'OK' } } } },
    '/v1/rates/now': {
      get: {
        summary: 'Current funding rates for a symbol across all exchanges',
        operationId: 'getRatesNow',
        parameters: [
          { name: 'symbol', in: 'query', schema: { type: 'string', default: 'BTC' }, description: 'Token symbol (BTC, ETH, SOL, etc.)' },
          { name: 'exchanges', in: 'query', schema: { type: 'string' }, description: 'Comma-separated exchange filter (optional)' },
        ],
        responses: { 200: { description: 'Current funding rates with overall sentiment' } },
      },
    },
    '/v1/rates/compare': {
      get: {
        summary: 'Cross-exchange comparison with arbitrage opportunities',
        operationId: 'compareRates',
        parameters: [
          { name: 'symbol', in: 'query', schema: { type: 'string', default: 'BTC' } },
          { name: 'minSpread', in: 'query', schema: { type: 'number', default: 0.01 }, description: 'Minimum 8h spread % to show as arbitrage' },
        ],
        responses: { 200: { description: 'Sorted rates with arbitrage opportunities' } },
      },
    },
    '/v1/rates/extremes': {
      get: {
        summary: 'Most extreme funding rates across all symbols',
        operationId: 'getExtremes',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'number', default: 10 } },
          { name: 'direction', in: 'query', schema: { type: 'string', enum: ['long', 'short', 'both'], default: 'both' } },
          { name: 'exchange', in: 'query', schema: { type: 'string' }, description: 'Filter by specific exchange' },
        ],
        responses: { 200: { description: 'Most extreme long-heavy and short-heavy funding rates' } },
      },
    },
    '/v1/rates/signal': {
      get: {
        summary: 'AI-interpreted sentiment signal from funding rates',
        operationId: 'getSignal',
        parameters: [
          { name: 'symbol', in: 'query', schema: { type: 'string', default: 'BTC' } },
        ],
        responses: { 200: { description: 'AI signal with narrative, key insight, and recommendation' } },
      },
    },
  },
};

router.get('/openapi.json', (_req: Request, res: Response) => { res.json(openApiSpec); });
router.get('/docs', (_req: Request, res: Response) => {
  res.send(`<!DOCTYPE html><html><head><title>Funding Rate API — Docs</title><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.css"></head><body><div id="swagger-ui"></div><script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js"></script><script>SwaggerUIBundle({ url: '/openapi.json', dom_id: '#swagger-ui', presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset], layout: 'BaseLayout' });</script></body></html>`);
});

export default router;
