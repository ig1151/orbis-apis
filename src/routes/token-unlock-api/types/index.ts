export interface UnlockEvent {
  id: string;
  symbol: string;
  name: string;
  category: string;
  unlockDate: string; // ISO
  tokensUnlocked: number;
  percentOfSupply: number;
  recipient: string; // e.g. "Team", "Investors", "Ecosystem"
  vestingType: 'cliff' | 'linear' | 'milestone';
  estimatedUsdValue: number | null;
  sellPressureRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  notes: string | null;
}

export interface VestingSchedule {
  symbol: string;
  name: string;
  coingeckoId: string;
  totalSupply: number;
  circulatingSupply: number | null;
  currentPrice: number | null;
  marketCap: number | null;
  category: string;
  tgeDate: string | null;
  upcomingUnlocks: UnlockEvent[];
  pastUnlocks: UnlockEvent[];
  totalLockedTokens: number;
  totalLockedUsd: number | null;
  largestUpcomingUnlock: UnlockEvent | null;
  aiAnalysis: string;
}

export interface ImpactForecast {
  symbol: string;
  unlockDate: string;
  tokensUnlocked: number;
  estimatedUsdValue: number | null;
  percentOfCirculating: number | null;
  recipient: string;
  sellPressureScore: number; // 0-100
  sellPressureRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  priceImpactEstimate: string;
  recommendation: string;
  aiAnalysis: string;
  analyzedAt: string;
}
