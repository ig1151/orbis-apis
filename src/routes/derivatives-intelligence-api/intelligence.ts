import { SpotData } from './sources/spot';
import { FundingData } from './sources/funding';
import { LiquidationData } from './sources/liquidations';
import { OptionsData } from './sources/options';

export interface IntelligenceResult {
  market_state: string;
  risk_level: string;
  liquidation_pressure: string;
  bias: 'long' | 'short' | 'neutral';
  confidence: number;
  summary: string;
}

export function buildIntelligence(
  asset: string,
  spot: SpotData | null,
  funding: FundingData | null,
  liquidations: LiquidationData | null,
  options: OptionsData | null,
): IntelligenceResult {
  let bearScore = 0;
  let bullScore = 0;
  const signals: string[] = [];

  if (funding) {
    if (funding.sentiment === 'long-heavy') {
      bearScore += 2;
      signals.push('funding rates elevated (long-heavy)');
    } else if (funding.sentiment === 'short-heavy') {
      bullScore += 2;
      signals.push('funding rates negative (short-heavy)');
    }
    if (Math.abs(funding.averageRate) > 0.002) {
      bearScore += funding.averageRate > 0 ? 1 : -1;
      signals.push('extreme funding rate detected');
    }
  }

  if (liquidations) {
    if (liquidations.pressure === 'critical' || liquidations.pressure === 'high') {
      if (liquidations.dominantSide === 'long') {
        bearScore += 2;
        signals.push('high long liquidations');
      } else if (liquidations.dominantSide === 'short') {
        bullScore += 2;
        signals.push('high short liquidations');
      }
    }
  }

  if (options) {
    if (options.putCallRatio > 1.1) {
      bearScore += 1;
      signals.push(`put/call ratio bearish (${options.putCallRatio})`);
    } else if (options.putCallRatio < 0.7) {
      bullScore += 1;
      signals.push(`put/call ratio bullish (${options.putCallRatio})`);
    }
    if (spot && options.maxPain !== null) {
      if (spot.price > options.maxPain * 1.05) {
        bearScore += 1;
        signals.push(`price above max pain (${options.maxPain})`);
      } else if (spot.price < options.maxPain * 0.95) {
        bullScore += 1;
        signals.push(`price below max pain (${options.maxPain})`);
      }
    }
  }

  if (spot) {
    if (spot.change24h > 3)       { bullScore += 1; signals.push('strong 24h price momentum'); }
    else if (spot.change24h < -3) { bearScore += 1; signals.push('negative 24h price momentum'); }
  }

  const total = bearScore + bullScore || 1;
  const bias: 'long' | 'short' | 'neutral' =
    bearScore > bullScore + 1 ? 'short' :
    bullScore > bearScore + 1 ? 'long' : 'neutral';

  const confidence = Math.round(Math.max(bearScore, bullScore) / total * 100) / 100;

  const liqPressure = liquidations?.pressure || 'low';
  const risk_level =
    liqPressure === 'critical' ? 'critical' :
    liqPressure === 'high' || bearScore >= 4 ? 'elevated' :
    bearScore >= 2 || bullScore >= 2 ? 'moderate' : 'low';

  const market_state =
    funding?.sentiment === 'long-heavy' && liqPressure !== 'low' ? 'overleveraged long' :
    funding?.sentiment === 'short-heavy' && liqPressure !== 'low' ? 'overleveraged short' :
    bias === 'short' ? 'bearish pressure' :
    bias === 'long'  ? 'bullish momentum' : 'consolidating';

  const summary = signals.length > 0
    ? `${asset} signals: ${signals.join(', ')}. Overall bias ${bias} with ${risk_level} risk.`
    : `${asset} markets appear neutral with no strong directional signals.`;

  return { market_state, risk_level, liquidation_pressure: liqPressure, bias, confidence, summary };
}
