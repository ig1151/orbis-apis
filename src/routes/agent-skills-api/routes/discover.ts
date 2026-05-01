import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validateQuery } from '../middleware/validate';
import { searchSkills, getAllSkills } from '../store/skills';
import { logger } from '../logger';

const router = Router();

const schema = Joi.object({
  q: Joi.string().optional().default(''),
  category: Joi.string().optional(),
  tags: Joi.string().optional(), // comma-separated
  limit: Joi.number().min(1).max(50).default(10),
});

router.get('/', validateQuery(schema), async (req: Request, res: Response): Promise<void> => {
  const query = (req.query.q as string) || '';
  const category = req.query.category as string | undefined;
  const tagsParam = req.query.tags as string | undefined;
  const limit = parseInt(req.query.limit as string) || 10;
  const tags = tagsParam ? tagsParam.split(',').map(t => t.trim()) : undefined;

  try {
    const results = query || category || tags
      ? searchSkills(query, category, tags)
      : getAllSkills();

    const paginated = results.slice(0, limit);

    logger.info({ query, category, count: paginated.length }, 'skills/discover');
    res.json({
      success: true,
      data: {
        query: query || null,
        category: category || null,
        totalFound: results.length,
        skills: paginated,
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'discover error');
    res.status(500).json({ error: 'Failed to discover skills', details: err.message });
  }
});

export default router;
