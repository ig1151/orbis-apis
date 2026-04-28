import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { executeAction } from '../actions/executor';
import { logger } from '../logger';

const router = Router();

const AVAILABLE_ACTIONS = ['send_outreach', 'enrich_lead', 'research_company', 'find_contacts', 'score_lead', 'draft_proposal'];

const schema = Joi.object({
  action: Joi.string().valid(...AVAILABLE_ACTIONS).required(),
  company: Joi.string().max(200).optional(),
  lead: Joi.object().optional(),
  goal: Joi.string().max(300).optional(),
  contact_role: Joi.string().max(100).optional(),
  sender_name: Joi.string().max(100).optional(),
  sender_company: Joi.string().max(100).optional(),
  tone: Joi.string().valid('professional', 'casual', 'direct').optional(),
  focus: Joi.string().max(200).optional(),
  criteria: Joi.string().max(200).optional(),
  budget: Joi.string().max(100).optional(),
  name: Joi.string().max(200).optional(),
  email: Joi.string().max(200).optional(),
});

router.post('/action', async (req: Request, res: Response) => {
  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ error: 'Validation failed', details: error.details[0].message });
    return;
  }

  const { action, ...input } = value;
  logger.info({ action }, 'Action started');

  const result = await executeAction(action, input);

  logger.info({ action, status: result.status, ms: result.execution_time_ms }, 'Action complete');
  res.json(result);
});

router.get('/actions', (_req: Request, res: Response) => {
  res.json({
    actions: [
      { name: 'send_outreach', description: 'Generate a ready-to-send cold outreach email', inputs: ['company', 'contact_role', 'goal', 'sender_name', 'sender_company', 'tone'] },
      { name: 'enrich_lead', description: 'Enrich a lead with company and contact data', inputs: ['company', 'name', 'email'] },
      { name: 'research_company', description: 'Research a company and return structured intelligence', inputs: ['company', 'focus'] },
      { name: 'find_contacts', description: 'Find the best contacts at a company for a goal', inputs: ['company', 'goal'] },
      { name: 'score_lead', description: 'Score and qualify a lead with reasoning', inputs: ['lead', 'criteria'] },
      { name: 'draft_proposal', description: 'Draft a business proposal for a company and goal', inputs: ['company', 'goal', 'sender_company', 'budget'] },
    ],
    count: AVAILABLE_ACTIONS.length,
  });
});

export default router;
