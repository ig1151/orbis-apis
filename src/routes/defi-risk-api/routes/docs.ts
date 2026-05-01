import { Router, Request, Response } from 'express';
const router = Router();

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'DeFi Risk API',
    version: '1.0.0',
    description: 'DeFi protocol and token risk scoring — honeypot detection, rug pull analysis, liquidity health, and portfolio scanning for AI agents and traders. Powered by GoPlus Security + DeFiLlama + Claude AI.',
    contact: { url: 'https://orbisapi.com' },
  },
  servers: [{ url: 'https://defi-risk-api.onrender.com' }],
  paths: {
    '/v1/health': { get: { summary: 'Health check', responses: { 200: { description: 'OK' } } } },
    '/v1/token/safety': {
      get: {
        summary: 'Token contract safety — honeypot, mint, blacklist, holder concentration',
        operationId: 'tokenSafety',
        parameters: [
          { name: 'contract', in: 'query', required: true, schema: { type: 'string' }, description: 'Token contract address (0x...)' },
          { name: 'chain', in: 'query', schema: { type: 'string', enum: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche'], default: 'ethereum' } },
        ],
        responses: { 200: { description: 'Token safety analysis with risk score and AI narrative' } },
      },
    },
    '/v1/protocol/risk': {
      get: {
        summary: 'Protocol risk score — TVL trend, audit status, chain coverage',
        operationId: 'protocolRisk',
        parameters: [
          { name: 'protocol', in: 'query', required: true, schema: { type: 'string' }, description: 'DeFiLlama protocol slug (e.g. aave-v3, uniswap-v3)' },
        ],
        responses: { 200: { description: 'Protocol risk assessment with AI narrative' } },
      },
    },
    '/v1/liquidity/health': {
      get: {
        summary: 'Liquidity health — LP concentration, lock status, rug pull risk',
        operationId: 'liquidityHealth',
        parameters: [
          { name: 'contract', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'chain', in: 'query', schema: { type: 'string', enum: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche'], default: 'ethereum' } },
        ],
        responses: { 200: { description: 'Liquidity health analysis with rug pull risk assessment' } },
      },
    },
    '/v1/portfolio/scan': {
      get: {
        summary: 'Portfolio scan — analyze up to 5 token positions with aggregate risk score',
        operationId: 'portfolioScan',
        parameters: [
          { name: 'contracts', in: 'query', required: true, schema: { type: 'string' }, description: 'Comma-separated contract addresses (max 5)' },
          { name: 'chain', in: 'query', schema: { type: 'string', enum: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche'], default: 'ethereum' } },
        ],
        responses: { 200: { description: 'Portfolio risk scan with aggregate score and AI summary' } },
      },
    },
  },
};

router.get('/openapi.json', (_req: Request, res: Response) => { res.json(openApiSpec); });
router.get('/docs', (_req: Request, res: Response) => {
  res.send(`<!DOCTYPE html><html><head><title>DeFi Risk API — Docs</title><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.css"></head><body><div id="swagger-ui"></div><script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js"></script><script>SwaggerUIBundle({ url: '/openapi.json', dom_id: '#swagger-ui', presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset], layout: 'BaseLayout' });</script></body></html>`);
});

export default router;
