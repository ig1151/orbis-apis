import { Router, Request, Response } from 'express';
import { TOKEN_UNLOCKS } from '../data/unlocks';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'token-unlock-api', version: '1.0.0', trackedTokens: TOKEN_UNLOCKS.length, timestamp: new Date().toISOString() });
});
export default router;
