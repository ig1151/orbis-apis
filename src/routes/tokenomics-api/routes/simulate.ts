import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { callAI } from '../services/ai';
import { logger } from '../logger';

const router = Router();

const schema = Joi.object({
  token: Joi.string().required(),
  scenario: Joi.string().required(),
  timeHorizon: Joi.string().valid('3m', '6m', '12m', '24m').default('12m'),
  assumptions: Joi.object().default({}),
});

const SYSTEM_PROMPT = `You are a tokenomics simulation engine. Model token supply, demand, and price dynamics under various scenarios. Return a minified single-line JSON object with no newlines inside string values. Shape: {"token":string,"scenario":string,"timeHorizon":string,"projectedSupply":number,"projectedCirculation":number,"priceImpact":"positive"|"negative"|"neutral","priceChangePct":number,"demandDrivers":string[],"supplyPressures":string[],"criticalMilestones":string[],"probabilityOfSuccess":number,"simulationSummary":string}`;

router.post('/', validate(schema, 'body'), async (req: Request, res: Response): Promise<void> => {
  const { token, scenario, timeHorizon = '12m', assumptions = {} } = req.body;
  try {
    const prompt = `Simulate tokenomics for: "${token}". Scenario: "${scenario}". Time horizon: ${timeHorizon}. Assumptions: ${JSON.stringify(assumptions)}. Return only the JSON object.`;
    const raw = await callAI(prompt, SYSTEM_PROMPT);
    let parsed: any;
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { token, scenario, timeHorizon, projectedSupply: 0, projectedCirculation: 0, priceImpact: 'neutral', priceChangePct: 0, demandDrivers: [], supplyPressures: [], criticalMilestones: [], probabilityOfSuccess: 0.5, simulationSummary: raw.slice(0, 200) };
    }
    logger.info({ token, scenario, timeHorizon }, 'tokenomics/simulate');
    res.json({ success: true, data: parsed });
  } catch (err: any) {
    logger.error({ err: err.message, token }, 'tokenomics/simulate error');
    res.status(500).json({ error: 'Tokenomics simulation failed', details: err.message });
  }
});

export default router;
