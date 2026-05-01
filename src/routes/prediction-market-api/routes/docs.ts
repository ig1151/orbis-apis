import { Router, Request, Response } from 'express';
const router = Router();

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Prediction Market API',
    version: '1.0.0',
    description: 'Polymarket prediction market data — trending markets, search, probabilities, and AI signal interpretation. Access real-world event probabilities from the world\'s largest prediction market. Powered by Polymarket Gamma API + Claude AI.',
    contact: { url: 'https://orbisapi.com' },
  },
  servers: [{ url: 'https://prediction-market-api.onrender.com' }],
  paths: {
    '/v1/health': { get: { summary: 'Health check', responses: { 200: { description: 'OK' } } } },
    '/v1/markets/trending': {
      get: {
        summary: 'Top trending Polymarket markets by 24h volume',
        operationId: 'getTrending',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'number', default: 10 } },
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Filter by category (crypto, politics, sports, etc.)' },
        ],
        responses: { 200: { description: 'List of trending markets with probabilities and volume' } },
      },
    },
    '/v1/markets/search': {
      get: {
        summary: 'Search markets by keyword',
        operationId: 'searchMarkets',
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' }, description: 'Search query (e.g. bitcoin, election, fed)' },
          { name: 'limit', in: 'query', schema: { type: 'number', default: 10 } },
        ],
        responses: { 200: { description: 'Matching markets with probabilities' } },
      },
    },
    '/v1/market/{id}': {
      get: {
        summary: 'Get market detail by slug or condition ID',
        operationId: 'getMarket',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Market slug or condition ID' },
        ],
        responses: { 200: { description: 'Full market detail' } },
      },
    },
    '/v1/markets/signal': {
      get: {
        summary: 'AI interpretation of a market probability and trading implications',
        operationId: 'getSignal',
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' }, description: 'Market search query' },
        ],
        responses: { 200: { description: 'AI signal with narrative, key factors, and trading implication' } },
      },
    },
  },
};

router.get('/openapi.json', (_req: Request, res: Response) => { res.json(openApiSpec); });
router.get('/docs', (_req: Request, res: Response) => {
  res.send(`<!DOCTYPE html><html><head><title>Prediction Market API — Docs</title><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.css"></head><body><div id="swagger-ui"></div><script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js"></script><script>SwaggerUIBundle({ url: '/openapi.json', dom_id: '#swagger-ui', presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset], layout: 'BaseLayout' });</script></body></html>`);
});

export default router;
