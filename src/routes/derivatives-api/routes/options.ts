import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { callAI } from '../services/ai';
import { logger } from '../logger';

const router = Router();

const schema = Joi.object({
  underlying: Joi.string().uppercase().required(),
  strike: Joi.number().positive().required(),
  expiry: Joi.string().required(),
  optionType: Joi.string().valid('call', 'put').default('call'),
  spotPrice: Joi.number().positive().required(),
});

const SYSTEM_PROMPT = `You are a crypto options pricing and strategy intelligence engine. Return a minified single-line JSON object with no newlines inside string values. Shape: {"underlying":string,"strike":number,"expiry":string,"optionType":string,"impliedVolatility":number,"delta":number,"gamma":number,"theta":number,"vega":number,"theoreticalPrice":number,"breakeven":number,"maxProfit":number,"maxLoss":number,"strategyRating":string,"recommendation":string}`;

router.post('/', validate(schema, 'body'), async (req: Request, res: Response): Promise<void> => {
  const { underlying, strike, expiry, optionType = 'call', spotPrice } = req.body;
  try {
    const prompt = `Price and analyze ${optionType} option. Underlying: "${underlying}". Strike: ${strike}. Spot: ${spotPrice}. Expiry: ${expiry}. Return only the JSON object.`;
    const raw = await callAI(prompt, SYSTEM_PROMPT);
    let parsed: any;
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { underlying, strike, expiry, optionType, impliedVolatility: 0, delta: 0, gamma: 0, theta: 0, vega: 0, theoreticalPrice: 0, breakeven: 0, maxProfit: 0, maxLoss: 0, strategyRating: 'unknown', recommendation: raw.slice(0, 200) };
    }
    logger.info({ underlying, strike, optionType }, 'derivatives/options');
    res.json({ success: true, data: parsed });
  } catch (err: any) {
    logger.error({ err: err.message, underlying }, 'derivatives/options error');
    res.status(500).json({ error: 'Options analysis failed', details: err.message });
  }
});

export default router;
