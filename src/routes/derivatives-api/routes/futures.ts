import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { callAI } from '../services/ai';
import { logger } from '../logger';

const router = Router();

const schema = Joi.object({
  underlying: Joi.string().uppercase().required(),
  expiry: Joi.string().required(),
  positionSize: Joi.number().positive().default(1),
  leverage: Joi.number().min(1).max(100).default(1),
});

const SYSTEM_PROMPT = `You are a derivatives intelligence engine specializing in crypto futures. Return a minified single-line JSON object with no newlines inside string values. Shape: {"underlying":string,"expiry":string,"fairValue":number,"basis":number,"fundingRate":number,"openInterest":number,"longShortRatio":number,"liquidationLevels":{"long":number,"short":number},"riskScore":number,"tradeRecommendation":string,"hedgeSuggestion":string}`;

router.post('/', validate(schema, 'body'), async (req: Request, res: Response): Promise<void> => {
  const { underlying, expiry, positionSize = 1, leverage = 1 } = req.body;
  try {
    const prompt = `Analyze futures for: "${underlying}". Expiry: ${expiry}. Position size: ${positionSize}. Leverage: ${leverage}x. Return only the JSON object.`;
    const raw = await callAI(prompt, SYSTEM_PROMPT);
    let parsed: any;
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { underlying, expiry, fairValue: 0, basis: 0, fundingRate: 0, openInterest: 0, longShortRatio: 1, liquidationLevels: { long: 0, short: 0 }, riskScore: 50, tradeRecommendation: raw.slice(0, 200), hedgeSuggestion: 'unavailable' };
    }
    logger.info({ underlying, expiry, leverage }, 'derivatives/futures');
    res.json({ success: true, data: parsed });
  } catch (err: any) {
    logger.error({ err: err.message, underlying }, 'derivatives/futures error');
    res.status(500).json({ error: 'Futures analysis failed', details: err.message });
  }
});

export default router;
