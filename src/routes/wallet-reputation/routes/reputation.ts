import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { getWalletReputation } from '../services/reputationService';

const router = Router();

const schema = Joi.object({
  address: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
});

router.get('/score', async (req: Request, res: Response) => {
  const { error, value } = schema.validate(req.query);
  if (error) {
    res.status(400).json({ error: 'Invalid Ethereum address', detail: error.details[0].message });
    return;
  }

  try {
    const result = await getWalletReputation(value.address);
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.log(`[wallet-reputation] error: ${err.message}`);
    res.status(502).json({ error: 'Failed to fetch wallet data', detail: err.message });
  }
});

export default router;
