import { Router, Request, Response } from 'express';
const router = Router();

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Token Screener API',
    version: '1.0.0',
    description: 'Crypto token screener — filter by momentum, volume spikes, gainers, losers, near ATH, and deep value. AI-powered opportunity detection with risk-adjusted recommendations. Powered by CoinGecko + Claude AI.',
    contact: { url: 'https://orbisapi.com' },
  },
  servers: [{ url: 'https://token-screener-api.onrender.com' }],
  paths: {
    '/v1/health': { get: { summary: 'Health check', responses: { 200: { description: 'OK' } } } },
    '/v1/screen': {
      get: {
        summary: 'Screen tokens by filter — gainers, losers, volume spike, momentum, near ATH, deep value',
        operationId: 'screenTokens',
        parameters: [
          { name: 'filter', in: 'query', schema: { type: 'string', enum: ['gainers', 'losers', 'volume_spike', 'momentum', 'near_ath', 'deep_value', 'trending', 'all'], default: 'trending' } },
          { name: 'limit', in: 'query', schema: { type: 'number', default: 10 } },
          { name: 'minMarketCap', in: 'query', schema: { type: 'number', default: 0 } },
          { name: 'maxMarketCap', in: 'query', schema: { type: 'number' } },
          { name: 'minVolume', in: 'query', schema: { type: 'number', default: 0 } },
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'CoinGecko category (e.g. layer-2, defi, meme-token)' },
        ],
        responses: { 200: { description: 'Filtered tokens with momentum scores and signals' } },
      },
    },
    '/v1/movers': {
      get: {
        summary: 'Top gainers and losers by timeframe',
        operationId: 'getMovers',
        parameters: [
          { name: 'timeframe', in: 'query', schema: { type: 'string', enum: ['1h', '24h', '7d'], default: '24h' } },
          { name: 'limit', in: 'query', schema: { type: 'number', default: 10 } },
          { name: 'minMarketCap', in: 'query', schema: { type: 'number', default: 10000000 } },
        ],
        responses: { 200: { description: 'Top gainers and losers' } },
      },
    },
    '/v1/opportunities': {
      get: {
        summary: 'AI-identified trading opportunities with risk-adjusted recommendations',
        operationId: 'getOpportunities',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'number', default: 5 } },
          { name: 'riskTolerance', in: 'query', schema: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' } },
          { name: 'minMarketCap', in: 'query', schema: { type: 'number', default: 100000000 } },
        ],
        responses: { 200: { description: 'AI-identified opportunities with type, reason, risk level, confidence' } },
      },
    },
  },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'Token Screener API',
    version: '1.0.0',
    description: 'Crypto token screener — momentum, volume spikes, gainers, losers, and AI opportunities',
    docs: '/docs',
    openapi: '/openapi.json',
    health: '/v1/health',
    endpoints: {
      screen: 'GET /v1/screen?filter=trending',
      movers: 'GET /v1/movers?timeframe=24h',
      opportunities: 'GET /v1/opportunities?riskTolerance=medium',
    },
    source: 'https://orbisapi.com',
  });
});

router.get('/openapi.json', (_req: Request, res: Response) => { res.json(openApiSpec); });
router.get('/docs', (_req: Request, res: Response) => {
  res.send(`<!DOCTYPE html><html><head><title>Token Screener API — Docs</title><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.css"></head><body><div id="swagger-ui"></div><script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js"></script><script>SwaggerUIBundle({ url: '/openapi.json', dom_id: '#swagger-ui', presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset], layout: 'BaseLayout' });</script></body></html>`);
});

export default router;
