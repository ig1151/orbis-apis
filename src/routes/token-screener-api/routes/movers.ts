import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { getTopTokens } from '../services/coingecko';
import { logger } from '../logger';

const router = Router();

const schema = Joi.object({
  timeframe: Joi.string().valid('1h', '24h', '7d').default('24h'),
  limit: Joi.number().min(1).max(20).default(10),
  minMarketCap: Joi.number().min(0).default(10000000),
});

router.get('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const timeframe = req.query.timeframe as string || '24h';
  const limit = parseInt(req.query.limit as string) || 10;
  const minMarketCap = parseFloat(req.query.minMarketCap as string) || 10000000;

  try {
    let tokens = await getTopTokens(250);
    tokens = tokens.filter(t => t.marketCap >= minMarketCap);

    const getChange = (t: typeof tokens[0]) => {
      if (timeframe === '1h') return t.change1h || 0;
      if (timeframe === '7d') return t.change7d || 0;
      return t.change24h;
    };

    const sorted = [...tokens].sort((a, b) => getChange(b) - getChange(a));

    const gainers = sorted.slice(0, limit).map(t => ({
      rank: t.rank,
      symbol: t.symbol,
      name: t.name,
      price: t.price,
      change: getChange(t),
      volume24h: t.volume24h,
      marketCap: t.marketCap,
      signals: t.signals,
    }));

    const losers = sorted.slice(-limit).reverse().map(t => ({
      rank: t.rank,
      symbol: t.symbol,
      name: t.name,
      price: t.price,
      change: getChange(t),
      volume24h: t.volume24h,
      marketCap: t.marketCap,
      signals: t.signals,
    }));

    logger.info({ timeframe, gainerCount: gainers.length, loserCount: losers.length }, 'movers');
    res.json({
      success: true,
      data: {
        timeframe,
        gainers,
        losers,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'movers error');
    res.status(500).json({ error: 'Failed to fetch movers', details: err.message });
  }
});

export default router;
