import { Router, Request, Response, NextFunction } from 'express';
import { lookupSchema, batchSchema } from '../utils/validation';
import { lookupIP } from '../services/ip.service';
import type { LookupRequest, BatchRequest } from '../types/index';
export const lookupRouter = Router();

lookupRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ip = (req.query.ip as string || req.ip || '').trim();
    if (!ip) { res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'ip query parameter is required' } }); return; }
    const { error, value } = lookupSchema.validate({ ip }, { abortEarly: false });
    if (error) { res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: error.details.map((d) => d.message) } }); return; }
    const result = await lookupIP(value as LookupRequest);
    res.status(200).json(result);
  } catch (err) { next(err); }
});

lookupRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = lookupSchema.validate(req.body, { abortEarly: false });
    if (error) { res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: error.details.map((d) => d.message) } }); return; }
    const result = await lookupIP(value as LookupRequest);
    res.status(200).json(result);
  } catch (err) { next(err); }
});

lookupRouter.post('/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = batchSchema.validate(req.body, { abortEarly: false });
    if (error) { res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: error.details.map((d) => d.message) } }); return; }
    const t0 = Date.now();
    const results = await Promise.allSettled((value as BatchRequest).ips.map((ip: LookupRequest) => lookupIP(ip)));
    const out = results.map((r) => r.status === 'fulfilled' ? r.value : { error: r.reason instanceof Error ? r.reason.message : 'Unknown' });
    res.status(200).json({ batch_id: `batch_${Date.now()}`, total: (value as BatchRequest).ips.length, results: out, latency_ms: Date.now() - t0 });
  } catch (err) { next(err); }
});
