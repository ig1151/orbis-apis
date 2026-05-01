import { Router, Request, Response } from 'express';
import { getChainGasData } from '../services/gas';
import { logger } from '../logger';

const router = Router();

const ALL_CHAINS = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'bsc', 'avalanche'];

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const results = await Promise.allSettled(
      ALL_CHAINS.map(chain => getChainGasData(chain).then(data => ({ chain, data })))
    );

    const chains = results
      .filter(r => r.status === 'fulfilled' && r.value.data)
      .map(r => {
        const { chain, data } = (r as any).value;
        return {
          chain,
          congestion: data.congestion,
          standardGwei: data.gasPrice.standard,
          fastGwei: data.gasPrice.fast,
          transferCostUsd: data.txCostUsd.transfer.standard,
          swapCostUsd: data.txCostUsd.swap.standard,
          recommendation: data.recommendation,
        };
      })
      .sort((a, b) => (a.swapCostUsd || 999) - (b.swapCostUsd || 999));

    const cheapest = chains[0];
    const mostExpensive = chains[chains.length - 1];

    logger.info({ chainCount: chains.length }, 'gas/compare');
    res.json({
      success: true,
      data: {
        chains,
        cheapestForSwap: cheapest?.chain || null,
        mostExpensiveForSwap: mostExpensive?.chain || null,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'gas/compare error');
    res.status(500).json({ error: 'Failed to compare gas prices', details: err.message });
  }
});

export default router;
