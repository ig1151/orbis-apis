export interface TokenBalance {
  symbol: string;
  name: string;
  contractAddress: string;
  balance: string;
  decimals: number;
  usdValue: number | null;
  priceUsd: number | null;
  chain: string;
}

export interface WalletSnapshot {
  address: string;
  chain: string;
  ethBalance: string;
  ethBalanceUsd: number | null;
  tokens: TokenBalance[];
  totalTokensUsd: number | null;
  totalPortfolioUsd: number | null;
  txCount: number;
  lastActivityAt: string | null;
  topHoldings: TokenBalance[];
  snapshotAt: string;
}

export interface WalletPnL {
  address: string;
  chain: string;
  period: string;
  ethReceived: number;
  ethSent: number;
  netEthFlow: number;
  netEthFlowUsd: number | null;
  txCount: number;
  activedays: number;
  avgTxValueEth: number;
  largestTx: {
    hash: string;
    valueEth: number;
    valueUsd: number | null;
    direction: 'IN' | 'OUT';
    timestamp: string;
  } | null;
  estimatedPnlUsd: number | null;
  pnlNote: string;
  analyzedAt: string;
}

export interface WalletScore {
  address: string;
  chain: string;
  overallScore: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  categories: {
    diversification: number;
    activity: number;
    riskManagement: number;
    defiEngagement: number;
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  aiNarrative: string;
  analyzedAt: string;
}
