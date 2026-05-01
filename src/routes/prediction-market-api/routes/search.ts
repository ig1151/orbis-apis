import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { searchMarkets } from '../services/polymarket';
import { logger } from '../logger';

const router = Router();

const schema = Joi.object({
  q: Joi.string().min(2).required(),
  limit: Joi.number().min(1).max(20).default(10),
});

router.get('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const query = req.query.q as string;
  const limit = parseInt(req.query.limit as string) || 10;

  try {
    const markets = await searchMarkets(query, limit * 3); // fetch more for filtering
    const results = markets.slice(0, limit);

    logger.info({ query, count: results.length }, 'markets/search');
    res.json({
      success: true,
      data: {
        query,
        count: results.length,
        markets: results,
        source: 'Polymarket',
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message, query }, 'search error');
    res.status(500).json({ error: 'Failed to search markets', details: err.message });
  }
});

export default router;
