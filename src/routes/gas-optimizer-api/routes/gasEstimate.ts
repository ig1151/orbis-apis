import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { getChainGasData } from '../services/gas';
import { logger } from '../logger';

const router = Router();

const SUPPORTED_CHAINS = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'bsc', 'avalanche'];

const TX_TYPES: Record<string, number> = {
  transfer: 21000,
  erc20: 65000,
  swap: 150000,
  nft_mint: 200000,
  contract_deploy: 500000,
  custom: 0,
};

const schema = Joi.object({
  chain: Joi.string().valid(...SUPPORTED_CHAINS).default('ethereum'),
  txType: Joi.string().valid('transfer', 'erc20', 'swap', 'nft_mint', 'contract_deploy', 'custom').default('transfer'),
  gasLimit: Joi.number().min(21000).max(10000000).optional(),
  speed: Joi.string().valid('slow', 'standard', 'fast', 'instant').default('standard'),
});

router.get('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const chain = (req.query.chain as string) || 'ethereum';
  const txType = (req.query.txType as string) || 'transfer';
  const speed = (req.query.speed as string) || 'standard';
  const customGasLimit = req.query.gasLimit ? parseInt(req.query.gasLimit as string) : undefined;

  const gasLimit = customGasLimit || TX_TYPES[txType] || 21000;

  try {
    const data = await getChainGasData(chain);
    if (!data) {
      res.status(503).json({ error: `Unable to fetch gas data for ${chain}` });
      return;
    }

    const gasPriceGwei = data.gasPrice[speed as keyof typeof data.gasPrice] as number;
    const waitSeconds = data.estimatedWaitSeconds[speed as keyof typeof data.estimatedWaitSeconds];
    const nativePrice = data.nativeTokenPriceUsd;
    const ethCost = gasPriceGwei * gasLimit * 1e-9;
    const usdCost = nativePrice ? Math.round(ethCost * nativePrice * 10000) / 10000 : null;

    logger.info({ chain, txType, speed, gasLimit, usdCost }, 'gas/estimate');
    res.json({
      success: true,
      data: {
        chain,
        txType,
        gasLimit,
        speed,
        gasPriceGwei,
        nativeTokenCost: Math.round(ethCost * 1e8) / 1e8,
        nativeToken: data.nativeToken,
        usdCost,
        estimatedWaitSeconds: waitSeconds,
        congestion: data.congestion,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message, chain }, 'gas/estimate error');
    res.status(500).json({ error: 'Failed to estimate gas cost', details: err.message });
  }
});

export default router;
