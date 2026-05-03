import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { simulateTransaction } from '../services/simulatorService';

const router = Router();

const schema = Joi.object({
  from: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  to: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  value: Joi.number().min(0).default(0),
  gasLimit: Joi.number().min(21000).max(10000000).default(21000),
});

router.get('/simulate', async (req: Request, res: Response) => {
  const { error, value } = schema.validate(req.query);
  if (error) {
    res.status(400).json({ error: 'Validation failed', detail: error.details[0].message });
    return;
  }

  try {
    const result = await simulateTransaction(value.from, value.to, value.value, value.gasLimit);
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.log(`[tx-simulator] error: ${err.message}`);
    res.status(502).json({ error: 'Simulation failed', detail: err.message });
  }
});

export default router;
