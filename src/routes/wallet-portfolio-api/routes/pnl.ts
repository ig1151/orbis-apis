import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { getTxList, getEthPrice } from '../services/etherscan';
import { logger } from '../logger';
import { WalletPnL } from '../types';

const router = Router();

const SUPPORTED_CHAINS = ['ethereum', 'base', 'arbitrum', 'polygon', 'optimism', 'bsc'];

const schema = Joi.object({
  address: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  chain: Joi.string().valid(...SUPPORTED_CHAINS).default('ethereum'),
  period: Joi.string().valid('7d', '30d', '90d').default('30d'),
});

router.get('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const { address, chain, period } = req.query as { address: string; chain: string; period: string };

  const periodDays = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  const cutoff = Math.floor(Date.now() / 1000) - periodDays * 24 * 3600;

  try {
    const [txList, ethPrice] = await Promise.all([
      getTxList(address, chain, 200),
      getEthPrice(),
    ]);

    const periodTxs = txList.filter((tx: any) => parseInt(tx.timeStamp) >= cutoff);

    let ethReceived = 0;
    let ethSent = 0;
    const activeDays = new Set<string>();
    let largestTx: WalletPnL['largestTx'] = null;
    let largestValue = 0;

    for (const tx of periodTxs) {
      const valueEth = parseInt(tx.value) / 1e18;
      const isOut = tx.from.toLowerCase() === address.toLowerCase();
      const date = new Date(parseInt(tx.timeStamp) * 1000).toISOString().slice(0, 10);
      activeDays.add(date);

      if (isOut) {
        ethSent += valueEth;
      } else {
        ethReceived += valueEth;
      }

      if (valueEth > largestValue) {
        largestValue = valueEth;
        largestTx = {
          hash: tx.hash,
          valueEth,
          valueUsd: ethPrice ? Math.round(valueEth * ethPrice) : null,
          direction: isOut ? 'OUT' : 'IN',
          timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
        };
      }
    }

    const netEthFlow = ethReceived - ethSent;
    const netEthFlowUsd = ethPrice ? Math.round(netEthFlow * ethPrice) : null;
    const avgTxValueEth = periodTxs.length > 0
      ? Math.round(((ethReceived + ethSent) / periodTxs.length) * 10000) / 10000
      : 0;

    // Estimated PnL is net ETH flow converted to USD
    // This is a simplified estimate — true PnL requires cost basis tracking
    const estimatedPnlUsd = netEthFlowUsd;
    const pnlNote = 'Estimated from net ETH flow only. Does not include token gains/losses or gas costs. Not financial advice.';

    const result: WalletPnL = {
      address,
      chain,
      period,
      ethReceived: Math.round(ethReceived * 10000) / 10000,
      ethSent: Math.round(ethSent * 10000) / 10000,
      netEthFlow: Math.round(netEthFlow * 10000) / 10000,
      netEthFlowUsd,
      txCount: periodTxs.length,
      activedays: activeDays.size,
      avgTxValueEth,
      largestTx,
      estimatedPnlUsd,
      pnlNote,
      analyzedAt: new Date().toISOString(),
    };

    logger.info({ address, chain, period, txCount: periodTxs.length, netEthFlowUsd }, 'wallet/pnl');
    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message, address, chain }, 'pnl error');
    res.status(500).json({ error: 'Failed to calculate wallet PnL', details: err.message });
  }
});

export default router;
