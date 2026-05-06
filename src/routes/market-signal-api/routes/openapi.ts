import { Router, Request, Response } from 'express';
const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.0.0',
    info: { title: 'Market Signal API', version: '1.0.0', description: 'Composite buy/sell/hold signal scoring for stock tickers using RSI, MACD, volume spikes, MA crossovers and price change %.' },
    servers: [{ url: 'https://orbis-apis.onrender.com/market-signal' }],
    paths: {
      '/{ticker}': {
        get: {
          summary: 'Get composite signal for a stock ticker',
          parameters: [{ name: 'ticker', in: 'path', required: true, schema: { type: 'string' }, example: 'AAPL', description: 'Stock ticker symbol (alphanum, uppercase, max 5 chars)' }],
          responses: { '200': { description: 'Signal response' }, '404': { description: 'Ticker not found' } }
        }
      },
      '/batch': {
        post: {
          summary: 'Get signals for multiple tickers',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['assets'], properties: { assets: { type: 'array', items: { type: 'string' }, description: 'Array of ticker symbols (required, 1-10 items)', example: ['AAPL', 'MSFT', 'GOOGL'] } } } } } },
          responses: { '200': { description: 'Batch signals' } }
        }
      },
    }
  });
});

export default router;
