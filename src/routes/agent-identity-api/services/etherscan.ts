import axios from 'axios';
import { logger } from '../logger';

const BASE_URL = 'https://api.etherscan.io/v2/api';

export async function getWalletStats(address: string): Promise<{
  balance: string;
  txCount: number;
  firstTx: string | null;
  lastTx: string | null;
  uniqueCounterparties: number;
  totalValueEth: number;
} | null> {
  try {
    // Get balance
    const balRes = await axios.get(BASE_URL, {
      params: {
        chainid: 1,
        module: 'account',
        action: 'balance',
        address,
        tag: 'latest',
        apikey: process.env.ETHERSCAN_API_KEY,
      },
      timeout: 8000,
    });

    const balanceEth = balRes.data.status === '1'
      ? (parseInt(balRes.data.result) / 1e18).toFixed(4)
      : '0';

    // Get tx list
    const txRes = await axios.get(BASE_URL, {
      params: {
        chainid: 1,
        module: 'account',
        action: 'txlist',
        address,
        startblock: 0,
        endblock: 99999999,
        page: 1,
        offset: 100,
        sort: 'asc',
        apikey: process.env.ETHERSCAN_API_KEY,
      },
      timeout: 10000,
    });

    if (txRes.data.status !== '1') {
      return {
        balance: balanceEth,
        txCount: 0,
        firstTx: null,
        lastTx: null,
        uniqueCounterparties: 0,
        totalValueEth: 0,
      };
    }

    const txs = txRes.data.result || [];
    const counterparties = new Set<string>();
    let totalValue = 0;

    for (const tx of txs) {
      const other = tx.from.toLowerCase() === address.toLowerCase() ? tx.to : tx.from;
      if (other) counterparties.add(other.toLowerCase());
      totalValue += parseInt(tx.value) / 1e18;
    }

    const firstTx = txs[0]
      ? new Date(parseInt(txs[0].timeStamp) * 1000).toISOString()
      : null;
    const lastTx = txs[txs.length - 1]
      ? new Date(parseInt(txs[txs.length - 1].timeStamp) * 1000).toISOString()
      : null;

    return {
      balance: balanceEth,
      txCount: txs.length,
      firstTx,
      lastTx,
      uniqueCounterparties: counterparties.size,
      totalValueEth: Math.round(totalValue * 100) / 100,
    };
  } catch (err: any) {
    logger.error({ err: err.message, address }, 'Etherscan wallet stats error');
    return null;
  }
}
