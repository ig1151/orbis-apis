import { Router, Request, Response } from 'express';
const router = Router();

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Crypto Narrative API',
    version: '1.0.0',
    description: 'AI-detected crypto market narratives — trending themes, momentum scores, and sector analysis. Powered by Tavily search + CoinGecko + Claude AI.',
    contact: { url: 'https://orbisapi.com' },
  },
  servers: [{ url: 'https://crypto-narrative-api.onrender.com' }],
  paths: {
    '/v1/health': { get: { summary: 'Health check', responses: { 200: { description: 'OK' } } } },
    '/v1/narratives/trending': {
      get: {
        summary: 'Top trending crypto narratives with momentum scores',
        operationId: 'getTrending',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'number', default: 8 } },
          { name: 'timeframe', in: 'query', schema: { type: 'string', enum: ['24h', '7d'], default: '24h' } },
        ],
        responses: { 200: { description: 'List of trending narratives with momentum scores and catalysts' } },
      },
    },
    '/v1/narrative/{name}': {
      get: {
        summary: 'Deep dive on a specific narrative — summary, bull/bear case, risks',
        operationId: 'getNarrative',
        parameters: [
          { name: 'name', in: 'path', required: true, schema: { type: 'string' }, description: 'Narrative slug (e.g. ai-tokens, rwa, depin, layer-2, memecoins)' },
        ],
        responses: { 200: { description: 'Detailed narrative analysis with bull/bear case' } },
      },
    },
    '/v1/narratives/compare': {
      get: {
        summary: 'Compare 2-3 narratives head to head',
        operationId: 'compareNarratives',
        parameters: [
          { name: 'narratives', in: 'query', required: true, schema: { type: 'string' }, description: 'Comma-separated narrative slugs (e.g. ai-tokens,rwa,depin)' },
          { name: 'timeframe', in: 'query', schema: { type: 'string', enum: ['24h', '7d'], default: '7d' } },
        ],
        responses: { 200: { description: 'Head-to-head comparison with AI winner analysis' } },
      },
    },
    '/v1/narratives/scan': {
      get: {
        summary: 'Identify which narratives a token belongs to',
        operationId: 'scanToken',
        parameters: [
          { name: 'token', in: 'query', required: true, schema: { type: 'string' }, description: 'Token symbol (e.g. ETH, SOL, ONDO, FET)' },
        ],
        responses: { 200: { description: 'Token narrative classification with fit scores' } },
      },
    },
  },
};

router.get('/openapi.json', (_req: Request, res: Response) => { res.json(openApiSpec); });
router.get('/docs', (_req: Request, res: Response) => {
  res.send(`<!DOCTYPE html><html><head><title>Crypto Narrative API — Docs</title><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.css"></head><body><div id="swagger-ui"></div><script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js"></script><script>SwaggerUIBundle({ url: '/openapi.json', dom_id: '#swagger-ui', presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset], layout: 'BaseLayout' });</script></body></html>`);
});

export default router;
