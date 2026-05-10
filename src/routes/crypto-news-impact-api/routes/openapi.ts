import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Crypto News Impact API',
      version: '1.0.0',
      description: 'Analyze the market impact of crypto news articles using AI.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': { '/analyze': 0.005 },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/crypto-news-impact' }],
    paths: {
      '/analyze': { post: { operationId: 'analyzeNewsImpact', summary: 'Analyze news impact on a crypto asset', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['asset', 'articles'], properties: {
          asset: { type: 'string', description: 'Crypto asset symbol e.g. BTC' },
          articles: { type: 'array', minItems: 1, maxItems: 10, items: { type: 'object', required: ['title'], properties: {
            title: { type: 'string' }, source: { type: 'string' }, published_at: { type: 'string' },
            url: { type: 'string' }, body: { type: 'string' },
          }}},
          topic: { type: 'string' },
        }}}}},
        responses: { '200': { description: 'Impact analysis', content: { 'application/json': { schema: { type: 'object', properties: {
          asset: { type: 'string' }, impact_score: { type: 'number' }, direction: { type: 'string', enum: ['bullish', 'bearish', 'neutral'] },
          magnitude: { type: 'string', enum: ['high', 'medium', 'low'] }, confidence: { type: 'number' },
          key_themes: { type: 'array', items: { type: 'string' } }, summary: { type: 'string' },
          confidence_per_section: { type: 'object' }, recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'string' },
        }}}}}}}},
    },
  });
});
export default router;
