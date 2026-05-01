import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { getTokenBySymbol } from '../data/unlocks';
import { getCoinData } from '../services/coingecko';
import { tavilySearch } from '../services/tavily';
import { callAI } from '../services/ai';
import { logger } from '../logger';
import { ImpactForecast } from '../types';

const router = Router();

const schema = Joi.object({
  symbol: Joi.string().required(),
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

router.get('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const symbol = (req.query.symbol as string).toUpperCase();
  const dateFilter = req.query.date as string | undefined;

  try {
    const tokenData = getTokenBySymbol(symbol);
    if (!tokenData) {
      res.status(404).json({ error: `Token "${symbol}" not found`, hint: 'Supported: ARB, OP, APT, SUI, STRK, SEI, EIGEN, ZK, BLUR, PYTH' });
      return;
    }

    const now = new Date();
    let targetUnlock = tokenData.unlocks.find((u) => dateFilter ? u.date === dateFilter : new Date(u.date) >= now);

    if (!targetUnlock) {
      res.status(404).json({ error: 'No upcoming unlock found for this token', symbol });
      return;
    }

    const [coinData, searchResults] = await Promise.all([
      getCoinData(tokenData.coingeckoId),
      tavilySearch(`${symbol} token unlock ${targetUnlock.date} sell pressure impact`, 4),
    ]);

    const price = coinData?.current_price || null;
    const circulatingSupply = coinData?.circulating_supply || null;
    const tokensUnlocked = targetUnlock.amount * 1e6;
    const estimatedUsdValue = price ? Math.round(tokensUnlocked * price) : null;
    const percentOfCirculating = circulatingSupply ? Math.round((tokensUnlocked / circulatingSupply) * 10000) / 100 : null;
    const percentOfTotal = (targetUnlock.amount / tokenData.totalSupply) * 100;

    // Sell pressure score
    let sellPressureScore = 20;
    const isHighRisk = ['Team', 'Investors', 'Core Contributors', 'Early Contributors', 'Private Sales'].some(
      (r) => targetUnlock!.recipient.toLowerCase().includes(r.toLowerCase())
    );
    if (isHighRisk) sellPressureScore += 30;
    if (percentOfTotal >= 5) sellPressureScore += 25;
    else if (percentOfTotal >= 2) sellPressureScore += 15;
    else if (percentOfTotal >= 1) sellPressureScore += 8;
    if (targetUnlock.vestingType === 'cliff') sellPressureScore += 15;
    if (percentOfCirculating && percentOfCirculating >= 5) sellPressureScore += 10;
    sellPressureScore = Math.min(100, sellPressureScore);

    let sellPressureRisk: ImpactForecast['sellPressureRisk'] = 'LOW';
    if (sellPressureScore >= 75) sellPressureRisk = 'CRITICAL';
    else if (sellPressureScore >= 50) sellPressureRisk = 'HIGH';
    else if (sellPressureScore >= 30) sellPressureRisk = 'MEDIUM';

    const newsContext = searchResults.map((r) => r.content).join('\n').slice(0, 1500);

    const aiPrompt = `You are a crypto market analyst specializing in token unlock events.

Token: ${symbol} (${tokenData.name})
Unlock date: ${targetUnlock.date}
Tokens unlocking: ${(tokensUnlocked / 1e6).toFixed(1)}M ${symbol} ($${estimatedUsdValue ? (estimatedUsdValue / 1e6).toFixed(1) + 'M' : 'unknown'})
Recipient: ${targetUnlock.recipient}
Unlock type: ${targetUnlock.vestingType}
% of total supply: ${percentOfTotal.toFixed(2)}%
% of circulating supply: ${percentOfCirculating !== null ? percentOfCirculating + '%' : 'unknown'}
Sell pressure score: ${sellPressureScore}/100 (${sellPressureRisk})
Current price: $${price || 'unknown'}
News context: ${newsContext.slice(0, 800)}

Respond ONLY in this JSON format (no markdown):
{
  "priceImpactEstimate": "string (e.g. '-5% to -15% in 7 days post-unlock')",
  "recommendation": "string (1 sentence — what traders should do)",
  "aiAnalysis": "string (2 sentences — analysis of this specific unlock event)"
}`;

    const aiResponse = await callAI(aiPrompt);
    let parsed: any;
    try {
      parsed = JSON.parse(aiResponse.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { priceImpactEstimate: 'Unable to estimate', recommendation: aiResponse.slice(0, 200), aiAnalysis: aiResponse.slice(0, 300) };
    }

    const result: ImpactForecast = {
      symbol,
      unlockDate: targetUnlock.date,
      tokensUnlocked,
      estimatedUsdValue,
      percentOfCirculating,
      recipient: targetUnlock.recipient,
      sellPressureScore,
      sellPressureRisk,
      priceImpactEstimate: parsed.priceImpactEstimate,
      recommendation: parsed.recommendation,
      aiAnalysis: parsed.aiAnalysis,
      analyzedAt: new Date().toISOString(),
    };

    logger.info({ symbol, unlockDate: targetUnlock.date, sellPressureScore, sellPressureRisk }, 'unlocks/impact');
    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message, symbol }, 'unlocks/impact error');
    res.status(500).json({ error: 'Failed to analyze unlock impact', details: err.message });
  }
});

export default router;
