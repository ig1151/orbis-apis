import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'strategy-signal-api',
    version: '1.0.0',
    pipeline: {
      fundingRateApi: process.env.FUNDING_RATE_API_URL || 'https://funding-rate-api.onrender.com',
      predictionMarketApi: process.env.PREDICTION_MARKET_API_URL || 'https://prediction-market-api-g0xb.onrender.com',
      priceData: 'CoinGecko (internal)',
    },
    timestamp: new Date().toISOString(),
  });
});
export default router;
