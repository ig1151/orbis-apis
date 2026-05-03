import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { getTokenNews } from '../services/newsService';

const router = Router();

const schema = Joi.object({
  token: Joi.string().min(1).max(50).required(),
});

router.get('/news', async (req: Request, res: Response) => {
  const { error, value } = schema.validate(req.query);
  if (error) {
    res.status(400).json({ error: 'Validation failed', detail: error.details[0].message });
    return;
  }

  try {
    const result = await getTokenNews(value.token);
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.log(`[onchain-news] error: ${err.message}`);
    res.status(502).json({ error: 'Failed to fetch news', detail: err.message });
  }
});

export default router;
