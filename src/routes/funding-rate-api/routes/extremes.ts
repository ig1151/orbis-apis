import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { getLorisFundingData, convertRate, getInterval } from '../services/loris';
import { logger } from '../logger';
import { ExtremeRate } from '../types';

const router = Router();

const schema = Joi.object({
  limit: Joi.number().min(1).max(50).default(10),
  direction: Joi.string().valid('long', 'short', 'both').default('both'),
  exchange: Joi.string().optional(),
});

router.get('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const limit = parseInt(req.query.limit as string) || 10;
  const direction = req.query.direction as string || 'both';
  const exchangeFilter = req.query.exchange as string | undefined;

  try {
    const data = await getLorisFundingData();
    if (!data) {
      res.status(503).json({ error: 'Funding rate data unavailable' });
      return;
    }

    const allRates: ExtremeRate[] = [];

    for (const [exchange, symbolRates] of Object.entries(data.funding_rates)) {
      if (exchangeFilter && exchange.toLowerCase() !== exchangeFilter.toLowerCase()) continue;

      const interval = getInterval(exchange);
      for (const [symbol, rawRate] of Object.entries(symbolRates)) {
        if (rawRate === null || rawRate === undefined) continue;
        const { rate8h } = convertRate(rawRate as number, interval);

        allRates.push({
          symbol,
          exchange: exchange.toUpperCase(),
          rate: rawRate as number,
          rate8h,
          direction: rate8h >= 0 ? 'LONG_HEAVY' : 'SHORT_HEAVY',
        });
      }
    }

    let filtered = allRates;
    if (direction === 'long') filtered = allRates.filter((r) => r.rate8h > 0);
    else if (direction === 'short') filtered = allRates.filter((r) => r.rate8h < 0);

    // Sort by absolute rate
    if (direction === 'short') {
      filtered.sort((a, b) => a.rate8h - b.rate8h); // most negative first
    } else {
      filtered.sort((a, b) => Math.abs(b.rate8h) - Math.abs(a.rate8h)); // highest absolute first
    }

    const topLong = allRates.filter((r) => r.rate8h > 0).sort((a, b) => b.rate8h - a.rate8h).slice(0, limit);
    const topShort = allRates.filter((r) => r.rate8h < 0).sort((a, b) => a.rate8h - b.rate8h).slice(0, limit);

    logger.info({ direction, limit, totalRates: allRates.length }, 'rates/extremes');
    res.json({
      success: true,
      data: {
        topLongHeavy: direction !== 'short' ? topLong : undefined,
        topShortHeavy: direction !== 'long' ? topShort : undefined,
        totalSymbolsTracked: [...new Set(allRates.map((r) => r.symbol))].length,
        updatedAt: data.timestamp,
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'rates/extremes error');
    res.status(500).json({ error: 'Failed to fetch extreme rates', details: err.message });
  }
});

export default router;
