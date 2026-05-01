import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validateQuery } from '../middleware/validate';
import { getWhaleTransactions } from '../services/etherscan';
import { logger } from '../logger';

const router = Router();

const CHAIN_SYMBOLS: Record<string, string[]> = {
  ethereum: ['USDC', 'USDT', 'WETH', 'LINK', 'UNI'],
  bsc: ['USDT', 'USDC', 'BUSD', 'WBNB', 'CAKE'],
};

const schema = Joi.object({
  symbol: Joi.string().uppercase().optional(),
  chain: Joi.string().valid('ethereum', 'bsc').default('ethereum'),
  minUsd: Joi.number().min(10000).default(100000),
  limit: Joi.number().min(1).max(20).default(10),
});

router.get('/', validateQuery(schema), async (req: Request, res: Response): Promise<void> => {
  const chain = (req.query.chain as string) || 'ethereum';
  const validSymbols = CHAIN_SYMBOLS[chain];
  const defaultSymbol = chain === 'bsc' ? 'USDT' : 'USDC';
  const symbol = req.query.symbol
    ? (req.query.symbol as string).toUpperCase()
    : defaultSymbol;
  const minUsd = parseFloat(req.query.minUsd as string) || 100000;
  const limit = parseInt(req.query.limit as string) || 10;

  if (!validSymbols.includes(symbol)) {
    res.status(400).json({
      error: `Invalid symbol "${symbol}" for chain "${chain}"`,
      validSymbols,
    });
    return;
  }

  try {
    const transactions = await getWhaleTransactions(symbol, minUsd, limit, chain);

    const bullish = transactions.filter(t => t.sentiment === 'BULLISH').length;
    const bearish = transactions.filter(t => t.sentiment === 'BEARISH').length;
    const overallSentiment = bullish > bearish ? 'BULLISH' : bearish > bullish ? 'BEARISH' : 'NEUTRAL';

    logger.info({ symbol, chain, count: transactions.length, overallSentiment }, 'whale activity');
    res.json({
      success: true,
      data: {
        symbol,
        chain,
        minUsdFilter: minUsd,
        overallSentiment,
        bullishCount: bullish,
        bearishCount: bearish,
        transactions,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'whale activity error');
    res.status(500).json({ error: 'Failed to fetch whale activity', details: err.message });
  }
});

export default router;