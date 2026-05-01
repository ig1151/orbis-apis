import axios from 'axios';
import { logger } from '../logger';

const BASE_URL = 'https://api.etherscan.io/v2/api';

const CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  base: 8453,
  arbitrum: 42161,
  polygon: 137,
  optimism: 10,
  bsc: 56,
};

function getChainId(chain: string): number {
  return CHAIN_IDS[chain.toLowerCase()] || 1;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getEthBalance(address: string, chain = 'ethereum'): Promise<string> {
  const res = await axios.get(BASE_URL, {
    params: { chainid: getChainId(chain), module: 'account', action: 'balance', address, tag: 'latest', apikey: process.env.ETHERSCAN_API_KEY },
    timeout: 8000,
  });
  if (res.data.status !== '1') return '0';
  return (parseInt(res.data.result) / 1e18).toFixed(6);
}

export async function getEthPrice(): Promise<number | null> {
  try {
    const res = await axios.get(BASE_URL, {
      params: { chainid: 1, module: 'stats', action: 'ethprice', apikey: process.env.ETHERSCAN_API_KEY },
      timeout: 5000,
    });
    if (res.data.status === '1') return parseFloat(res.data.result.ethusd);
  } catch {}
  return null;
}

export async function getTokenBalances(address: string, chain = 'ethereum'): Promise<any[]> {
  try {
    await sleep(200);
    const res = await axios.get(BASE_URL, {
      params: { chainid: getChainId(chain), module: 'account', action: 'tokentx', address, startblock: 0, endblock: 99999999, page: 1, offset: 100, sort: 'desc', apikey: process.env.ETHERSCAN_API_KEY },
      timeout: 12000,
    });
    if (res.data.status !== '1') return [];

    const tokenMap = new Map<string, any>();
    for (const tx of res.data.result) {
      const key = tx.contractAddress.toLowerCase();
      if (!tokenMap.has(key)) {
        tokenMap.set(key, {
          contractAddress: tx.contractAddress,
          symbol: tx.tokenSymbol,
          name: tx.tokenName,
          decimals: parseInt(tx.tokenDecimal),
        });
      }
    }
    return Array.from(tokenMap.values()).slice(0, 20);
  } catch (err: any) {
    logger.warn({ err: err.message }, 'getTokenBalances error');
    return [];
  }
}

export async function getTokenBalance(address: string, contractAddress: string, chain = 'ethereum'): Promise<string> {
  try {
    await sleep(250);
    const res = await axios.get(BASE_URL, {
      params: { chainid: getChainId(chain), module: 'account', action: 'tokenbalance', address, contractaddress: contractAddress, tag: 'latest', apikey: process.env.ETHERSCAN_API_KEY },
      timeout: 6000,
    });
    if (res.data.status !== '1') return '0';
    return res.data.result;
  } catch {
    return '0';
  }
}

export async function getTxList(address: string, chain = 'ethereum', limit = 100): Promise<any[]> {
  try {
    await sleep(200);
    const res = await axios.get(BASE_URL, {
      params: { chainid: getChainId(chain), module: 'account', action: 'txlist', address, startblock: 0, endblock: 99999999, page: 1, offset: limit, sort: 'desc', apikey: process.env.ETHERSCAN_API_KEY },
      timeout: 10000,
    });
    if (res.data.status !== '1') return [];
    return res.data.result || [];
  } catch {
    return [];
  }
}