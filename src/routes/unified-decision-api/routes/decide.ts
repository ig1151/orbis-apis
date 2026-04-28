import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { fetchMarketSignal, fetchNewsImpact, fetchPortfolioRebalance } from '../services/dataFetcher';
import { buildDecision } from '../services/decisionEngine';
import { logger } from '../middleware/logger';

const router = Router();

const schema = Joi.object({
  portfolio: Joi.array().items(
    Joi.object({
      asset: Joi.string().min(1).max(20).required(),
      value: Joi.number().min(0).required()
    })
  ).min(1).max(20).required(),
  risk_tolerance: Joi.string().valid('low', 'medium', 'high').required(),
  news: Joi.array().items(
    Joi.object({
      title: Joi.string().required(),
      source: Joi.string().optional(),
      published_at: Joi.string().optional(),
      body: Joi.string().optional()
    })
  ).max(10).optional(),
  primary_asset: Joi.string().min(1).max(20).optional()
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ error: 'Invalid request', message: error.details[0].message });
    return;
  }

  try {
    const portfolio = value.portfolio.map((p: any) => ({
      asset: p.asset.toUpperCase(),
      value: p.value
    }));

    // Primary asset = explicitly set, or largest holding
    const primaryAsset = value.primary_asset?.toUpperCase() ??
      portfolio.reduce((a: any, b: any) => a.value > b.value ? a : b).asset;

    // Fetch all signals in parallel
    const [market, news, portfolioCtx] = await Promise.all([
      fetchMarketSignal(primaryAsset),
      value.news && value.news.length > 0
        ? fetchNewsImpact(primaryAsset, value.news)
        : Promise.resolve(null),
      fetchPortfolioRebalance(portfolio, value.risk_tolerance)
    ]);

    const result = await buildDecision(value, primaryAsset, market, news, portfolioCtx);
    res.json(result);
  } catch (err: any) {
    const msg: string = err.message || 'Unknown error';
    logger.error({ msg }, 'Decision error');
    res.status(500).json({ error: 'Internal server error', message: msg });
  }
});

export default router;
