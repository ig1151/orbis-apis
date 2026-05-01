import { Router, Request, Response } from 'express';
const router = Router();

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'DeFi Position Monitor API',
    version: '1.0.0',
    description: 'Monitor DeFi lending positions for liquidation risk. Track Aave V3 health factors, collateral ratios, and get AI-powered liquidation alerts across Ethereum, Arbitrum, Polygon, Optimism, and Base.',
    contact: { url: 'https://orbisapi.com' },
  },
  servers: [{ url: 'https://defi-position-monitor-api.onrender.com' }],
  paths: {
    '/v1/health': { get: { summary: 'Health check', responses: { 200: { description: 'OK' } } } },
    '/v1/position/aave': {
      get: {
        summary: 'Aave V3 position — health factor, collateral, debt, liquidation risk',
        operationId: 'getAavePosition',
        parameters: [
          { name: 'address', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'chain', in: 'query', schema: { type: 'string', enum: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche'], default: 'ethereum' } },
        ],
        responses: { 200: { description: 'Aave V3 position with health factor and risk level' } },
      },
    },
    '/v1/position/scan': {
      get: {
        summary: 'Scan wallet across all chains for active DeFi positions',
        operationId: 'scanPositions',
        parameters: [
          { name: 'address', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'All active positions with overall risk level' } },
      },
    },
    '/v1/position/alert': {
      get: {
        summary: 'AI liquidation risk alert with immediate action guidance',
        operationId: 'getAlert',
        parameters: [
          { name: 'address', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'chain', in: 'query', schema: { type: 'string', enum: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche'], default: 'ethereum' } },
          { name: 'protocol', in: 'query', schema: { type: 'string', enum: ['aave-v3'], default: 'aave-v3' } },
        ],
        responses: { 200: { description: 'Alert level with AI action guidance' } },
      },
    },
  },
};

router.get('/openapi.json', (_req: Request, res: Response) => { res.json(openApiSpec); });
router.get('/docs', (_req: Request, res: Response) => {
  res.send(`<!DOCTYPE html><html><head><title>DeFi Position Monitor API — Docs</title><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.css"></head><body><div id="swagger-ui"></div><script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js"></script><script>SwaggerUIBundle({ url: '/openapi.json', dom_id: '#swagger-ui', presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset], layout: 'BaseLayout' });</script></body></html>`);
});

export default router;
