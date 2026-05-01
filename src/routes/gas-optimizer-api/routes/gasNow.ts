import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { getChainGasData } from '../services/gas';
import { logger } from '../logger';

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

    logger.info({ chain, congestion: data.congestion, fast: data.gasPrice.fast }, 'gas/now');
    res.json({ success: true, data });
  } catch (err: any) {
    logger.error({ err: err.message, chain }, 'gas/now error');
    res.status(500).json({ error: 'Failed to fetch gas prices', details: err.message });
  }
});

export default router;
