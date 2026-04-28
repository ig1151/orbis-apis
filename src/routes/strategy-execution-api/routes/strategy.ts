import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { executeStrategy, StrategyRequest } from '../engine';
import { logger } from '../logger';

const router = Router();

const portfolioAssetSchema = Joi.object({
  asset: Joi.string().uppercase().min(2).max(10).required(),
  value: Joi.number().positive().required(),
  weight: Joi.number().min(0).max(1).required(),
});

const executeSchema = Joi.object({
  portfolio: Joi.array().items(portfolioAssetSchema).min(1).max(20).required(),
  strategy: Joi.string().valid('news_momentum', 'trend_following', 'risk_adjusted').required(),
  risk_tolerance: Joi.string().valid('low', 'medium', 'high').default('medium'),
  assets: Joi.array().items(Joi.string().uppercase()).max(10).optional(),
});

const strategies = [
  {
    name: 'news_momentum',
    description: 'Reacts to high-impact crypto news to adjust asset exposure',
    parameters: ['portfolio', 'assets', 'risk_tolerance'],
    risk_levels: ['low', 'medium', 'high'],
  },
  {
    name: 'trend_following',
    description: 'Follows strong directional market signals to enter or exit positions',
    parameters: ['portfolio', 'assets', 'risk_tolerance'],
    risk_levels: ['low', 'medium', 'high'],
  },
  {
    name: 'risk_adjusted',
    description: 'Rebalances portfolio to target weights based on risk tolerance',
    parameters: ['portfolio', 'risk_tolerance'],
    risk_levels: ['low', 'medium', 'high'],
  },
];

router.get('/list', (_req: Request, res: Response) => {
  res.json({ strategies, count: strategies.length });
});

router.post('/execute', async (req: Request, res: Response) => {
  const { error, value } = executeSchema.validate(req.body);
  if (error) {
    res.status(400).json({ error: 'Validation failed', details: error.details[0].message });
    return;
  }
  const start = Date.now();
  try {
    const result = await executeStrategy(value as StrategyRequest);
    const ms = Date.now() - start;
    logger.info({ strategy: value.strategy, decision: result.decision, ms }, 'Strategy executed');
    res.json({ ...result, latency_ms: ms });
  } catch (err) {
    logger.error({ err }, 'Strategy execution failed');
    res.status(500).json({ error: 'Strategy execution failed' });
  }
});

router.post('/backtest', async (req: Request, res: Response) => {
  const { error, value } = executeSchema.validate(req.body);
  if (error) {
    res.status(400).json({ error: 'Validation failed', details: error.details[0].message });
    return;
  }
  try {
    const scenarios = ['bearish', 'neutral', 'bullish'];
    const results = await Promise.all(
      scenarios.map(async (scenario) => {
        const result = await executeStrategy(value as StrategyRequest);
        return { scenario, ...result };
      })
    );
    res.json({ strategy: value.strategy, backtest_scenarios: results, timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error({ err }, 'Backtest failed');
    res.status(500).json({ error: 'Backtest failed' });
  }
});

export default router;
