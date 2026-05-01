import { Router, Request, Response } from 'express';
import { getAgent, getAgentByWallet } from '../store/agents';
import { logger } from '../logger';

const router = Router();

router.get('/:agentId', async (req: Request, res: Response): Promise<void> => {
  const { agentId } = req.params;

  try {
    // Support lookup by agentId or wallet address
    const identity = agentId.startsWith('0x')
      ? getAgentByWallet(agentId)
      : getAgent(agentId);

    if (!identity) {
      res.status(404).json({ error: `Agent "${agentId}" not found` });
      return;
    }

    // Return identity without the proof token for security
    const { proof: _proof, ...safeIdentity } = identity;

    logger.info({ agentId }, 'identity/lookup');
    res.json({ success: true, data: safeIdentity });
  } catch (err: any) {
    logger.error({ err: err.message, agentId }, 'lookup error');
    res.status(500).json({ error: 'Failed to lookup identity', details: err.message });
  }
});

export default router;
