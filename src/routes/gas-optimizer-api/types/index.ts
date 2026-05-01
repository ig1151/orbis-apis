export interface GasPrice {
  slow: number;       // gwei
  standard: number;   // gwei
  fast: number;       // gwei
  instant: number;    // gwei
  baseFee: number | null;  // gwei (EIP-1559)
  unit: 'gwei';
}

export interface GasCostUsd {
  slow: number | null;
  standard: number | null;
  fast: number | null;
  instant: number | null;
}

export interface ChainGasData {
  chain: string;
  chainId: number;
  nativeToken: string;
  nativeTokenPriceUsd: number | null;
  gasPrice: GasPrice;
  estimatedWaitSeconds: {
    slow: number;
    standard: number;
    fast: number;
    instant: number;
  };
  txCostUsd: {
    transfer: GasCostUsd;    // simple ETH transfer (21000 gas)
    erc20Transfer: GasCostUsd; // ERC20 transfer (~65000 gas)
    swap: GasCostUsd;          // DEX swap (~150000 gas)
    nftMint: GasCostUsd;       // NFT mint (~200000 gas)
  };
  congestion: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  recommendation: string;
  updatedAt: string;
}

export interface OptimalTiming {
  chain: string;
  currentCongestion: string;
  currentGasGwei: number;
  recommendation: 'TRANSACT_NOW' | 'WAIT' | 'URGENT_ONLY';
  reason: string;
  estimatedSavingsIfWait: string | null;
  bestTimeToTransact: string;
  updatedAt: string;
}
