import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { getLorisFundingData, convertRate, getInterval } from '../services/loris';
import { callAI } from '../services/ai';
import { logger } from '../logger';

const router = Router();

const schema = Joi.object({
  symbol: Joi.string().uppercase().default('BTC'),
});

const KEY_EXCHANGES = ['binance', 'bybit', 'okx', 'hyperliquid', 'bitget', 'gate'];
const ARB_FEE_THRESHOLD = 0.04; // min spread % after fees to be profitable

router.get('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const symbol = (req.query.symbol as string).toUpperCase();

  try {
    const data = await getLorisFundingData();
    if (!data) {
      res.status(503).json({ error: 'Funding rate data unavailable' });
      return;
    }

    // Collect all exchange rates
    const allRates: Record<string, number> = {};
    const keyRates: Record<string, number> = {};

    for (const [exchange, symbolRates] of Object.entries(data.funding_rates)) {
      if (!(symbol in symbolRates)) continue;
      const rawRate = symbolRates[symbol];
      if (rawRate === null || rawRate === undefined) continue;
      const interval = getInterval(exchange);
      const { rate8h } = convertRate(rawRate, interval);
      allRates[exchange.toUpperCase()] = rate8h;
      if (KEY_EXCHANGES.includes(exchange.toLowerCase())) {
        keyRates[exchange.toUpperCase()] = rate8h;
      }
    }

    const rates = Object.values(allRates);
    if (rates.length === 0) {
      res.status(404).json({ error: `No funding rate data found for ${symbol}` });
      return;
    }

    const avgRate = rates.reduce((s, r) => s + r, 0) / rates.length;
    const maxRate = Math.max(...rates);
    const minRate = Math.min(...rates);
    const spread = maxRate - minRate;

    // Trend: compare recent key exchange rates
    // Positive avg = longs paying = market long-heavy = bearish sentiment (crowded)
    // Negative avg = shorts paying = shorts squeezable = bullish sentiment
    const sentiment = avgRate > 0.05 ? 'bearish' :
                      avgRate < -0.05 ? 'bullish' :
                      avgRate > 0.01 ? 'lean_bearish' :
                      avgRate < -0.01 ? 'lean_bullish' : 'neutral';

    // Trend direction based on sign and magnitude
    const trend = Math.abs(avgRate) < 0.005 ? 'stable' :
                  avgRate > 0 ? 'increasing' : 'decreasing';

    // Arbitrage opportunity
    const arbitrageOpportunity = spread > ARB_FEE_THRESHOLD;
    const bestLong = Object.entries(allRates).sort((a, b) => a[1] - b[1])[0];
    const bestShort = Object.entries(allRates).sort((a, b) => b[1] - a[1])[0];

    // Confidence: based on number of exchanges reporting + liquidity of data
    const confidence = rates.length >= 15 ? 0.92 :
                       rates.length >= 10 ? 0.82 :
                       rates.length >= 5 ? 0.70 : 0.50;

    // Signal score -100 to +100 (negative = bearish, positive = bullish)
    const signalScore = Math.max(-100, Math.min(100, Math.round(-avgRate * 500)));

    const actionBias = signalScore >= 40 ? 'strong_buy' :
                       signalScore >= 15 ? 'buy' :
                       signalScore <= -40 ? 'strong_sell' :
                       signalScore <= -15 ? 'sell' : 'neutral';

    // AI narrative
    const rateContext = Object.entries(keyRates)
      .map(([ex, r]) => `${ex}: ${r > 0 ? '+' : ''}${r.toFixed(5)}%`)
      .join(', ');

    const aiPrompt = `You are a crypto derivatives analyst providing decision-ready signals.

Symbol: ${symbol}
Average funding rate (8h): ${avgRate > 0 ? '+' : ''}${avgRate.toFixed(5)}%
Key exchange rates: ${rateContext}
Max rate: ${maxRate.toFixed(5)}%, Min rate: ${minRate.toFixed(5)}%
Spread: ${spread.toFixed(5)}%
Sentiment: ${sentiment}
Signal score: ${signalScore}/100
Arbitrage opportunity: ${arbitrageOpportunity}
Exchanges reporting: ${rates.length}

Respond ONLY in this JSON format (no markdown):
{
  "narrative": "string (2 sentences — what the funding rates tell us about market positioning right now)",
  "drivers": ["string", "string"],
  "recommendation": "string (1 direct actionable sentence for traders)",
  "arbitrageNote": "string (1 sentence about the arb opportunity, or null if none)"
}`;

    const aiResponse = await callAI(aiPrompt);
    let parsed: any;
    try {
      parsed = JSON.parse(aiResponse.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { narrative: aiResponse.slice(0, 200), drivers: [], recommendation: '', arbitrageNote: null };
    }

    const result = {
      symbol,
      fundingRate: Math.round(avgRate * 100000) / 100000,
      fundingRateAnnualized: Math.round(avgRate * 3 * 365 * 100) / 100,
      trend,
      sentiment,
      signalScore,
      actionBias,
      confidence,
      arbitrageOpportunity,
      arbitrageDetail: arbitrageOpportunity ? {
        longExchange: bestLong[0],
        shortExchange: bestShort[0],
        longRate: bestLong[1],
        shortRate: bestShort[1],
        spread: Math.round(spread * 100000) / 100000,
        estimatedAnnualizedYield: Math.round(spread * 3 * 365 * 100) / 100,
      } : null,
      ratesByExchange: keyRates,
      exchangeCount: rates.length,
      narrative: parsed.narrative,
      drivers: parsed.drivers || [],
      recommendation: parsed.recommendation,
      arbitrageNote: parsed.arbitrageNote || null,
      analyzedAt: new Date().toISOString(),
    };

    logger.info({ symbol, sentiment, signalScore, actionBias, arbitrageOpportunity }, 'rates/signal');
    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message, symbol }, 'rates/signal error');
    res.status(500).json({ error: 'Failed to generate funding signal', details: err.message });
  }
});

export default router;