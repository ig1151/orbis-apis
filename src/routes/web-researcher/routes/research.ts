import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { research } from '../services/researchService';

const router = Router();

const schema = Joi.object({
  query: Joi.string().min(3).max(500).required(),
  depth: Joi.string().valid('basic', 'deep').default('basic'),
});

router.get('/research', async (req: Request, res: Response) => {
  const { error, value } = schema.validate(req.query);
  if (error) {
    res.status(400).json({ error: 'Validation failed', detail: error.details[0].message });
    return;
  }

  try {
    const result = await research(value.query, value.depth);
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.log(`[web-researcher] error: ${err.message}`);
    res.status(502).json({ error: 'Research failed', detail: err.message });
  }
});


router.post('/research', async (req: Request, res: Response) => {
  const { error, value } = schema.validate(req.body);
  if (error) { res.status(400).json({ error: 'Validation failed', detail: error.details[0].message }); return; }
  try {
    const result = await research(value.query, value.depth);
    res.json({ success: true, data: result });
  } catch (err: any) { res.status(502).json({ error: 'Research failed', detail: err.message }); }
});

export default router;
