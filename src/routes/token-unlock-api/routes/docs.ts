import { Router, Request, Response } from 'express';
import { TOKEN_UNLOCKS } from '../data/unlocks';
const router = Router();

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Token Unlock API',
    version: '1.0.0',
    description: `Token unlock schedules, vesting data, and AI sell pressure forecasts. Track upcoming unlocks for ${TOKEN_UNLOCKS.length}+ major tokens including ARB, OP, APT, SUI, STRK, EIGEN, ZK. Powered by CoinGecko + Tavily + Claude AI.`,
    contact: { url: 'https://orbisapi.com' },
  },
  servers: [{ url: 'https://token-unlock-api.onrender.com' }],
  paths: {
    '/v1/health': { get: { summary: 'Health check', responses: { 200: { description: 'OK' } } } },
    '/v1/unlocks/upcoming': {
      get: {
        summary: 'Upcoming token unlocks in the next N days',
        operationId: 'getUpcoming',
        parameters: [
          { name: 'days', in: 'query', schema: { type: 'number', default: 30 } },
          { name: 'minUsd', in: 'query', schema: { type: 'number', default: 0 } },
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'e.g. Layer 2, Layer 1, Restaking' },
          { name: 'limit', in: 'query', schema: { type: 'number', default: 20 } },
        ],
        responses: { 200: { description: 'List of upcoming unlock events with USD estimates and sell pressure risk' } },
      },
    },
    '/v1/token/{symbol}/vesting': {
      get: {
        summary: 'Full vesting schedule for a token with AI analysis',
        operationId: 'getVesting',
        parameters: [{ name: 'symbol', in: 'path', required: true, schema: { type: 'string' }, description: 'Token symbol e.g. ARB, OP, SUI' }],
        responses: { 200: { description: 'Complete vesting schedule with upcoming/past unlocks and AI analysis' } },
      },
    },
    '/v1/unlocks/impact': {
      get: {
        summary: 'AI sell pressure forecast for a specific unlock event',
        operationId: 'getImpact',
        parameters: [
          { name: 'symbol', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'date', in: 'query', schema: { type: 'string' }, description: 'Specific unlock date YYYY-MM-DD (optional, defaults to next unlock)' },
        ],
        responses: { 200: { description: 'Sell pressure score, price impact estimate, and AI recommendation' } },
      },
    },
    '/v1/unlocks/calendar': {
      get: {
        summary: 'Unlock calendar filtered by date range, category, and size',
        operationId: 'getCalendar',
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'string' }, description: 'Start date YYYY-MM-DD' },
          { name: 'to', in: 'query', schema: { type: 'string' }, description: 'End date YYYY-MM-DD' },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'minUsd', in: 'query', schema: { type: 'number' } },
          { name: 'recipient', in: 'query', schema: { type: 'string' }, description: 'Filter by recipient e.g. Team, Investors' },
        ],
        responses: { 200: { description: 'Filtered unlock calendar' } },
      },
    },
  },
};

router.get('/openapi.json', (_req: Request, res: Response) => { res.json(openApiSpec); });
router.get('/docs', (_req: Request, res: Response) => {
  res.send(`<!DOCTYPE html><html><head><title>Token Unlock API — Docs</title><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.css"></head><body><div id="swagger-ui"></div><script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js"></script><script>SwaggerUIBundle({ url: '/openapi.json', dom_id: '#swagger-ui', presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset], layout: 'BaseLayout' });</script></body></html>`);
});

export default router;
