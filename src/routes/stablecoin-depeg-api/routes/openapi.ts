import { Router, Request, Response } from 'express';
const router = Router();
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string' }, success: { type: 'boolean' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Stablecoin Depeg Risk API',
      version: '1.0.0',
      description: 'Monitor stablecoin peg stability, collateral health, and depeg risk. Built for DeFi agents, risk managers, and autonomous trading workflows that hold or interact with stablecoins.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-pricing': { free_tier: { requests_per_day: 100 }, pay_per_call: { check: '$0.003', monitor: '$0.004', lookup: '$0.005' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice.',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/stablecoin-depeg' }],
    paths: {
      '/check': { post: { operationId: 'depegCheck', summary: 'Stablecoin peg check — deviation, risk score, collateral, recommendation', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['symbol'], properties: { symbol: { type: 'string', example: 'USDT' } } } } } }, responses: { '200': { description: 'Depeg risk result' }, '400': { description: 'Missing symbol' } } } },
      '/monitor': { post: { operationId: 'depegMonitor', summary: 'Batch stablecoin monitoring — up to 20 symbols with alerts', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['symbols'], properties: { symbols: { type: 'array', items: { type: 'string' }, maxItems: 20 } } } } } }, responses: { '200': { description: 'Batch monitoring results' }, '400': { description: 'Invalid input' } } } },
      '/lookup': { post: { operationId: 'depegLookup', summary: 'ONE-CALL: full depeg intelligence — peg, risk, history, issuer, market', 'x-one-call': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['symbol'], properties: { symbol: { type: 'string' } } } } } }, responses: { '200': { description: 'Full stablecoin intelligence' } } } },
    },
  });
});

export default router;
