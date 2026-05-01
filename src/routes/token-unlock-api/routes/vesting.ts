import { Router, Request, Response } from 'express';
import { getTokenBySymbol } from '../data/unlocks';
import { getCoinData } from '../services/coingecko';
import { tavilySearch } from '../services/tavily';
import { callAI } from '../services/ai';
import { logger } from '../logger';
import { VestingSchedule, UnlockEvent } from '../types';

const router = Router();

function getSellPressureRisk(recipient: string, percentOfSupply: number): UnlockEvent['sellPressureRisk'] {
  const isHighRisk = ['Team', 'Investors', 'Core Contributors', 'Early Contributors', 'Private Sales'].some(
    (r) => recipient.toLowerCase().includes(r.toLowerCase())
  );
  if (percentOfSupply >= 5 && isHighRisk) return 'CRITICAL';
  if (percentOfSupply >= 2 && isHighRisk) return 'HIGH';
  if (percentOfSupply >= 1 || isHighRisk) return 'MEDIUM';
  return 'LOW';
}

router.get('/:symbol', async (req: Request, res: Response): Promise<void> => {
  const { symbol } = req.params;

  try {
    const tokenData = getTokenBySymbol(symbol);
    if (!tokenData) {
      res.status(404).json({
        error: `Token "${symbol.toUpperCase()}" not found`,
        hint: `Supported tokens: ARB, OP, APT, SUI, STRK, SEI, EIGEN, ZK, BLUR, PYTH`,
      });
      return;
    }

    const [coinData, searchResults] = await Promise.all([
      getCoinData(tokenData.coingeckoId),
      tavilySearch(`${tokenData.symbol} token unlock vesting sell pressure 2026`, 4),
    ]);

    const price = coinData?.current_price || null;
    const circulatingSupply = coinData?.circulating_supply || null;
    const now = new Date();

    const allEvents: UnlockEvent[] = tokenData.unlocks.map((u, i) => {
      const percentOfSupply = (u.amount / tokenData.totalSupply) * 100;
      return {
        id: `${tokenData.id}-${u.date}-${i}`,
        symbol: tokenData.symbol,
        name: tokenData.name,
        category: tokenData.category,
        unlockDate: u.date,
        tokensUnlocked: u.amount * 1e6,
        percentOfSupply: Math.round(percentOfSupply * 100) / 100,
        recipient: u.recipient,
        vestingType: u.vestingType,
        estimatedUsdValue: price ? Math.round(u.amount * 1e6 * price) : null,
        sellPressureRisk: getSellPressureRisk(u.recipient, percentOfSupply),
        notes: u.notes || null,
      };
    });

    const upcomingUnlocks = allEvents.filter((e) => new Date(e.unlockDate) >= now);
    const pastUnlocks = allEvents.filter((e) => new Date(e.unlockDate) < now);

    const totalLockedTokens = upcomingUnlocks.reduce((s, e) => s + e.tokensUnlocked, 0);
    const totalLockedUsd = price ? Math.round(totalLockedTokens * price) : null;

    const largestUpcoming = upcomingUnlocks.sort((a, b) => b.tokensUnlocked - a.tokensUnlocked)[0] || null;

    const newsContext = searchResults.map((r) => r.content).join('\n').slice(0, 1500);

    const aiPrompt = `You are a crypto market analyst. Analyze the token unlock schedule for ${tokenData.symbol} (${tokenData.name}).

Current price: $${price || 'unknown'}
Market cap: $${coinData?.market_cap ? (coinData.market_cap / 1e6).toFixed(0) + 'M' : 'unknown'}
Circulating supply: ${circulatingSupply ? (circulatingSupply / 1e6).toFixed(0) + 'M' : 'unknown'}
Total locked (upcoming): ${(totalLockedTokens / 1e6).toFixed(1)}M tokens ($${totalLockedUsd ? (totalLockedUsd / 1e6).toFixed(0) + 'M' : 'unknown'})
Upcoming unlocks: ${upcomingUnlocks.length} events
Largest upcoming: ${largestUpcoming ? `${(largestUpcoming.tokensUnlocked / 1e6).toFixed(1)}M tokens for ${largestUpcoming.recipient} on ${largestUpcoming.unlockDate}` : 'none'}

Recent news:
${newsContext}

Write 3 sentences: (1) overall assessment of the unlock schedule's impact on price, (2) which upcoming unlock is most concerning and why, (3) what traders should watch for.`;

    const aiAnalysis = await callAI(aiPrompt);

    const result: VestingSchedule = {
      symbol: tokenData.symbol,
      name: tokenData.name,
      coingeckoId: tokenData.coingeckoId,
      totalSupply: tokenData.totalSupply * 1e6,
      circulatingSupply,
      currentPrice: price,
      marketCap: coinData?.market_cap || null,
      category: tokenData.category,
      tgeDate: tokenData.tgeDate,
      upcomingUnlocks: upcomingUnlocks.sort((a, b) => new Date(a.unlockDate).getTime() - new Date(b.unlockDate).getTime()),
      pastUnlocks: pastUnlocks.sort((a, b) => new Date(b.unlockDate).getTime() - new Date(a.unlockDate).getTime()).slice(0, 5),
      totalLockedTokens,
      totalLockedUsd,
      largestUpcomingUnlock: largestUpcoming,
      aiAnalysis,
    };

    logger.info({ symbol, upcomingCount: upcomingUnlocks.length }, 'token/vesting');
    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message, symbol }, 'token/vesting error');
    res.status(500).json({ error: 'Failed to fetch vesting schedule', details: err.message });
  }
});

export default router;
