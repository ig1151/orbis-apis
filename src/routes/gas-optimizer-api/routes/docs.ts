import { Router, Request, Response } from 'express';
const router = Router();

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Gas Optimizer API',
    version: '1.0.0',
    description: 'Multi-chain gas price data, USD cost estimates, cross-chain comparison, and optimal transaction timing for Ethereum, Polygon, Arbitrum, Optimism, Base, BSC, and Avalanche. No API key required — powered by public RPC nodes.',
    contact: { url: 'https://orbisapi.com' },
  },
  servers: [{ url: 'https://gas-optimizer-api.onrender.com' }],
  paths: {
    '/v1/health': { get: { summary: 'Health check', responses: { 200: { description: 'OK' } } } },
    '/v1/gas/now': {
      get: {
        summary: 'Current gas prices for a chain with USD cost estimates',
        operationId: 'getGasNow',
        parameters: [
          { name: 'chain', in: 'query', schema: { type: 'string', enum: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'bsc', 'avalanche'], default: 'ethereum' } },
        ],
        responses: { 200: { description: 'Gas prices with slow/standard/fast/instant tiers and USD costs' } },
      },
    },
    '/v1/gas/estimate': {
      get: {
        summary: 'Estimate USD cost for a specific transaction type',
        operationId: 'estimateGas',
        parameters: [
          { name: 'chain', in: 'query', schema: { type: 'string', default: 'ethereum' } },
          { name: 'txType', in: 'query', schema: { type: 'string', enum: ['transfer', 'erc20', 'swap', 'nft_mint', 'contract_deploy', 'custom'], default: 'transfer' } },
          { name: 'gasLimit', in: 'query', schema: { type: 'number' }, description: 'Custom gas limit (required for txType=custom)' },
          { name: 'speed', in: 'query', schema: { type: 'string', enum: ['slow', 'standard', 'fast', 'instant'], default: 'standard' } },
        ],
        responses: { 200: { description: 'USD cost estimate for the transaction' } },
      },
    },
    '/v1/gas/compare': {
      get: {
        summary: 'Compare gas costs across all supported chains',
        operationId: 'compareGas',
        responses: { 200: { description: 'All chains ranked by swap cost with cheapest chain highlighted' } },
      },
    },
    '/v1/gas/timing': {
      get: {
        summary: 'Optimal transaction timing recommendation',
        operationId: 'gasTiming',
        parameters: [
          { name: 'chain', in: 'query', schema: { type: 'string', default: 'ethereum' } },
        ],
        responses: { 200: { description: 'TRANSACT_NOW / WAIT / URGENT_ONLY with reason and estimated savings' } },
      },
    },
  },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'Gas Optimizer API',
    version: '1.0.0',
    description: 'Multi-chain gas prices, USD estimates, and optimal timing for 7 chains',
    docs: '/docs',
    openapi: '/openapi.json',
    health: '/v1/health',
    endpoints: {
      now: 'GET /v1/gas/now?chain=ethereum',
      estimate: 'GET /v1/gas/estimate?chain=ethereum&txType=swap&speed=fast',
      compare: 'GET /v1/gas/compare',
      timing: 'GET /v1/gas/timing?chain=ethereum',
    },
    source: 'https://orbisapi.com',
  });
});

router.get('/openapi.json', (_req: Request, res: Response) => { res.json(openApiSpec); });
router.get('/docs', (_req: Request, res: Response) => {
  res.send(`<!DOCTYPE html><html><head><title>Gas Optimizer API — Docs</title><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.css"></head><body><div id="swagger-ui"></div><script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js"></script><script>SwaggerUIBundle({ url: '/openapi.json', dom_id: '#swagger-ui', presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset], layout: 'BaseLayout' });</script></body></html>`);
});

export default router;
