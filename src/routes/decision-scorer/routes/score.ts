import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { scoreDecision } from '../services/scorerService';

const router = Router();

router.post('/score', async (req: Request, res: Response) => {
  const { error, value } = Joi.object({
    decision: Joi.string().min(10).max(2000).required(),
    context: Joi.string().max(1000).optional(),
    goal: Joi.string().max(500).optional(),
  }).validate(req.body);

  if (error) {
    res.status(400).json({ error: 'Validation failed', detail: error.details[0].message });
    return;
  }

  try {
    const result = await scoreDecision(value.decision, value.context, value.goal);
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.log(`[decision-scorer] error: ${err.message}`);
    res.status(502).json({ error: 'Scoring failed', detail: err.message });
  }
});

export default router;
