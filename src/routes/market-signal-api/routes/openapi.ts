import { Router, Request, Response } from 'express';
const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.0.0',
    info: { title: 'Market Signal API', version: '1.0.0' },
    servers: [{ url: 'https://orbis-apis.onrender.com/market-signal' }],
    paths: {
      '/v1/signal/{ticker}': {
        get: {
          summary: 'Get composite signal for a stock ticker',
          parameters: [{ name: 'ticker', in: 'path', required: true, schema: { type: 'string' }, example: 'AAPL' }],
          responses: { '200': { description: 'Signal response' }, '404': { description: 'Ticker not found' } }
        }
      },
      '/v1/health': {
        get: { summary: 'Health check', responses: { '200': { description: 'OK' } } }
      }
    }
  });
});

export default router;