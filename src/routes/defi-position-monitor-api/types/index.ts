export type RiskLevel = 'SAFE' | 'MODERATE' | 'RISKY' | 'CRITICAL' | 'LIQUIDATABLE';

export interface CollateralPosition {
  symbol: string;
  amount: number;
  valueUsd: number;
  isCollateral: boolean;
}

export interface DebtPosition {
  symbol: string;
  amount: number;
  valueUsd: number;
  borrowRate: number;
}

export interface AavePosition {
  address: string;
  chain: string;
  protocol: 'aave-v3';
  healthFactor: number;
  totalCollateralUsd: number;
  totalDebtUsd: number;
  availableBorrowsUsd: number;
  ltv: number; // current loan-to-value %
  maxLtv: number; // liquidation threshold %
  netWorthUsd: number;
  collaterals: CollateralPosition[];
  debts: DebtPosition[];
  riskLevel: RiskLevel;
  liquidationPriceDropPercent: number | null; // how much collateral needs to drop to get liquidated
  aiAlert: string | null;
  analyzedAt: string;
}

export interface ProtocolScan {
  address: string;
  protocols: Array<{
    protocol: string;
    chain: string;
    hasPosition: boolean;
    healthFactor: number | null;
    riskLevel: RiskLevel;
    totalCollateralUsd: number;
    totalDebtUsd: number;
  }>;
  highestRiskProtocol: string | null;
  overallRiskLevel: RiskLevel;
  aiSummary: string;
  analyzedAt: string;
}
