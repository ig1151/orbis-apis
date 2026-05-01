import axios from 'axios';
import { logger } from '../logger';

const RPC_URLS: Record<string, string> = {
  ethereum: 'https://ethereum-rpc.publicnode.com',
  polygon: 'https://polygon-bor-rpc.publicnode.com',
  arbitrum: 'https://arbitrum-one-rpc.publicnode.com',
  optimism: 'https://optimism-rpc.publicnode.com',
  base: 'https://base-rpc.publicnode.com',
  avalanche: 'https://avalanche-c-chain-rpc.publicnode.com',
};

const POOL_ADDRESSES: Record<string, string> = {
  ethereum: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
  polygon: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  arbitrum: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  optimism: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  base: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
  avalanche: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
};

const GET_USER_ACCOUNT_DATA_SELECTOR = '0xbf92857c';

function encodeAddress(address: string): string {
  return address.toLowerCase().replace('0x', '').padStart(64, '0');
}

export interface AaveUserData {
  healthFactor: number;
  totalCollateralUSD: number;
  totalDebtUSD: number;
  availableBorrowsUSD: number;
  currentLiquidationThreshold: number;
  ltv: number;
  collaterals: Array<{
    symbol: string;
    underlyingBalance: string;
    underlyingBalanceUSD: string;
    usageAsCollateralEnabledOnUser: boolean;
  }>;
  borrows: Array<{
    symbol: string;
    currentTotalDebt: string;
    currentTotalDebtUSD: string;
    variableBorrowRate: string;
  }>;
}

export async function getAavePosition(address: string, chain = 'ethereum'): Promise<AaveUserData | null> {
  const rpcUrl = RPC_URLS[chain.toLowerCase()];
  const poolAddress = POOL_ADDRESSES[chain.toLowerCase()];
  if (!rpcUrl || !poolAddress) return null;

  try {
    const callData = GET_USER_ACCOUNT_DATA_SELECTOR + encodeAddress(address);

    const res = await axios.post(rpcUrl, {
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{ to: poolAddress, data: callData }, 'latest'],
      id: 1,
    }, {
      timeout: 12000,
      headers: { 'Content-Type': 'application/json' },
    });

    const result = res.data?.result;
    if (!result || result === '0x' || result.length < 10) return null;

    const data = result.replace('0x', '');
    if (data.length < 6 * 64) return null;

    const totalCollateralBase = BigInt('0x' + data.slice(0, 64));
    const totalDebtBase = BigInt('0x' + data.slice(64, 128));
    const availableBorrowsBase = BigInt('0x' + data.slice(128, 192));
    const currentLiquidationThreshold = BigInt('0x' + data.slice(192, 256));
    const ltv = BigInt('0x' + data.slice(256, 320));
    const healthFactorRaw = BigInt('0x' + data.slice(320, 384));

    const totalCollateralUSD = Number(totalCollateralBase) / 1e8;
    const totalDebtUSD = Number(totalDebtBase) / 1e8;
    const availableBorrowsUSD = Number(availableBorrowsBase) / 1e8;
    const healthFactor = Number(healthFactorRaw) / 1e18;

    if (totalCollateralUSD === 0 && totalDebtUSD === 0) return null;

    const displayHF = healthFactor > 1000000 ? 999 : Math.round(healthFactor * 100) / 100;

    return {
      healthFactor: displayHF,
      totalCollateralUSD: Math.round(totalCollateralUSD),
      totalDebtUSD: Math.round(totalDebtUSD),
      availableBorrowsUSD: Math.round(availableBorrowsUSD),
      currentLiquidationThreshold: Number(currentLiquidationThreshold) / 100,
      ltv: Number(ltv) / 100,
      collaterals: [],
      borrows: [],
    };
  } catch (err: any) {
    logger.warn({ err: err.message, address, chain }, 'Aave RPC fetch failed');
    return null;
  }
}