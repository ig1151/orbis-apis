import { Router, Request, Response, NextFunction } from 'express';
import { scoreSchema, batchSchema } from '../utils/validation';
import { scoreLead } from '../services/leadquality.service';
import type { ScoreRequest, BatchRequest } from '../types/index';
export const scoreRouter = Router();

scoreRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = scoreSchema.validate(req.body, { abortEarly: false });
    if (error) { res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: error.details.map((d) => d.message) } }); return; }
    const result = await scoreLead(value as ScoreRequest);
    res.status(200).json(result);
  } catch (err) { next(err); }
});

scoreRouter.post('/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = batchSchema.validate(req.body, { abortEarly: false });
    if (error) { res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: error.details.map((d) => d.message) } }); return; }
    const t0 = Date.now();
    const results = await Promise.allSettled((value as BatchRequest).leads.map((l: ScoreRequest) => scoreLead(l)));
    const out = results.map((r) => r.status === 'fulfilled' ? r.value : { error: r.reason instanceof Error ? r.reason.message : 'Unknown' });
    res.status(200).json({ batch_id: `batch_${Date.now()}`, total: (value as BatchRequest).leads.length, results: out, latency_ms: Date.now() - t0 });
  } catch (err) { next(err); }
});
