import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { getDailyPrices } from '../services/alphaVantage';
import { buildSignal } from '../services/signalEngine';
import { logger } from '../middleware/logger';

const router = Router();

const schema = Joi.object({
  ticker: Joi.string().alphanum().min(1).max(5).uppercase().required()
});

const batchSchema = Joi.object({
  assets: Joi.array().items(Joi.string().alphanum().min(1).max(5).uppercase()).min(1).max(10).required()
});

// Single asset
router.get('/:ticker', async (req: Request, res: Response): Promise<void> => {
  const { error, value } = schema.validate(req.params);
  if (error) {
    res.status(400).json({ error: 'Invalid ticker', message: error.details[0].message });
    return;
  }
  try {
    const prices = await getDailyPrices(value.ticker);
    const result = buildSignal(value.ticker, prices);
    res.json(result);
  } catch (err: any) {
    const msg: string = err.message || 'Unknown error';
    logger.error({ ticker: value.ticker, msg }, 'Signal error');
    if (msg.includes('No data found')) { res.status(404).json({ error: 'Ticker not found', message: msg }); return; }
    if (msg.includes('rate limit')) { res.status(429).json({ error: 'Rate limit', message: msg }); return; }
    res.status(500).json({ error: 'Internal server error', message: msg });
  }
});

// Batch assets
router.post('/batch', async (req: Request, res: Response): Promise<void> => {
  const { error, value } = batchSchema.validate(req.body);
  if (error) {
    res.status(400).json({ error: 'Invalid request', message: error.details[0].message });
    return;
  }

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const results = await Promise.allSettled(
    value.assets.map(async (ticker: string, i: number) => {
      await delay(i * 1200);
      const prices = await getDailyPrices(ticker);
      return buildSignal(ticker, prices);
    })
  );

  const signals = results.map((result, i) => {
    if (result.status === 'fulfilled') {
      return {
        asset: value.assets[i],
        decision: result.value.decision,
        confidence: result.value.confidence,
        risk: result.value.risk,
        verdict: result.value.verdict,
        action: result.value.action,
        trend: result.value.trend
      };
    } else {
      return {
        asset: value.assets[i],
        error: result.reason?.message || 'Failed to fetch signal'
      };
    }
  });

  res.json({
    count: signals.length,
    results: signals,
    analyzedAt: new Date().toISOString()
  });
});

export default router;