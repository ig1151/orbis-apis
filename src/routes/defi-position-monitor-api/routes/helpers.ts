import { getAavePosition } from '../services/aave';

export function deriveRiskLevel(hf: number): 'low' | 'medium' | 'high' | 'critical' {
  if (hf >= 2.0) return 'low';
  if (hf >= 1.4) return 'medium';
  if (hf >= 1.1) return 'high';
  return 'critical';
}

export function deriveLiquidationRisk(hf: number): 'none' | 'low' | 'elevated' | 'imminent' {
  if (hf >= 2.0) return 'none';
  if (hf >= 1.4) return 'low';
  if (hf >= 1.1) return 'elevated';
  return 'imminent';
}

export function deriveAction(riskLevel: string): string {
  switch (riskLevel) {
    case 'critical': return 'add_collateral_or_repay_immediately';
    case 'high':     return 'add_collateral_or_partial_repay';
    case 'medium':   return 'monitor_closely_or_hedge';
    default:         return 'hold_and_monitor';
  }
}

export function healthScore(hf: number): number {
  return Math.round(Math.min((hf / 2.5) * 100, 100));
}

export function riskScore(hf: number): number {
  return Math.round(Math.max(100 - (hf / 2.5) * 100, 0));
}

export async function resolvePosition(wallet?: string, chain = 'ethereum') {
  if (!wallet) return null;
  return getAavePosition(wallet, chain);
}
