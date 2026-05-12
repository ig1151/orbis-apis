import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { callAI } from '../services/ai';
import { logger } from '../logger';

const router = Router();

const schema = Joi.object({
  token: Joi.string().required(),
  totalSupply: Joi.number().positive().required(),
  circulatingSupply: Joi.number().positive().required(),
  emissionRate: Joi.string().optional(),
  vestingSchedule: Joi.array().items(Joi.object()).default([]),
});

const SYSTEM_PROMPT = `You are a tokenomics analysis engine for DeFi and blockchain protocols. Return a minified single-line JSON object with no newlines inside string values. Shape: {"token":string,"inflationRisk":"low"|"medium"|"high","dilutionRisk":"low"|"medium"|"high","concentrationRisk":"low"|"medium"|"high","supplyHealthScore":number,"circulationRatio":number,"vestingPressureEvents":string[],"emissionSustainability":string,"holderIncentiveScore":number,"sellPressureOutlook":string,"overallGrade":string,"recommendations":string[]}`;

router.post('/', validate(schema, 'body'), async (req: Request, res: Response): Promise<void> => {
  const { token, totalSupply, circulatingSupply, emissionRate, vestingSchedule = [] } = req.body;
  try {
    const prompt = `Analyze tokenomics for: "${token}". Total supply: ${totalSupply}. Circulating: ${circulatingSupply}. Emission rate: ${emissionRate || 'unknown'}. Vesting schedule: ${JSON.stringify(vestingSchedule)}. Return only the JSON object.`;
    const raw = await callAI(prompt, SYSTEM_PROMPT);
    let parsed: any;
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { token, inflationRisk: 'medium', dilutionRisk: 'medium', concentrationRisk: 'medium', supplyHealthScore: 50, circulationRatio: circulatingSupply / totalSupply, vestingPressureEvents: [], emissionSustainability: 'unknown', holderIncentiveScore: 50, sellPressureOutlook: 'neutral', overallGrade: 'C', recommendations: [] };
    }
    logger.info({ token, totalSupply, circulatingSupply }, 'tokenomics/analyze');
    res.json({ success: true, data: parsed });
  } catch (err: any) {
    logger.error({ err: err.message, token }, 'tokenomics/analyze error');
    res.status(500).json({ error: 'Tokenomics analysis failed', details: err.message });
  }
});

export default router;
