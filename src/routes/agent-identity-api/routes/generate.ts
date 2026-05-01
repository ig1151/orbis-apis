import { Router, Request, Response } from 'express';
import Joi from 'joi';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { validateBody } from '../middleware/validate';
import { saveAgent } from '../store/agents';
import { logger } from '../logger';
import { AgentIdentity } from '../types';

const router = Router();

const VALID_CAPABILITIES = [
  'web-search', 'code-execution', 'file-management', 'api-calls',
  'crypto-transactions', 'data-analysis', 'content-generation',
  'email', 'calendar', 'database', 'image-generation', 'trading',
];

const schema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().min(10).max(500).required(),
  capabilities: Joi.array().items(Joi.string()).min(1).max(10).required(),
  walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).optional(),
  framework: Joi.string().valid('langchain', 'autogen', 'crewai', 'custom', 'openai', 'anthropic', 'other').optional(),
  operator: Joi.string().max(100).optional(),
  ttlDays: Joi.number().min(1).max(365).default(90),
});

router.post('/', validateBody(schema), async (req: Request, res: Response): Promise<void> => {
  const { name, description, capabilities, walletAddress, framework, operator } = req.body;
const ttlDays = parseInt(String(req.body.ttlDays || 90));

  try {
    const agentId = `agent_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + parseInt(String(ttlDays)) * 24 * 60 * 60 * 1000);

    const secret = process.env.AGENT_SECRET || 'default-secret-change-in-production';

    const payload = {
      agentId,
      name,
      capabilities,
      walletAddress: walletAddress || null,
      framework: framework || null,
      operator: operator || null,
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
    };

    const proof = jwt.sign(payload, secret);

    const identity: AgentIdentity = {
      agentId,
      walletAddress: walletAddress || null,
      name,
      description,
      capabilities,
      framework: framework || null,
      operator: operator || null,
      proof,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    saveAgent(identity);

    logger.info({ agentId, name, capabilities }, 'identity/generate');
    res.status(201).json({
      success: true,
      data: identity,
      message: `Agent identity created. Store the proof token securely — it cannot be recovered.`,
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'identity/generate error');
    res.status(500).json({ error: 'Failed to generate identity', details: err.message });
  }
});

export default router;
