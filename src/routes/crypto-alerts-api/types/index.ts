export type AlertType = 'price_above' | 'price_below' | 'price_change_percent' | 'whale_movement' | 'funding_rate_spike';
export type AlertStatus = 'active' | 'triggered' | 'expired';

export interface Alert {
  alertId: string;
  type: AlertType;
  symbol: string;
  condition: {
    threshold: number;
    direction?: 'above' | 'below';
    percentChange?: number;
    timeframe?: string;
  };
  currentValue: number | null;
  triggered: boolean;
  triggeredAt: string | null;
  triggeredValue: number | null;
  status: AlertStatus;
  message: string | null;
  createdAt: string;
  expiresAt: string;
  ttlHours: number;
}

export interface WhaleTransaction {
  txHash: string;
  symbol: string;
  from: string;
  to: string;
  fromLabel: string | null;
  toLabel: string | null;
  amount: number;
  amountUsd: number | null;
  direction: 'exchange_inflow' | 'exchange_outflow' | 'wallet_to_wallet';
  sentiment: 'BEARISH' | 'BULLISH' | 'NEUTRAL';
  timestamp: string;
}

export interface AlertSummary {
  totalActive: number;
  totalTriggered: number;
  recentTriggers: Alert[];
  marketConditions: {
    symbol: string;
    price: number;
    change24h: number;
    alertsActive: number;
  }[];
  aiSummary: string;
  analyzedAt: string;
}
