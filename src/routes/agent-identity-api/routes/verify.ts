import { Router, Request, Response } from 'express';
import Joi from 'joi';
import jwt from 'jsonwebtoken';
import { validateBody } from '../middleware/validate';
import { getAgent } from '../store/agents';
import { logger } from '../logger';
import { VerifyResult } from '../types';

const router = Router();

const schema = Joi.object({
  proof: Joi.string().required(),
});

router.post('/', validateBody(schema), async (req: Request, res: Response): Promise<void> => {
  const { proof } = req.body;

  try {
    const secret = process.env.AGENT_SECRET || 'default-secret-change-in-production';

    let decoded: any;
    try {
      decoded = jwt.verify(proof, secret);
    } catch (jwtErr: any) {
      const result: VerifyResult = {
        valid: false,
        agentId: null,
        reason: jwtErr.name === 'TokenExpiredError' ? 'Proof has expired' : 'Invalid proof signature',
        identity: null,
      };
      res.json({ success: true, data: result });
      return;
    }

    const identity = getAgent(decoded.agentId);

    if (!identity) {
      const result: VerifyResult = {
        valid: false,
        agentId: decoded.agentId,
        reason: 'Agent not found in registry — proof may be from a different instance',
        identity: null,
      };
      res.json({ success: true, data: result });
      return;
    }

    const result: VerifyResult = {
      valid: true,
      agentId: decoded.agentId,
      reason: 'Valid proof — agent is registered and active',
      identity,
    };

    logger.info({ agentId: decoded.agentId }, 'identity/verify success');
    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message }, 'identity/verify error');
    res.status(500).json({ error: 'Failed to verify identity', details: err.message });
  }
});

export default router;
