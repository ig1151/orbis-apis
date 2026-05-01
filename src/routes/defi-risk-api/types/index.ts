export interface TokenSafetyResult {
  contractAddress: string;
  chain: string;
  tokenName: string | null;
  tokenSymbol: string | null;
  isHoneypot: boolean;
  honeypotReason: string | null;
  canMint: boolean;
  canBlacklist: boolean;
  isProxy: boolean;
  isSelfDestruct: boolean;
  ownerAddress: string | null;
  ownerPercent: number | null;
  creatorAddress: string | null;
  creatorPercent: number | null;
  top10HolderPercent: number | null;
  totalSupply: string | null;
  lpHolderCount: number | null;
  lpTotalSupply: string | null;
  buyTax: number | null;
  sellTax: number | null;
  riskScore: number; // 0-100, higher = riskier
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskFlags: string[];
  aiNarrative: string;
  analyzedAt: string;
}

export interface ProtocolRiskResult {
  protocol: string;
  tvlUsd: number | null;
  tvl7dChange: number | null;
  tvl30dChange: number | null;
  chains: string[];
  category: string | null;
  audits: number | null;
  riskScore: number; // 0-100, higher = riskier
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskFlags: string[];
  aiNarrative: string;
  analyzedAt: string;
}

export interface LiquidityHealthResult {
  contractAddress: string;
  chain: string;
  tokenSymbol: string | null;
  lpHolderCount: number | null;
  lpTotalSupply: string | null;
  lockedLiquidity: boolean | null;
  top1LpPercent: number | null;
  liquidityConcentration: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  rugPullRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  riskFlags: string[];
  aiNarrative: string;
  analyzedAt: string;
}

export interface PortfolioScanResult {
  totalPositions: number;
  scanned: number;
  aggregateRiskScore: number;
  aggregateRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  positions: Array<{
    contractAddress: string;
    tokenSymbol: string | null;
    riskScore: number;
    riskLevel: string;
    topFlag: string | null;
  }>;
  aiSummary: string;
  analyzedAt: string;
}
