import { Router, Request, Response } from 'express';
const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.0.0',
    info: { title: 'Market Intelligence API', version: '1.0.0', description: 'Market decision + trust scoring mashup for smarter trading decisions' },
    servers: [{ url: 'https://orbis-apis.onrender.com/market-intelligence' }],
    paths: {
      '/{ticker}': {
        get: {
          summary: 'Get full market intelligence for a ticker',
          parameters: [{ name: 'ticker', in: 'path', required: true, schema: { type: 'string' }, example: 'AAPL', description: 'Stock ticker symbol (alphanum, uppercase, max 10 chars)' }],
          responses: { '200': { description: 'Intelligence response' }, '400': { description: 'Invalid ticker' }, '404': { description: 'Asset not found' } }
        }
      },
    }
  });
});

export default router;
