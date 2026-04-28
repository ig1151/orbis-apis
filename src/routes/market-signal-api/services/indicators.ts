import { PriceData } from '../types';

export function calcRSI(prices: PriceData[], period = 14): number {
  const closes = prices.map(p => p.close);
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const rs = losses === 0 ? 100 : (gains / period) / (losses / period);
  return Math.round((100 - 100 / (1 + rs)) * 100) / 100;
}

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(prev);
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    result.push(prev);
  }
  return result;
}

export function calcMACD(prices: PriceData[]): string {
  const closes = prices.map(p => p.close);
  if (closes.length < 35) return 'insufficient_data';
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12.slice(ema12.length - ema26.length).map((v, i) => v - ema26[i]);
  const signalLine = ema(macdLine, 9);
  const prev = macdLine[macdLine.length - 2] - signalLine[signalLine.length - 2];
  const curr = macdLine[macdLine.length - 1] - signalLine[signalLine.length - 1];
  if (prev < 0 && curr > 0) return 'bullish_crossover';
  if (prev > 0 && curr < 0) return 'bearish_crossover';
  return curr > 0 ? 'bullish' : 'bearish';
}

export function calcVolumeSpike(prices: PriceData[], lookback = 20): boolean {
  if (prices.length < lookback + 1) return false;
  const avg = prices.slice(-lookback - 1, -1).map(p => p.volume).reduce((a, b) => a + b, 0) / lookback;
  return prices[prices.length - 1].volume > avg * 1.5;
}

export function calcMACrossover(prices: PriceData[]): string {
  if (prices.length < 51) return 'insufficient_data';
  const closes = prices.map(p => p.close);
  const ma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const ma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / 50;
  const prevMa20 = closes.slice(-21, -1).reduce((a, b) => a + b, 0) / 20;
  const prevMa50 = closes.slice(-51, -1).reduce((a, b) => a + b, 0) / 50;
  if (prevMa20 <= prevMa50 && ma20 > ma50) return 'golden_cross';
  if (prevMa20 >= prevMa50 && ma20 < ma50) return 'death_cross';
  return ma20 > ma50 ? 'above_50ma' : 'below_50ma';
}

export function calcPriceChanges(prices: PriceData[]): { c1d: number; c7d: number; c30d: number } {
  const closes = prices.map(p => p.close);
  const cur = closes[closes.length - 1];
  const pct = (n: number) => Math.round(((cur - closes[closes.length - n]) / closes[closes.length - n]) * 10000) / 100;
  return {
    c1d: closes.length >= 2 ? pct(2) : 0,
    c7d: closes.length >= 6 ? pct(6) : 0,
    c30d: closes.length >= 22 ? pct(22) : 0
  };
}
