import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { searchMarkets, getTrendingMarkets } from '../services/polymarket';
import { callAI } from '../services/ai';
import { logger } from '../logger';

const router = Router();

const schema = Joi.object({
  q: Joi.string().min(2).required(),
});

router.get('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const query = req.query.q as string;

  try {
    const markets = await searchMarkets(query, 30);
    const market = markets[0];

    if (!market) {
      res.status(404).json({ error: `No market found matching "${query}"` });
      return;
    }

    const yesIndex = market.outcomes.findIndex((o) => o.toLowerCase() === 'yes');
    const yesPrice = yesIndex >= 0 ? market.outcomePrices[yesIndex] : market.outcomePrices[0] || 0.5;
    const noPrice = 1 - yesPrice;
    const impliedProbability = Math.round(yesPrice * 100) / 100;

    // Confidence from liquidity + volume
    let confidenceScore = 0.5;
    if (market.liquidity > 1000000) confidenceScore = 0.95;
    else if (market.liquidity > 100000) confidenceScore = 0.85;
    else if (market.liquidity > 10000) confidenceScore = 0.70;
    else if (market.liquidity > 1000) confidenceScore = 0.55;

    // Action bias
    let actionBias = 'neutral';
    if (yesPrice >= 0.70) actionBias = 'bullish';
    else if (yesPrice >= 0.55) actionBias = 'lean_bullish';
    else if (yesPrice <= 0.30) actionBias = 'bearish';
    else if (yesPrice <= 0.45) actionBias = 'lean_bearish';

    const aiPrompt = `You are a prediction market analyst providing decision-ready signals for AI agents and traders.

Market: "${market.question}"
Yes probability: ${Math.round(yesPrice * 100)}%
No probability: ${Math.round(noPrice * 100)}%
24h volume: $${market.volume24h.toLocaleString()}
Total volume: $${market.volumeTotal.toLocaleString()}
Liquidity: $${market.liquidity.toLocaleString()}
End date: ${market.endDate || 'unknown'}

Respond ONLY in this JSON format (no markdown):
{
  "trend": "increasing|decreasing|stable",
  "trendReason": "string (1 sentence explaining why probability is moving this direction)",
  "drivers": ["string", "string", "string"],
  "risks": ["string", "string"],
  "recommendation": "string (1 direct actionable sentence)",
  "timeHorizon": "string (e.g. 'Short-term: 3 days', 'Medium-term: 2 weeks')"
}`;

    const aiResponse = await callAI(aiPrompt);
    let parsed: any;
    try {
      parsed = JSON.parse(aiResponse.replace(/```json|```/g, '').trim());
    } catch {
      parsed = {
        trend: 'stable',
        trendReason: aiResponse.slice(0, 150),
        drivers: [],
        risks: [],
        recommendation: '',
        timeHorizon: 'unknown',
      };
    }

    const result = {
      event: market.question,
      marketId: market.id,
      slug: market.slug,
      probability: impliedProbability,
      trend: parsed.trend,
      trendReason: parsed.trendReason,
      confidence: confidenceScore,
      drivers: parsed.drivers || [],
      risks: parsed.risks || [],
      actionBias,
      recommendation: parsed.recommendation,
      timeHorizon: parsed.timeHorizon,
      marketMeta: {
        volume24h: market.volume24h,
        volumeTotal: market.volumeTotal,
        liquidity: market.liquidity,
        endDate: market.endDate,
        outcomes: market.outcomes,
        outcomePrices: market.outcomePrices,
      },
      analyzedAt: new Date().toISOString(),
    };

    logger.info({ query, actionBias, probability: impliedProbability, confidence: confidenceScore }, 'markets/signal');
    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message, query }, 'signal error');
    res.status(500).json({ error: 'Failed to generate market signal', details: err.message });
  }
});

export default router;