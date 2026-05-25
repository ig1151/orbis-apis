import { Router, Request, Response } from 'express';
const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'NFT Floor Price API',
      version: '1.0.0',
      description: 'NFT collection floor prices, volume, market data, and risk signals. Supports collection comparison and full intelligence for NFT trading agents and portfolio trackers.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-pricing': { free_tier: { requests_per_day: 100 }, pay_per_call: { floor: '$0.003', compare: '$0.004', lookup: '$0.006' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice.',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/nft-floor-price' }],
    paths: {
      '/floor': { post: { operationId: 'nftFloor', summary: 'NFT floor price — current price, volume, supply, and signal', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['collection'], properties: { collection: { type: 'string', example: 'Bored Ape Yacht Club' }, chain: { type: 'string', default: 'ethereum' } } } } } }, responses: { '200': { description: 'Floor price data' }, '400': { description: 'Missing collection' } } } },
      '/compare': { post: { operationId: 'nftCompare', summary: 'Compare floor prices across up to 10 NFT collections', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['collections'], properties: { collections: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 10 }, chain: { type: 'string', default: 'ethereum' } } } } } }, responses: { '200': { description: 'Comparison results' } } } },
      '/lookup': { post: { operationId: 'nftLookup', summary: 'ONE-CALL: floor + volume + market + risk + investment grade', 'x-one-call': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['collection'], properties: { collection: { type: 'string' }, chain: { type: 'string', default: 'ethereum' } } } } } }, responses: { '200': { description: 'Full NFT collection intelligence' } } } },
    },
  });
});

export default router;
