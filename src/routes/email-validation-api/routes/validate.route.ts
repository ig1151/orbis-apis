import { Router, Request, Response, NextFunction } from 'express';
import { validateSchema, batchSchema } from '../utils/validation';
import { validateEmail } from '../services/validation.service';
import type { ValidateRequest, BatchRequest } from '../types/index';
export const validateRouter = Router();

validateRouter.post('/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = validateSchema.validate(req.body, { abortEarly: false });
    if (error) { res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: error.details.map((d) => d.message) } }); return; }
    const result = await validateEmail(value as ValidateRequest);
    res.status(200).json(result);
  } catch (err) { next(err); }
});

validateRouter.post('/validate/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = batchSchema.validate(req.body, { abortEarly: false });
    if (error) { res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: error.details.map((d) => d.message) } }); return; }
    const t0 = Date.now();
    const results = await Promise.allSettled((value as BatchRequest).emails.map((e: ValidateRequest) => validateEmail(e)));
    const out = results.map((r) => r.status === 'fulfilled' ? r.value : { error: r.reason instanceof Error ? r.reason.message : 'Unknown' });
    const valid = out.filter((r) => !('error' in r) && (r as { status: string }).status === 'valid').length;
    const invalid = out.filter((r) => !('error' in r) && (r as { status: string }).status === 'invalid').length;
    const risky = out.filter((r) => !('error' in r) && (r as { status: string }).status === 'risky').length;
    res.status(200).json({ batch_id: `batch_${Date.now()}`, total: (value as BatchRequest).emails.length, valid, invalid, risky, results: out, latency_ms: Date.now() - t0 });
  } catch (err) { next(err); }
});

validateRouter.get('/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = (req.query.email as string || '').trim();
    if (!email) { res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'email query parameter is required' } }); return; }
    const { error, value } = validateSchema.validate({ email, check_mx: req.query.check_mx !== 'false', check_disposable: req.query.check_disposable !== 'false', check_spam_trap: req.query.check_spam_trap !== 'false' }, { abortEarly: false });
    if (error) { res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: error.details.map((d) => d.message) } }); return; }
    const result = await validateEmail(value as ValidateRequest);
    res.status(200).json(result);
  } catch (err) { next(err); }
});
