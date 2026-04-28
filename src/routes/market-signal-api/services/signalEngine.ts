import { PriceData, SignalResponse } from '../types';
import { calcRSI, calcMACD, calcVolumeSpike, calcMACrossover, calcPriceChanges } from './indicators';

export function buildSignal(ticker: string, prices: PriceData[]): SignalResponse {
  const rsi = calcRSI(prices);
  const macd = calcMACD(prices);
  const volumeSpike = calcVolumeSpike(prices);
  const maCrossover = calcMACrossover(prices);
  const { c1d, c7d, c30d } = calcPriceChanges(prices);

  let score = 50;
  const reasons: string[] = [];

  if (rsi < 30) { score += 15; reasons.push('RSI oversold — potential reversal'); }
  else if (rsi < 45) { score += 8; reasons.push('RSI in bullish range'); }
  else if (rsi > 70) { score -= 15; reasons.push('RSI overbought — caution'); }
  else if (rsi > 55) { score += 5; reasons.push('RSI in healthy range'); }

  if (macd === 'bullish_crossover') { score += 20; reasons.push('MACD bullish crossover detected'); }
  else if (macd === 'bullish') { score += 10; reasons.push('MACD bullish momentum'); }
  else if (macd === 'bearish_crossover') { score -= 20; reasons.push('MACD bearish crossover detected'); }
  else if (macd === 'bearish') { score -= 10; reasons.push('MACD bearish momentum'); }

  if (maCrossover === 'golden_cross') { score += 20; reasons.push('Golden cross detected'); }
  else if (maCrossover === 'above_50ma') { score += 10; reasons.push('Price above 50-day MA'); }
  else if (maCrossover === 'death_cross') { score -= 20; reasons.push('Death cross detected'); }
  else if (maCrossover === 'below_50ma') { score -= 10; reasons.push('Price below 50-day MA'); }

  if (volumeSpike && c1d > 0) { score += 10; reasons.push('Bullish volume spike'); }
  else if (volumeSpike && c1d < 0) { score -= 10; reasons.push('Bearish volume spike'); }

  if (c30d > 10) { score += 10; reasons.push('Strong 30-day uptrend'); }
  else if (c30d > 3) { score += 5; reasons.push('Positive 30-day trend'); }
  else if (c30d < -10) { score -= 10; reasons.push('Strong 30-day downtrend'); }
  else if (c30d < -3) { score -= 5; reasons.push('Negative 30-day trend'); }

  score = Math.max(0, Math.min(100, score));

  const decision =
    score >= 75 ? 'strong_buy' :
    score >= 60 ? 'buy' :
    score >= 40 ? 'neutral' :
    score >= 25 ? 'sell' : 'strong_sell';

  const trend = score >= 55 ? 'bullish' : score <= 45 ? 'bearish' : 'neutral';
  const momentum = Math.abs(c7d) > 5 ? 'strong' : Math.abs(c7d) > 2 ? 'moderate' : 'weak';

  const closes = prices.map(p => p.close);
  const recent = closes.slice(-10);
  const avgChange = recent.reduce((sum, v, i) => i === 0 ? 0 : sum + Math.abs(v - recent[i - 1]), 0) / 9;
  const volatility: 'high' | 'medium' | 'low' = avgChange > 3 ? 'high' : avgChange > 1 ? 'medium' : 'low';

  const risk: 'low' | 'medium' | 'high' =
    volatility === 'high' ? 'high' :
    volatility === 'medium' ? 'medium' : 'low';

  const action =
    decision === 'strong_buy' && risk === 'low' ? 'strong buy' :
    decision === 'strong_buy' && risk === 'medium' ? 'buy with caution' :
    decision === 'strong_buy' && risk === 'high' ? 'buy small position' :
    decision === 'buy' && risk === 'low' ? 'buy' :
    decision === 'buy' && risk === 'medium' ? 'buy with caution' :
    decision === 'buy' && risk === 'high' ? 'wait for lower risk' :
    decision === 'neutral' ? 'hold and monitor' :
    decision === 'sell' && risk === 'high' ? 'reduce position' :
    decision === 'sell' ? 'sell' :
    decision === 'strong_sell' ? 'exit position' : 'hold';

  const verdict: 'proceed' | 'proceed_with_caution' | 'wait' | 'avoid' =
    score >= 75 && risk === 'low' ? 'proceed' :
    score >= 60 ? 'proceed_with_caution' :
    score >= 40 ? 'wait' : 'avoid';

  const confidence = Math.min(0.99, Math.round((0.6 + prices.length / 200) * 100) / 100);

  return {
    asset: ticker.toUpperCase(),
    decision,
    confidence,
    risk,
    action,
    verdict,
    trend,
    momentum,
    volatility,
    factors: {
      rsi,
      macd,
      volume_spike: volumeSpike,
      ma_crossover: maCrossover,
      price_change_1d: c1d,
      price_change_7d: c7d,
      price_change_30d: c30d
    },
    reasons
  };
}