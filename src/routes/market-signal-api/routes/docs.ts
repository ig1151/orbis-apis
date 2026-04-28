import { Router, Request, Response } from 'express';
const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'Market Signal API',
    version: '1.0.0',
    description: 'Composite buy/sell/hold signal scoring for stock tickers using RSI, MACD, volume spikes, MA crossovers and price change %.',
    endpoints: [
      { method: 'GET', path: '/v1/signal/:ticker', description: 'Composite signal for a stock ticker', example: '/v1/signal/AAPL' },
      { method: 'GET', path: '/v1/health', description: 'Health check' },
      { method: 'GET', path: '/docs', description: 'Documentation' },
      { method: 'GET', path: '/openapi.json', description: 'OpenAPI spec' }
    ],
    signals: { strong_buy: '75-100', buy: '60-74', neutral: '40-59', sell: '25-39', strong_sell: '0-24' }
  });
});

export default router;
