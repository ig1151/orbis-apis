import { Router, Request, Response } from 'express';
const router = Router();

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Meta Strategy API',
    version: '1.0.0',
    description: 'Multi-symbol crypto strategy scanner. Scans up to 5 symbols in parallel, ranks by signal strength, identifies best buy/sell opportunities, and generates a unified portfolio narrative. Calls strategy-signal-api for each symbol. Premium pipeline API.',
    contact: { url: 'https://orbisapi.com' },
  },
  servers: [{ url: 'https://meta-strategy-api.onrender.com' }],
  paths: {
    '/v1/health': { get: { summary: 'Health check', responses: { 200: { description: 'OK' } } } },
    '/v1/scan': {
      get: {
        summary: 'Scan multiple symbols, rank by signal strength, return best opportunities',
        operationId: 'scan',
        parameters: [
          {
            name: 'symbols',
            in: 'query',
            schema: { type: 'string' },
            description: 'Comma-separated symbols (max 5, default: BTC,ETH,SOL,ARB,SUI). Valid: BTC,ETH,SOL,BNB,ARB,OP,AVAX,MATIC,LINK,UNI,DOGE,SUI,APT,SEI,INJ,TIA,ATOM,DOT,NEAR,FET',
          },
        ],
        responses: {
          200: {
            description: 'Ranked signals with best buy/sell, market bias, and portfolio narrative',
          },
        },
      },
    },
  },
};

router.get('/openapi.json', (_req: Request, res: Response) => { res.json(openApiSpec); });
router.get('/docs', (_req: Request, res: Response) => {
  res.send(`<!DOCTYPE html><html><head><title>Meta Strategy API — Docs</title><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.css"></head><body><div id="swagger-ui"></div><script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js"></script><script>SwaggerUIBundle({ url: '/openapi.json', dom_id: '#swagger-ui', presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset], layout: 'BaseLayout' });</script></body></html>`);
});

export default router;
