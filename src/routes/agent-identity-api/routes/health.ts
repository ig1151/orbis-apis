import { Router, Request, Response } from 'express';
import { agentCount } from '../store/agents';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'agent-identity-api',
    version: '1.0.0',
    registeredAgents: agentCount(),
    timestamp: new Date().toISOString(),
  });
});
export default router;
