import { Router, Request, Response } from 'express';
const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'Unified Decision API',
    version: '1.0.0',
    description: 'One API call that combines market signals, news impact and portfolio analysis into a single actionable decision for trading bots and AI agents.',
    endpoints: [
      { method: 'POST', path: '/v1/decide', description: 'Get a unified decision combining market signals, news impact and portfolio analysis' },
      { method: 'GET', path: '/v1/health', description: 'Health check' },
      { method: 'GET', path: '/docs', description: 'Documentation' },
      { method: 'GET', path: '/openapi.json', description: 'OpenAPI spec' }
    ],
    signals: {
      market_signal: 'RSI, MACD, moving averages, volume analysis',
      news_impact: 'Sentiment, impact score, action bias, drivers',
      portfolio_rebalance: 'Health score, drift, rebalance trigger, actions'
    },
    example: {
      portfolio: [
        { asset: 'BTC', value: 6000 },
        { asset: 'ETH', value: 3000 }
      ],
      risk_tolerance: 'medium',
      news: [
        { title: 'SEC moves closer to Bitcoin ETF approval', source: 'CoinDesk' }
      ]
    }
  });
});

export default router;
