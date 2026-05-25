import { Router, Request, Response } from 'express';
const router = Router();
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string' }, success: { type: 'boolean' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Top Movers API',
      version: '1.0.0',
      description: 'Real-time top crypto gainers, losers, and trending coins. Built for trading agents, market scanners, and portfolio dashboards that need to act on momentum signals.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-pricing': { free_tier: { requests_per_day: 100 }, pay_per_call: { gainers: '$0.002', losers: '$0.002', trending: '$0.002', lookup: '$0.005' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice.',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/top-movers' }],
    paths: {
      '/gainers': { post: { operationId: 'topGainers', summary: 'Top crypto gainers — ranked by % gain with momentum and signal', requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { limit: { type: 'integer', default: 10 }, timeframe: { type: 'string', default: '24h', enum: ['1h', '4h', '24h', '7d'] }, min_market_cap_usd: { type: 'number', default: 0 } } } } } }, responses: { '200': { description: 'Top gainers list' } } } },
      '/losers': { post: { operationId: 'topLosers', summary: 'Top crypto losers — ranked by % decline with recovery signals', requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { limit: { type: 'integer', default: 10 }, timeframe: { type: 'string', default: '24h', enum: ['1h', '4h', '24h', '7d'] }, min_market_cap_usd: { type: 'number', default: 0 } } } } } }, responses: { '200': { description: 'Top losers list' } } } },
      '/trending': { post: { operationId: 'trending', summary: 'Trending coins — by search volume, social mentions, and on-chain activity', requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { limit: { type: 'integer', default: 10 } } } } } }, responses: { '200': { description: 'Trending coins' } } } },
      '/lookup': { post: { operationId: 'moversLookup', summary: 'ONE-CALL: gainers + losers + trending + market sentiment snapshot', 'x-one-call': true, requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { limit: { type: 'integer', default: 5 }, timeframe: { type: 'string', default: '24h' } } } } } }, responses: { '200': { description: 'Full market movers snapshot' } } } },
    },
  });
});

export default router;
