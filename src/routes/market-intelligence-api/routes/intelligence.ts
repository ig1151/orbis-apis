import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { callAI } from '../services/ai';
import { logger } from '../logger';

const router = Router();

const schema = Joi.object({
  asset: Joi.string().min(1).max(20).uppercase().required(),
  timeframe: Joi.string().valid('1d', '7d', '30d', '90d').default('7d'),
  signals: Joi.array().items(Joi.string()).optional(),
});

const SYSTEM_PROMPT = `You are a market intelligence analyst for crypto and DeFi assets. Return a minified single-line JSON object with no newlines inside string values. Shape: {"asset":string,"sentiment":"bullish"|"bearish"|"neutral","sentimentScore":number,"trendDirection":"up"|"down"|"sideways","priceTargets":{"short":number,"mid":number,"long":number},"catalysts":string[],"headwinds":string[],"volumeAnalysis":string,"liquidityScore":number,"recommendation":string}`;

router.post('/', validate(schema, 'body'), async (req: Request, res: Response): Promise<void> => {
  const { asset, timeframe = '7d', signals = [] } = req.body;
  try {
    const prompt = `Analyze market intelligence for: "${asset}". Timeframe: ${timeframe}. Additional signals: ${signals.length ? signals.join(', ') : 'none'}. Return only the JSON object.`;
    const raw = await callAI(prompt, SYSTEM_PROMPT);
    let parsed: any;
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { asset, sentiment: 'neutral', sentimentScore: 50, trendDirection: 'sideways', priceTargets: { short: 0, mid: 0, long: 0 }, catalysts: [], headwinds: [], volumeAnalysis: 'unavailable', liquidityScore: 50, recommendation: raw.slice(0, 200) };
    }
    logger.info({ asset, timeframe }, 'market-intelligence/analyze');
    res.json({ success: true, data: parsed });
  } catch (err: any) {
    logger.error({ err: err.message, asset }, 'market-intelligence error');
    res.status(500).json({ error: 'Market intelligence failed', details: err.message });
  }
});

export default router;
