import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { getLorisFundingData, convertRate, getInterval } from '../services/loris';
import { logger } from '../logger';
import { FundingRateNow, ExchangeRate } from '../types';

const router = Router();

const schema = Joi.object({
  symbol: Joi.string().uppercase().default('BTC'),
  exchanges: Joi.string().optional(), // comma-separated filter
});

function getSentiment(rate8h: number): ExchangeRate['sentiment'] {
  if (rate8h > 0.05) return 'BULLISH';
  if (rate8h < -0.05) return 'BEARISH';
  return 'NEUTRAL';
}

function getOverallSentiment(avg: number): FundingRateNow['overallSentiment'] {
  if (avg > 0.15) return 'STRONGLY_BULLISH';
  if (avg > 0.05) return 'BULLISH';
  if (avg < -0.15) return 'STRONGLY_BEARISH';
  if (avg < -0.05) return 'BEARISH';
  return 'NEUTRAL';
}

router.get('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const symbol = ((req.query.symbol as string) || 'BTC').toUpperCase();
  const exchangeFilter = req.query.exchanges
    ? (req.query.exchanges as string).split(',').map((e) => e.trim().toLowerCase())
    : null;

  try {
    const data = await getLorisFundingData();
    if (!data) {
      res.status(503).json({ error: 'Funding rate data unavailable' });
      return;
    }

    const rates: ExchangeRate[] = [];

    for (const [exchange, symbolRates] of Object.entries(data.funding_rates)) {
      if (exchangeFilter && !exchangeFilter.includes(exchange.toLowerCase())) continue;
      if (!(symbol in symbolRates)) continue;

      const rawRate = symbolRates[symbol];
      if (rawRate === null || rawRate === undefined) continue;

      const interval = getInterval(exchange);
      const { rate8h, annualized } = convertRate(rawRate, interval);

      rates.push({
        exchange: exchange.toUpperCase(),
        symbol,
        rate: annualized,
        rate8h,
        interval,
        sentiment: getSentiment(rate8h),
        updatedAt: data.timestamp,
      });
    }

    if (rates.length === 0) {
      res.status(404).json({ error: `No funding rate data found for ${symbol}` });
      return;
    }

    // Sort by exchange name
    rates.sort((a, b) => a.exchange.localeCompare(b.exchange));

    const avgRate = rates.reduce((s, r) => s + r.rate8h, 0) / rates.length;
    const maxRate = Math.max(...rates.map((r) => r.rate8h));
    const minRate = Math.min(...rates.map((r) => r.rate8h));

    const result: FundingRateNow = {
      symbol,
      rates,
      averageRate: Math.round(avgRate * 10000) / 10000,
      maxRate: Math.round(maxRate * 10000) / 10000,
      minRate: Math.round(minRate * 10000) / 10000,
      overallSentiment: getOverallSentiment(avgRate),
      updatedAt: data.timestamp,
    };

    logger.info({ symbol, rateCount: rates.length, avgRate, overallSentiment: result.overallSentiment }, 'rates/now');
    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message, symbol }, 'rates/now error');
    res.status(500).json({ error: 'Failed to fetch funding rates', details: err.message });
  }
});

export default router;
