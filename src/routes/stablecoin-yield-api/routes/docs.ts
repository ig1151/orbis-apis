import { Router, Request, Response } from 'express';
const router = Router();
router.get('/openapi.json', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Stablecoin Yield API',
      version: '1.0.0',
      description: 'Find the best stablecoin yield opportunities across 500+ DeFi protocols.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': { '/top': 0.002, '/best': 0.002, '/rates': 0.002, '/compare': 0.002 },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/stablecoin-yield' }],
    paths: {
      '/top': { get: { operationId: 'getTopYields', summary: 'Get top stablecoin yield opportunities', 'x-agent-callable': true,
        parameters: [
          { name: 'token', in: 'query', required: false, schema: { type: 'string', enum: ['USDC', 'USDT', 'DAI'], default: 'USDC' } },
          { name: 'chain', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'minTvl', in: 'query', required: false, schema: { type: 'number', default: 5000000 } },
          { name: 'riskTolerance', in: 'query', required: false, schema: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' } },
        ],
        responses: { '200': { description: 'Top yield pools', content: { 'application/json': { schema: { type: 'object', properties: {
          success: { type: 'boolean' },
          data: { type: 'object', properties: {
            token: { type: 'string' }, topPools: { type: 'array', items: { type: 'object' } },
            aiRecommendation: { type: 'string' }, highestApy: { type: 'object' },
            confidence_per_section: { type: 'object' },
            recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
            chain_to: { type: 'string' },
          }},
        }}}}}}}},
      '/best': { get: { operationId: 'getBestYield', summary: 'Get risk-adjusted best yield', 'x-agent-callable': true,
        parameters: [
          { name: 'token', in: 'query', required: false, schema: { type: 'string', default: 'USDC' } },
          { name: 'chain', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'riskTolerance', in: 'query', required: false, schema: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' } },
        ],
        responses: { '200': { description: 'Best yield recommendation' }}}},
      '/rates': { get: { operationId: 'getRates', summary: 'Get yield rates across protocols', 'x-agent-callable': true,
        parameters: [
          { name: 'token', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'chain', in: 'query', required: false, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Yield rates' }}}},
      '/compare': { get: { operationId: 'compareYields', summary: 'Compare yields across stablecoins', 'x-agent-callable': true,
        responses: { '200': { description: 'Yield comparison' }}}},
    },
  });
});
router.get('/docs', (_req: Request, res: Response) => {
  res.send("<h1>Stablecoin Yield API Docs</h1><p><a href='/stablecoin-yield/openapi.json'>OpenAPI Spec</a></p>");
});
export default router;
