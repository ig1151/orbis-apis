import { v4 as uuidv4 } from 'uuid';
import { getPrice } from '../services/coingecko';

export function newTriggerId(): string {
  return 'trigger_' + uuidv4().replace(/-/g, '').slice(0, 12);
}

export function deriveUrgency(confidence: number, impact: number): 'low' | 'medium' | 'high' | 'critical' {
  const score = (confidence + impact) / 2;
  if (score >= 0.85) return 'critical';
  if (score >= 0.65) return 'high';
  if (score >= 0.40) return 'medium';
  return 'low';
}

export function urgencyToAction(urgency: string): string {
  switch (urgency) {
    case 'critical': return 'execute_immediately';
    case 'high':     return 'execute_with_confirmation';
    case 'medium':   return 'queue_for_review';
    default:         return 'log_and_monitor';
  }
}

export async function fetchPriceOrNull(symbol?: string) {
  if (!symbol) return null;
  try { return await getPrice(symbol); } catch { return null; }
}
