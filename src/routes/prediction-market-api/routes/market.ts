import { Router, Request, Response } from 'express';
import { getTrendingMarkets } from '../services/polymarket';
import { logger } from '../logger';

const router = Router();

// GET /v1/market/:id — lookup by slug or condition ID
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    // Fetch a batch and find by slug or id
    const markets = await getTrendingMarkets(100);
    const found = markets.find(
      (m) => m.slug === id || m.id === id || m.slug.includes(id.toLowerCase())
    );

    if (!found) {
      res.status(404).json({
        error: `Market "${id}" not found`,
        hint: 'Use a market slug (e.g. will-btc-hit-100k-in-2026) or search /v1/markets/search?q=keyword',
      });
      return;
    }

    logger.info({ id, question: found.question }, 'market detail');
    res.json({ success: true, data: found });
  } catch (err: any) {
    logger.error({ err: err.message, id }, 'market detail error');
    res.status(500).json({ error: 'Failed to fetch market', details: err.message });
  }
});

export default router;
