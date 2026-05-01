import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validateQuery } from '../middleware/validate';
import { getTriggeredFeed } from '../store/alerts';
import { logger } from '../logger';

const router = Router();

const schema = Joi.object({
  limit: Joi.number().min(1).max(50).default(20),
  symbol: Joi.string().uppercase().optional(),
});

router.get('/', validateQuery(schema), async (req: Request, res: Response): Promise<void> => {
  const limit = parseInt(req.query.limit as string) || 20;
  const symbol = req.query.symbol as string | undefined;

  try {
    let feed = getTriggeredFeed(100);
    if (symbol) feed = feed.filter(a => a.symbol.toUpperCase() === symbol.toUpperCase());
    feed = feed.slice(0, limit);

    logger.info({ count: feed.length, symbol }, 'alerts feed');
    res.json({
      success: true,
      data: {
        count: feed.length,
        alerts: feed,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'feed error');
    res.status(500).json({ error: 'Failed to fetch alert feed', details: err.message });
  }
});

export default router;
