import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { getTrendingMarkets } from '../services/polymarket';
import { logger } from '../logger';

const router = Router();

const schema = Joi.object({
  limit: Joi.number().min(1).max(50).default(10),
  category: Joi.string().optional(),
});

router.get('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const limit = parseInt(req.query.limit as string) || 10;
  const category = req.query.category as string | undefined;

  try {
    const markets = await getTrendingMarkets(limit, category);

    if (markets.length === 0) {
      res.status(503).json({ error: 'Unable to fetch markets from Polymarket' });
      return;
    }

    logger.info({ count: markets.length, category }, 'markets/trending');
    res.json({
      success: true,
      data: {
        count: markets.length,
        category: category || 'all',
        markets,
        source: 'Polymarket',
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'trending error');
    res.status(500).json({ error: 'Failed to fetch trending markets', details: err.message });
  }
});

export default router;
