import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { getEthBalance, getEthPrice, getTokenBalances, getTokenBalance, getTxList } from '../services/etherscan';
import { getTokenPriceByContract, getEthPriceFromCoinGecko } from '../services/coingecko';
import { logger } from '../logger';

const router = Router();

const SUPPORTED_CHAINS = ['ethereum', 'base', 'arbitrum', 'polygon', 'optimism', 'bsc'];

const schema = Joi.object({
  address: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  chain: Joi.string().valid(...SUPPORTED_CHAINS).default('ethereum'),
});

router.get('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const { address, chain } = req.query as { address: string; chain: string };

  try {
    const ethBalance = await getEthBalance(address, chain);
    const ethPrice = await getEthPrice();
    const tokenTxs = await getTokenBalances(address, chain);
    const txList = await getTxList(address, chain, 10);

    const ethBalanceNum = parseFloat(ethBalance);
    const ethBalanceUsd = ethPrice ? Math.round(ethBalanceNum * ethPrice) : null;

    // Get token balances with prices
    const tokens: Array<{
      symbol: string; name: string; contractAddress: string;
      balance: string; decimals: number; usdValue: number | null;
      priceUsd: number | null; chain: string; allocationPercent: number;
    }> = [];

    for (const token of tokenTxs.slice(0, 8)) {
      const rawBalance = await getTokenBalance(address, token.contractAddress, chain);
      const balance = (parseInt(rawBalance) / Math.pow(10, token.decimals)).toFixed(4);
      const balanceNum = parseFloat(balance);
      if (balanceNum <= 0) continue;

      const priceUsd = await getTokenPriceByContract(token.contractAddress, chain);
      const usdValue = priceUsd ? Math.round(balanceNum * priceUsd) : null;

      tokens.push({
        symbol: token.symbol, name: token.name, contractAddress: token.contractAddress,
        balance, decimals: token.decimals, usdValue, priceUsd, chain, allocationPercent: 0,
      });
    }

    const totalTokensUsd = tokens.reduce((s, t) => s + (t.usdValue || 0), 0);
    const totalPortfolioUsd = ethBalanceUsd !== null ? ethBalanceUsd + totalTokensUsd : null;

    // Allocation percentages
    const allocation: Record<string, number> = {};
    if (totalPortfolioUsd && totalPortfolioUsd > 0) {
      if (ethBalanceUsd) {
        allocation['ETH'] = Math.round((ethBalanceUsd / totalPortfolioUsd) * 100);
      }
      for (const token of tokens) {
        if (token.usdValue) {
          const pct = Math.round((token.usdValue / totalPortfolioUsd) * 100);
          allocation[token.symbol] = pct;
          token.allocationPercent = pct;
        }
      }
    }

    // Risk score (0-100, higher = riskier)
    let riskScore = 30; // base
    const overexposedAssets: string[] = [];

    // Concentration risk
    for (const [symbol, pct] of Object.entries(allocation)) {
      if (pct >= 80) { riskScore += 40; overexposedAssets.push(symbol); }
      else if (pct >= 60) { riskScore += 20; overexposedAssets.push(symbol); }
    }

    // Diversification bonus
    const assetCount = Object.keys(allocation).length;
    if (assetCount >= 5) riskScore -= 15;
    else if (assetCount <= 1) riskScore += 20;

    // Low value = higher risk (less buffer)
    if (!totalPortfolioUsd || totalPortfolioUsd < 1000) riskScore += 15;
    else if (totalPortfolioUsd > 50000) riskScore -= 10;

    riskScore = Math.max(0, Math.min(100, riskScore));

    // Suggested action
    let suggestedAction = 'hold';
    if (overexposedAssets.length > 0) suggestedAction = 'rebalance';
    else if (assetCount <= 1 && totalPortfolioUsd && totalPortfolioUsd > 5000) suggestedAction = 'diversify';
    else if (riskScore >= 70) suggestedAction = 'reduce-risk';
    else if (tokens.length === 0 && ethBalanceNum > 0) suggestedAction = 'diversify';

    // Simple 24h PnL estimate using ETH price change
    // We approximate by comparing current ETH price vs yesterday's
    // CoinGecko free tier doesn't give 24h ago price easily, so we use tx-based estimation
    const pnl24h: string | null = null; // placeholder — requires price history endpoint

    const topHoldings = [...tokens]
      .sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0))
      .slice(0, 5);

    const lastTx = txList[0];

    logger.info({ address, chain, totalPortfolioUsd, riskScore, suggestedAction }, 'wallet/snapshot');
    res.json({
      success: true,
      data: {
        address,
        chain,
        ethBalance,
        ethBalanceUsd,
        totalTokensUsd: Math.round(totalTokensUsd),
        totalPortfolioUsd,
        pnl24h,
        allocation,
        riskScore,
        overexposedAssets,
        suggestedAction,
        tokens,
        topHoldings,
        txCount: txList.length,
        lastActivityAt: lastTx ? new Date(parseInt(lastTx.timeStamp) * 1000).toISOString() : null,
        snapshotAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message, address, chain }, 'snapshot error');
    res.status(500).json({ error: 'Failed to fetch wallet snapshot', details: err.message });
  }
});


router.post('/snapshot', async (req: Request, res: Response): Promise<void> => {
  req.query = { ...req.query, ...req.body };
  return (router as any).handle(req, res, () => res.status(404).json({ error: 'Not found' }));
});

router.post('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  req.query = { ...req.query, ...req.body };
  const { address, chain } = req.body as { address: string; chain: string };
  try {
    const ethBalance = await getEthBalance(address, chain || 'ethereum');
    const ethPrice = await getEthPrice();
    const tokenTxs = await getTokenBalances(address, chain || 'ethereum');
    const txList = await getTxList(address, chain || 'ethereum', 10);
    const ethBalanceNum = parseFloat(ethBalance);
    const ethBalanceUsd = ethPrice ? Math.round(ethBalanceNum * ethPrice) : null;
    const tokens: any[] = [];
    for (const token of tokenTxs.slice(0, 8)) {
      const rawBalance = await getTokenBalance(address, token.contractAddress, chain || 'ethereum');
      const balance = (parseInt(rawBalance) / Math.pow(10, token.decimals)).toFixed(4);
      const balanceNum = parseFloat(balance);
      if (balanceNum <= 0) continue;
      const priceUsd = await getTokenPriceByContract(token.contractAddress, chain || 'ethereum');
      const usdValue = priceUsd ? Math.round(balanceNum * priceUsd) : null;
      tokens.push({ symbol: token.symbol, name: token.name, contractAddress: token.contractAddress, balance, decimals: token.decimals, usdValue, priceUsd, chain: chain || 'ethereum', allocationPercent: 0 });
    }
    const totalTokensUsd = tokens.reduce((s, t) => s + (t.usdValue || 0), 0);
    const totalPortfolioUsd = ethBalanceUsd !== null ? ethBalanceUsd + totalTokensUsd : null;
    res.json({ success: true, data: { address, chain: chain || 'ethereum', ethBalance, ethBalanceUsd, totalTokensUsd: Math.round(totalTokensUsd), totalPortfolioUsd, tokens, snapshotAt: new Date().toISOString() } });
  } catch (err: any) { res.status(500).json({ error: 'Failed to fetch wallet snapshot', details: err.message }); }
});

export default router;