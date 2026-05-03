import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { resolveENS, lookupAddress } from '../services/ensService';

const router = Router();

router.get('/resolve', async (req: Request, res: Response) => {
  const { error, value } = Joi.object({
    ens: Joi.string().min(3).max(100).required(),
  }).validate(req.query);

  if (error) {
    res.status(400).json({ error: 'Validation failed', detail: error.details[0].message });
    return;
  }

  try {
    const result = await resolveENS(value.ens);
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.log(`[ens-resolver] resolve error: ${err.message}`);
    res.status(502).json({ error: 'Failed to resolve ENS', detail: err.message });
  }
});

router.get('/lookup', async (req: Request, res: Response) => {
  const { error, value } = Joi.object({
    address: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  }).validate(req.query);

  if (error) {
    res.status(400).json({ error: 'Invalid address', detail: error.details[0].message });
    return;
  }

  try {
    const result = await lookupAddress(value.address);
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.log(`[ens-resolver] lookup error: ${err.message}`);
    res.status(502).json({ error: 'Failed to lookup address', detail: err.message });
  }
});

export default router;
