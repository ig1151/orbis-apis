import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { validateBody } from '../middleware/validate';
import { saveSkill, getSkill } from '../store/skills';
import { logger } from '../logger';
import { AgentSkill } from '../types';

const router = Router();

const schema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().min(10).max(500).required(),
  category: Joi.string().required(),
  capabilities: Joi.array().items(Joi.string()).min(1).required(),
  endpoint: Joi.string().uri().required(),
  method: Joi.string().valid('GET', 'POST').default('GET'),
  inputs: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    type: Joi.string().required(),
    required: Joi.boolean().required(),
    description: Joi.string().required(),
  })).default([]),
  outputs: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    type: Joi.string().required(),
    description: Joi.string().required(),
  })).default([]),
  pricingType: Joi.string().valid('free', 'per_call', 'subscription').default('per_call'),
  pricePerCall: Joi.number().min(0).optional().allow(null),
  framework: Joi.string().optional().allow(null),
  ownerAgentId: Joi.string().optional().allow(null),
  tags: Joi.array().items(Joi.string()).default([]),
  version: Joi.string().default('1.0.0'),
});

router.post('/', validateBody(schema), async (req: Request, res: Response): Promise<void> => {
  try {
    const skillId = `skill_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const skill: AgentSkill = {
      skillId,
      ...req.body,
      invocationCount: 0,
      lastInvokedAt: null,
      registeredAt: new Date().toISOString(),
      isActive: true,
    };

    saveSkill(skill);
    logger.info({ skillId, name: skill.name, category: skill.category }, 'skill registered');
    res.status(201).json({ success: true, data: skill });
  } catch (err: any) {
    logger.error({ err: err.message }, 'register error');
    res.status(500).json({ error: 'Failed to register skill', details: err.message });
  }
});

export default router;
