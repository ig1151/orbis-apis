import axios from 'axios';
import { logger } from '../logger';
import { GasPrice, ChainGasData } from '../types';

const ETHERSCAN_BASE = 'https://api.etherscan.io/v2/api';

// Public RPC endpoints
const RPC_URLS: Record<string, string> = {
  ethereum: 'https://ethereum-rpc.publicnode.com',
  polygon: 'https://polygon-bor-rpc.publicnode.com',
  arbitrum: 'https://arbitrum-one-rpc.publicnode.com',
  optimism: 'https://optimism-rpc.publicnode.com',
  base: 'https://base-rpc.publicnode.com',
  bsc: 'https://bsc-rpc.publicnode.com',
  avalanche: 'https://avalanche-c-chain-rpc.publicnode.com',
};

const CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  polygon: 137,
  arbitrum: 42161,
  optimism: 10,
  base: 8453,
  bsc: 56,
  avalanche: 43114,
};

const NATIVE_TOKENS: Record<string, string> = {
  ethereum: 'ETH',
  polygon: 'MATIC',
  arbitrum: 'ETH',
  optimism: 'ETH',
  base: 'ETH',
  bsc: 'BNB',
  avalanche: 'AVAX',
};

const COINGECKO_IDS: Record<string, string> = {
  ETH: 'ethereum',
  MATIC: 'matic-network',
  BNB: 'binancecoin',
  AVAX: 'avalanche-2',
};

const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 30 * 1000; // 30 seconds for gas data

async function cachedRpc(chain: string, method: string, params: any[]): Promise<any> {
  const key = `${chain}:${method}`;
  const c = cache.get(key);
  if (c && Date.now() - c.ts < CACHE_TTL) return c.data;

  const rpcUrl = RPC_URLS[chain];
  if (!rpcUrl) return null;

  const res = await axios.post(rpcUrl, {
    jsonrpc: '2.0', method, params, id: 1,
  }, { timeout: 8000, headers: { 'Content-Type': 'application/json' } });

  cache.set(key, { data: res.data.result, ts: Date.now() });
  return res.data.result;
}

async function getNativeTokenPrice(symbol: string): Promise<number | null> {
  const cacheKey = `price:${symbol}`;
  const c = cache.get(cacheKey);
  if (c && Date.now() - c.ts < 5 * 60 * 1000) return c.data;

  const id = COINGECKO_IDS[symbol];
  if (!id) return null;

  try {
    const res = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: { ids: id, vs_currencies: 'usd' },
      timeout: 6000,
    });
    const price = res.data[id]?.usd || null;
    cache.set(cacheKey, { data: price, ts: Date.now() });
    return price;
  } catch {
    return null;
  }
}

function gweiToUsd(gwei: number, gasLimit: number, tokenPriceUsd: number | null): number | null {
  if (!tokenPriceUsd) return null;
  const ethCost = (gwei * gasLimit * 1e-9);
  return Math.round(ethCost * tokenPriceUsd * 100) / 100;
}

function getCongestion(fast: number, chain: string): ChainGasData['congestion'] {
  const thresholds: Record<string, [number, number, number]> = {
    ethereum: [15, 40, 80],
    polygon: [50, 100, 200],
    arbitrum: [0.1, 0.3, 0.5],
    optimism: [0.001, 0.01, 0.05],
    base: [0.001, 0.01, 0.05],
    bsc: [3, 5, 10],
    avalanche: [25, 50, 100],
  };
  const [low, medium, high] = thresholds[chain] || [10, 30, 60];
  if (fast <= low) return 'LOW';
  if (fast <= medium) return 'MEDIUM';
  if (fast <= high) return 'HIGH';
  return 'VERY_HIGH';
}

export async function getChainGasData(chain: string): Promise<ChainGasData | null> {
  const rpcUrl = RPC_URLS[chain];
  if (!rpcUrl) return null;

  try {
    // Get gas price via eth_gasPrice
    const [gasPriceHex, feeHistoryResult] = await Promise.allSettled([
      cachedRpc(chain, 'eth_gasPrice', []),
      cachedRpc(chain, 'eth_feeHistory', ['0x4', 'latest', [25, 50, 75, 99]]),
    ]);

    const gasPriceHexVal = gasPriceHex.status === 'fulfilled' ? gasPriceHex.value : null;
    const feeHistory = feeHistoryResult.status === 'fulfilled' ? feeHistoryResult.value : null;

    if (!gasPriceHexVal) return null;

    const basePriceGwei = Math.round(parseInt(gasPriceHexVal, 16) / 1e9 * 100) / 100;

    // Calculate tiers
    let baseFee: number | null = null;
    let slow = basePriceGwei * 0.8;
    let standard = basePriceGwei;
    let fast = basePriceGwei * 1.2;
    let instant = basePriceGwei * 1.5;

    if (feeHistory?.baseFeePerGas?.length > 0) {
      const latestBase = parseInt(feeHistory.baseFeePerGas[feeHistory.baseFeePerGas.length - 1], 16) / 1e9;
      baseFee = Math.round(latestBase * 100) / 100;

      // Use reward percentiles for better estimates
      if (feeHistory.reward?.length > 0) {
        const rewards = feeHistory.reward;
        const avgP25 = rewards.reduce((s: number, r: string[]) => s + parseInt(r[0], 16) / 1e9, 0) / rewards.length;
        const avgP50 = rewards.reduce((s: number, r: string[]) => s + parseInt(r[1], 16) / 1e9, 0) / rewards.length;
        const avgP75 = rewards.reduce((s: number, r: string[]) => s + parseInt(r[2], 16) / 1e9, 0) / rewards.length;
        const avgP99 = rewards.reduce((s: number, r: string[]) => s + parseInt(r[3], 16) / 1e9, 0) / rewards.length;

        slow = Math.round((baseFee + avgP25) * 100) / 100;
        standard = Math.round((baseFee + avgP50) * 100) / 100;
        fast = Math.round((baseFee + avgP75) * 100) / 100;
        instant = Math.round((baseFee + avgP99) * 100) / 100;
      }
    }

    const nativeToken = NATIVE_TOKENS[chain];
    const nativePrice = await getNativeTokenPrice(nativeToken);
    const congestion = getCongestion(fast, chain);

    const gasPrice: GasPrice = {
      slow: Math.max(0.001, slow),
      standard: Math.max(0.001, standard),
      fast: Math.max(0.001, fast),
      instant: Math.max(0.001, instant),
      baseFee,
      unit: 'gwei',
    };

    const calcCosts = (gasLimit: number) => ({
      slow: gweiToUsd(gasPrice.slow, gasLimit, nativePrice),
      standard: gweiToUsd(gasPrice.standard, gasLimit, nativePrice),
      fast: gweiToUsd(gasPrice.fast, gasLimit, nativePrice),
      instant: gweiToUsd(gasPrice.instant, gasLimit, nativePrice),
    });

    const recommendations: Record<string, string> = {
      LOW: 'Great time to transact — gas is low.',
      MEDIUM: 'Normal conditions. Use standard gas for most transactions.',
      HIGH: 'Gas is elevated. Consider waiting or use slow gas for non-urgent transactions.',
      VERY_HIGH: 'Gas is very high. Wait unless urgent.',
    };

    const waitSeconds: Record<string, { slow: number; standard: number; fast: number; instant: number }> = {
      ethereum: { slow: 120, standard: 30, fast: 15, instant: 5 },
      polygon: { slow: 30, standard: 10, fast: 5, instant: 2 },
      arbitrum: { slow: 5, standard: 3, fast: 2, instant: 1 },
      optimism: { slow: 5, standard: 3, fast: 2, instant: 1 },
      base: { slow: 5, standard: 3, fast: 2, instant: 1 },
      bsc: { slow: 15, standard: 8, fast: 5, instant: 3 },
      avalanche: { slow: 10, standard: 5, fast: 3, instant: 1 },
    };

    return {
      chain,
      chainId: CHAIN_IDS[chain],
      nativeToken,
      nativeTokenPriceUsd: nativePrice,
      gasPrice,
      estimatedWaitSeconds: waitSeconds[chain] || { slow: 60, standard: 20, fast: 10, instant: 5 },
      txCostUsd: {
        transfer: calcCosts(21000),
        erc20Transfer: calcCosts(65000),
        swap: calcCosts(150000),
        nftMint: calcCosts(200000),
      },
      congestion,
      recommendation: recommendations[congestion],
      updatedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    logger.error({ err: err.message, chain }, 'getChainGasData error');
    return null;
  }
}
