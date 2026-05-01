import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'meta-strategy-api',
    version: '1.0.0',
    strategyApi: process.env.STRATEGY_API_URL || 'https://strategy-signal-api.onrender.com',
    timestamp: new Date().toISOString(),
  });
});
export default router;
