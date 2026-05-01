import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validateQuery } from '../middleware/validate';
import { getTrendingSkills, getAllSkills } from '../store/skills';
import { logger } from '../logger';

const router = Router();

const schema = Joi.object({
  limit: Joi.number().min(1).max(20).default(10),
});

router.get('/', validateQuery(schema), async (req: Request, res: Response): Promise<void> => {
  const limit = parseInt(req.query.limit as string) || 10;

  try {
    const trending = getTrendingSkills(limit);
    // If no invocations yet, return all skills sorted by registration
    const results = trending.length > 0 ? trending : getAllSkills().slice(0, limit);

    logger.info({ count: results.length }, 'skills/trending');
    res.json({
      success: true,
      data: {
        period: '24h',
        count: results.length,
        skills: results,
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'trending error');
    res.status(500).json({ error: 'Failed to fetch trending skills', details: err.message });
  }
});

export default router;
