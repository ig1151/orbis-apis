import { Router, Request, Response } from 'express';
const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Strategy Execution API',
      version: '1.0.0',
      description: 'AI strategy engine that orchestrates news, signals and portfolio data into actionable trade decisions.',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/strategy-execution' }],
    paths: {
      '/v1/strategy/execute': {
        post: {
          summary: 'Execute a trading strategy',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['portfolio', 'strategy'],
                  properties: {
                    portfolio: { type: 'array', items: { type: 'object' } },
                    strategy: { type: 'string', enum: ['news_momentum', 'trend_following', 'risk_adjusted'] },
                    risk_tolerance: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' },
                    assets: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Strategy result with actions and reasoning' } },
        },
      },
      '/v1/strategy/backtest': {
        post: {
          summary: 'Backtest strategy across scenarios',
          responses: { '200': { description: 'Results across bear/neutral/bull scenarios' } },
        },
      },
      '/v1/strategy/list': {
        get: {
          summary: 'List available strategies',
          responses: { '200': { description: 'List of strategies' } },
        },
      },
      '/v1/health': {
        get: {
          summary: 'Health check',
          responses: { '200': { description: 'OK' } },
        },
      },
    },
  });
});

export default router;
