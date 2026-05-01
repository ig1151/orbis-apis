import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { getLorisFundingData, convertRate, getInterval } from '../services/loris';
import { logger } from '../logger';
import { FundingCompare, ExchangeRate, ArbitrageOpportunity } from '../types';

const router = Router();

const schema = Joi.object({
  symbol: Joi.string().uppercase().default('BTC'),
  minSpread: Joi.number().min(0).default(0.01), // min 8h spread % to show as arbitrage
});

router.get('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const symbol = (req.query.symbol as string).toUpperCase();
  const minSpread = parseFloat(req.query.minSpread as string) || 0.01;

  try {
    const data = await getLorisFundingData();
    if (!data) {
      res.status(503).json({ error: 'Funding rate data unavailable' });
      return;
    }

    const exchanges: ExchangeRate[] = [];

    for (const [exchange, symbolRates] of Object.entries(data.funding_rates)) {
      if (!(symbol in symbolRates)) continue;
      const rawRate = symbolRates[symbol];
      if (rawRate === null || rawRate === undefined) continue;

      const interval = getInterval(exchange);
      const { rate8h, annualized } = convertRate(rawRate, interval);

      exchanges.push({
        exchange: exchange.toUpperCase(),
        symbol,
        rate: annualized,
        rate8h,
        interval,
        sentiment: rate8h > 0.05 ? 'BULLISH' : rate8h < -0.05 ? 'BEARISH' : 'NEUTRAL',
        updatedAt: data.timestamp,
      });
    }

    exchanges.sort((a, b) => b.rate8h - a.rate8h);

    // Find arbitrage opportunities
    const arbitrageOpportunities: ArbitrageOpportunity[] = [];
    for (let i = 0; i < exchanges.length; i++) {
      for (let j = i + 1; j < exchanges.length; j++) {
        const high = exchanges[i];
        const low = exchanges[j];
        const spread8h = high.rate8h - low.rate8h;
        if (spread8h < minSpread) continue;

        const spreadAnnualized = Math.round(spread8h * 3 * 365 * 100) / 100;
        // Estimate fees: ~0.04% round-trip per 8h period
        const profitableAfterFees = spread8h > 0.04;

        arbitrageOpportunities.push({
          symbol,
          longExchange: low.exchange, // go long where rate is lower (pay less)
          shortExchange: high.exchange, // go short where rate is higher (receive more)
          longRate: low.rate8h,
          shortRate: high.rate8h,
          spreadAnnualized,
          spread8h: Math.round(spread8h * 10000) / 10000,
          profitableAfterFees,
        });
      }
    }

    const result: FundingCompare = {
      symbol,
      exchanges,
      arbitrageOpportunities: arbitrageOpportunities.slice(0, 10),
      updatedAt: data.timestamp,
    };

    logger.info({ symbol, exchangeCount: exchanges.length, arbCount: arbitrageOpportunities.length }, 'rates/compare');
    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message, symbol }, 'rates/compare error');
    res.status(500).json({ error: 'Failed to compare funding rates', details: err.message });
  }
});

export default router;
