import { Router, Request, Response } from 'express';
import { alertCount } from '../store/alerts';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'crypto-alerts-api', version: '1.0.0', activeAlerts: alertCount(), timestamp: new Date().toISOString() });
});
export default router;
