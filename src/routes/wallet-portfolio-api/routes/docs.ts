import { Router, Request, Response } from 'express';
const router = Router();

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Wallet Portfolio API',
    version: '1.0.0',
    description: 'Multi-chain wallet portfolio snapshot — ERC20 token balances, PnL estimates, and AI wallet health scores across Ethereum, Base, Arbitrum, Polygon, Optimism, and BSC.',
    contact: { url: 'https://orbisapi.com' },
  },
  servers: [{ url: 'https://wallet-portfolio-api.onrender.com' }],
  paths: {
    '/v1/health': { get: { summary: 'Health check', responses: { 200: { description: 'OK' } } } },
    '/v1/wallet/snapshot': {
      get: {
        summary: 'Full wallet snapshot — ETH balance, ERC20 tokens, USD values',
        operationId: 'getSnapshot',
        parameters: [
          { name: 'address', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'chain', in: 'query', schema: { type: 'string', enum: ['ethereum', 'base', 'arbitrum', 'polygon', 'optimism', 'bsc'], default: 'ethereum' } },
        ],
        responses: { 200: { description: 'Wallet snapshot with token balances and USD values' } },
      },
    },
    '/v1/wallet/pnl': {
      get: {
        summary: 'Wallet PnL estimate based on ETH flow over 7/30/90 days',
        operationId: 'getPnL',
        parameters: [
          { name: 'address', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'chain', in: 'query', schema: { type: 'string', enum: ['ethereum', 'base', 'arbitrum', 'polygon', 'optimism', 'bsc'], default: 'ethereum' } },
          { name: 'period', in: 'query', schema: { type: 'string', enum: ['7d', '30d', '90d'], default: '30d' } },
        ],
        responses: { 200: { description: 'PnL estimate with tx stats and largest transaction' } },
      },
    },
    '/v1/wallet/score': {
      get: {
        summary: 'AI wallet health score — diversification, activity, risk, DeFi engagement',
        operationId: 'getScore',
        parameters: [
          { name: 'address', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'chain', in: 'query', schema: { type: 'string', enum: ['ethereum', 'base', 'arbitrum', 'polygon', 'optimism', 'bsc'], default: 'ethereum' } },
        ],
        responses: { 200: { description: 'Wallet health score with grade, categories, strengths, weaknesses, and AI narrative' } },
      },
    },
  },
};

router.get('/openapi.json', (_req: Request, res: Response) => { res.json(openApiSpec); });
router.get('/docs', (_req: Request, res: Response) => {
  res.send(`<!DOCTYPE html><html><head><title>Wallet Portfolio API — Docs</title><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.css"></head><body><div id="swagger-ui"></div><script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js"></script><script>SwaggerUIBundle({ url: '/openapi.json', dom_id: '#swagger-ui', presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset], layout: 'BaseLayout' });</script></body></html>`);
});

export default router;
