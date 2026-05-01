import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { getChainGasData } from '../services/gas';
import { logger } from '../logger';
import { OptimalTiming } from '../types';

const router = Router();

const SUPPORTED_CHAINS = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'bsc', 'avalanche'];

const schema = Joi.object({
  chain: Joi.string().valid(...SUPPORTED_CHAINS).default('ethereum'),
});

router.get('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const chain = (req.query.chain as string) || 'ethereum';

  try {
    const data = await getChainGasData(chain);
    if (!data) {
      res.status(503).json({ error: `Unable to fetch gas data for ${chain}` });
      return;
    }

    const { congestion, gasPrice, recommendation } = data;

    let timing: OptimalTiming['recommendation'] = 'TRANSACT_NOW';
    let reason = recommendation;
    let estimatedSavings: string | null = null;
    let bestTime = 'Now';

    if (congestion === 'HIGH') {
      timing = 'WAIT';
      reason = 'Gas is elevated. Waiting 1-3 hours could save 20-40% on fees.';
      estimatedSavings = '20-40%';
      bestTime = 'In 1-3 hours (weekday late night UTC)';
    } else if (congestion === 'VERY_HIGH') {
      timing = 'URGENT_ONLY';
      reason = 'Gas is very high. Only transact if urgent — waiting could save 40-60%.';
      estimatedSavings = '40-60%';
      bestTime = 'In 3-6 hours or early morning UTC (2-6 AM)';
    } else if (congestion === 'LOW') {
      timing = 'TRANSACT_NOW';
      reason = 'Gas is at low levels — ideal time to transact.';
      bestTime = 'Now';
    }

    const result: OptimalTiming = {
      chain,
      currentCongestion: congestion,
      currentGasGwei: gasPrice.standard,
      recommendation: timing,
      reason,
      estimatedSavingsIfWait: estimatedSavings,
      bestTimeToTransact: bestTime,
      updatedAt: new Date().toISOString(),
    };

    logger.info({ chain, congestion, timing }, 'gas/timing');
    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message, chain }, 'gas/timing error');
    res.status(500).json({ error: 'Failed to get timing recommendation', details: err.message });
  }
});

export default router;
