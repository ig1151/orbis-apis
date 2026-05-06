import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { getFundingSignal } from '../services/funding';
import { getPredictionSignal } from '../services/prediction';
import { getPriceData } from '../services/price';
import { callAI } from '../services/ai';
import { logger } from '../logger';
import { StrategyDecision } from '../types';

const router = Router();

const SUPPORTED_SYMBOLS = [
  'BTC', 'ETH', 'SOL', 'BNB', 'ARB', 'OP', 'AVAX', 'MATIC',
  'LINK', 'UNI', 'DOGE', 'SUI', 'APT', 'SEI', 'INJ', 'TIA',
  'ATOM', 'DOT', 'NEAR', 'FET',
];

const schema = Joi.object({
  symbol: Joi.string().uppercase().valid(...SUPPORTED_SYMBOLS).required(),
  predictionQuery: Joi.string().optional(),
});

function combineSignals(
  fundingScore: number | null,
  predictionBias: string | null,
  priceSignal: string | null
): number {
  let score = 0;
  let weight = 0;

  if (fundingScore !== null) {
    score += fundingScore * 0.4;
    weight += 0.4;
  }
  if (predictionBias) {
    const predScore =
      predictionBias === 'bullish' ? 60 :
      predictionBias === 'lean_bullish' ? 30 :
      predictionBias === 'bearish' ? -60 :
      predictionBias === 'lean_bearish' ? -30 : 0;
    score += predScore * 0.35;
    weight += 0.35;
  }
  if (priceSignal) {
    const priceScore =
      priceSignal === 'BULLISH' ? 50 :
      priceSignal === 'BEARISH' ? -50 : 0;
    score += priceScore * 0.25;
    weight += 0.25;
  }

  if (weight === 0) return 0;
  return Math.round(score / weight);
}

function getDecision(score: number): StrategyDecision['decision'] {
  if (score >= 50) return 'STRONG_BUY';
  if (score >= 20) return 'BUY';
  if (score <= -50) return 'STRONG_SELL';
  if (score <= -20) return 'SELL';
  return 'HOLD';
}

function getSuggestedSize(score: number, confidence: number): StrategyDecision['action']['suggestedSize'] {
  const absScore = Math.abs(score);
  if (absScore >= 50 && confidence >= 0.75) return 'large';
  if (absScore >= 30 && confidence >= 0.60) return 'moderate';
  if (absScore >= 15) return 'small';
  return 'none';
}

router.get('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const symbol = (req.query.symbol as string).toUpperCase();
  const predictionQuery = (req.query.predictionQuery as string) || symbol.toLowerCase();

  try {
    const [fundingSignal, predictionSignal, priceData] = await Promise.allSettled([
      getFundingSignal(symbol),
      getPredictionSignal(predictionQuery),
      getPriceData(symbol),
    ]);

    const funding = fundingSignal.status === 'fulfilled' ? fundingSignal.value : null;
    const prediction = predictionSignal.status === 'fulfilled' ? predictionSignal.value : null;
    const price = priceData.status === 'fulfilled' ? priceData.value : null;

    const combinedScore = combineSignals(
      funding?.signalScore ?? null,
      prediction?.actionBias ?? null,
      price?.priceSignal ?? null,
    );

    const decision = getDecision(combinedScore);

    const signalsReceived = [funding, prediction, price].filter(Boolean).length;
    const avgConfidence = [funding?.confidence, prediction?.confidence].filter((c): c is number => c !== undefined && c !== null);
    const baseConfidence = avgConfidence.length > 0
      ? avgConfidence.reduce((s, c) => s + c, 0) / avgConfidence.length
      : 0.5;
    const confidence = Math.round(baseConfidence * (signalsReceived / 3) * 100) / 100;

    const fundingContext = funding
      ? `Funding Rate Signal: ${funding.sentiment} (score ${funding.signalScore}/100), rate ${funding.fundingRate}%, trend ${funding.trend}. ${funding.narrative}`
      : 'Funding Rate Signal: unavailable';

    const predictionContext = prediction
      ? `Prediction Market Signal: ${prediction.actionBias} (probability ${Math.round(prediction.probability * 100)}%), trend ${prediction.trend}, confidence ${prediction.confidence}. Drivers: ${prediction.drivers?.join(', ')}`
      : 'Prediction Market Signal: unavailable';

    const priceContext = price
      ? `Price Data: $${price.price.toLocaleString()}, 24h change ${price.changePercent24h}% (${price.priceSignal}), volume $${((price.volume24h || 0) / 1e9).toFixed(2)}B`
      : 'Price Data: unavailable';

    const aiPrompt = `You are a senior crypto strategist synthesizing multiple signals into a unified trading decision.

Symbol: ${symbol}
Combined Signal Score: ${combinedScore}/100 (positive = bullish, negative = bearish)
Preliminary Decision: ${decision}
Current Price: ${price ? '$' + price.price.toLocaleString() : 'unknown'}

Signal Pipeline:
1. ${fundingContext}
2. ${predictionContext}
3. ${priceContext}

Synthesize these signals and respond ONLY in this JSON format (no markdown):
{
  "reasoning": "string (3 sentences: what each signal says, how they align or conflict, and the overall conclusion)",
  "keyFactors": ["string", "string", "string"],
  "risks": ["string", "string"],
  "timeframe": "string (e.g. '24-48 hours', '3-7 days')",
  "stopLossHint": "string or null (e.g. 'Below $85,000 key support')",
  "riskLevel": "low|medium|high",
  "invalidatedIf": "string (the specific price level or condition that would invalidate this signal, e.g. 'Price closes below $74,000' or 'Funding rate turns strongly positive above 0.1%')"
}`;

    const aiResponse = await callAI(aiPrompt);
    let parsed: any;
    try {
      parsed = JSON.parse(aiResponse.replace(/```json|```/g, '').trim());
    } catch {
      parsed = {
        reasoning: aiResponse.slice(0, 400),
        keyFactors: [],
        risks: [],
        timeframe: 'unknown',
        stopLossHint: null,
        riskLevel: 'medium',
        invalidatedIf: null,
      };
    }

    const suggestedSize = getSuggestedSize(combinedScore, confidence);

    const result: StrategyDecision = {
      symbol,
      decision,
      confidence,
      signalScore: combinedScore,
      reasoning: parsed.reasoning,
      keyFactors: parsed.keyFactors || [],
      risks: parsed.risks || [],
      riskLevel: (parsed.riskLevel || 'medium') as 'low' | 'medium' | 'high',
      invalidatedIf: parsed.invalidatedIf || null,
      action: {
        bias: combinedScore >= 20 ? 'bullish' : combinedScore <= -20 ? 'bearish' : 'neutral',
        suggestedSize,
        timeframe: parsed.timeframe,
        stopLossHint: parsed.stopLossHint || null,
      },
      signals: {
        funding,
        prediction,
        price,
      },
      pipeline: {
        fundingApiCalled: funding !== null,
        predictionApiCalled: prediction !== null,
        priceApiCalled: price !== null,
      },
      analyzedAt: new Date().toISOString(),
    };

    logger.info({ symbol, decision, signalScore: combinedScore, confidence, signalsReceived }, 'strategy/decision');
    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message, symbol }, 'strategy error');
    res.status(500).json({ error: 'Failed to generate strategy decision', details: err.message });
  }
});


router.post('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const symbol = (req.body.symbol as string).toUpperCase();
  const predictionQuery = (req.body.predictionQuery as string) || symbol.toLowerCase();
  try {
    const [fundingSignal, predictionSignal, priceData] = await Promise.allSettled([
      getFundingSignal(symbol),
      getPredictionSignal(predictionQuery),
      getPriceData(symbol),
    ]);
    const funding = fundingSignal.status === 'fulfilled' ? fundingSignal.value : null;
    const prediction = predictionSignal.status === 'fulfilled' ? predictionSignal.value : null;
    const price = priceData.status === 'fulfilled' ? priceData.value : null;
    const combinedScore = combineSignals(funding?.signalScore ?? null, prediction?.actionBias ?? null, price?.priceSignal ?? null);
    const decision = getDecision(combinedScore);
    const signalsReceived = [funding, prediction, price].filter(Boolean).length;
    const avgConfidence = [funding?.confidence, prediction?.confidence].filter((c): c is number => c !== undefined && c !== null);
    const baseConfidence = avgConfidence.length > 0 ? avgConfidence.reduce((s, c) => s + c, 0) / avgConfidence.length : 0.5;
    const confidence = Math.round(baseConfidence * (signalsReceived / 3) * 100) / 100;
    const suggestedSize = getSuggestedSize(combinedScore, confidence);
    logger.info({ symbol, decision, signalScore: combinedScore, confidence }, 'strategy/decision POST');
    res.json({ success: true, data: { symbol, decision, confidence, signalScore: combinedScore, suggestedSize, analyzedAt: new Date().toISOString() } });
  } catch (err: any) {
    logger.error({ err: err.message, symbol }, 'strategy error POST');
    res.status(500).json({ error: 'Failed to generate strategy decision', details: err.message });
  }
});

export default router;