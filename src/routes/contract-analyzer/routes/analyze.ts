import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { analyzeContract } from '../services/analyzerService';

const router = Router();

const schema = Joi.object({
  address: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
});

router.get('/analyze', async (req: Request, res: Response) => {
  const { error, value } = schema.validate(req.query);
  if (error) {
    res.status(400).json({ error: 'Invalid contract address', detail: error.details[0].message });
    return;
  }

  try {
    const result = await analyzeContract(value.address);
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.log(`[contract-analyzer] error: ${err.message}`);
    res.status(502).json({ error: 'Analysis failed', detail: err.message });
  }
});

export default router;
