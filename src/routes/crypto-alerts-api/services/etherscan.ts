import axios from 'axios';
import { logger } from '../logger';
import { WhaleTransaction } from '../types';

const BASE_URL = 'https://api.etherscan.io/v2/api';

const CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  bsc: 56,
};

const EXCHANGE_LABELS: Record<string, string> = {
  '0x28c6c06298d514db089934071355e5743bf21d60': 'Binance',
  '0x21a31ee1afc51d94c2efccaa2092ad1028285549': 'Binance 2',
  '0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43': 'Coinbase',
  '0x71660c4005ba85c37ccec55d0c4493e66fe775d3': 'Coinbase 2',
  '0xb739d0895772dbb71a89a3754a160269068f0d45': 'Kraken',
  '0x2910543af39aba0cd09dbb2d50200b3e800a63d2': 'Kraken 2',
  '0x43984d578803891dfa9706bdeee6078d80cfc79e': 'OKX',
  '0xf89d7b9c864f589bbf53a82105107622b35eaa40': 'Bybit',
  // BSC exchanges
  '0xe2fc31f816a9b94326492132018c3aecc4a93ae1': 'Binance BSC',
  '0x8894e0a0c962cb723c1976a4421c95949be2d4e3': 'Binance BSC 2',
  '0x3c783c21a0383057d128bae431894a5c19f9cf06': 'OKX BSC',
};

const TOKEN_CONTRACTS: Record<string, Record<string, { address: string; decimals: number }>> = {
  ethereum: {
    USDC: { address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', decimals: 6 },
    USDT: { address: '0xdac17f958d2ee523a2206206994597c13d831ec7', decimals: 6 },
    WETH: { address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', decimals: 18 },
    LINK: { address: '0x514910771af9ca656af840dff83e8264ecf986ca', decimals: 18 },
    UNI:  { address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', decimals: 18 },
  },
  bsc: {
    USDT: { address: '0x55d398326f99059ff775485246999027b3197955', decimals: 18 },
    USDC: { address: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', decimals: 18 },
    BUSD: { address: '0xe9e7cea3dedca5984780bafc599bd69add087d56', decimals: 18 },
    WBNB: { address: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', decimals: 18 },
    CAKE: { address: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82', decimals: 18 },
  },
};

export async function getWhaleTransactions(
  symbol: string,
  minUsd = 100000,
  limit = 10,
  chain = 'ethereum'
): Promise<WhaleTransaction[]> {
  const chainKey = chain.toLowerCase();
  const chainId = CHAIN_IDS[chainKey];
  if (!chainId) return [];

  const tokenInfo = TOKEN_CONTRACTS[chainKey]?.[symbol.toUpperCase()];
  if (!tokenInfo) return [];

  try {
    const res = await axios.get(BASE_URL, {
      params: {
        chainid: chainId,
        module: 'account',
        action: 'tokentx',
        contractaddress: tokenInfo.address,
        startblock: 0,
        endblock: 99999999,
        page: 1,
        offset: 200,
        sort: 'desc',
        apikey: process.env.ETHERSCAN_API_KEY,
      },
      timeout: 12000,
    });

    if (res.data.status !== '1') return [];

    const whales: WhaleTransaction[] = [];
    for (const tx of res.data.result) {
      const amount = parseInt(tx.value) / Math.pow(10, tokenInfo.decimals);
      const stableSymbols = ['USDC', 'USDT', 'BUSD'];
      const amountUsd = stableSymbols.includes(symbol.toUpperCase()) ? amount : null;

      if (amountUsd !== null && amountUsd < minUsd) continue;
      if (amountUsd === null && amount < 10) continue;

      const fromLabel = EXCHANGE_LABELS[tx.from?.toLowerCase()] || null;
      const toLabel = EXCHANGE_LABELS[tx.to?.toLowerCase()] || null;

      let direction: WhaleTransaction['direction'] = 'wallet_to_wallet';
      let sentiment: WhaleTransaction['sentiment'] = 'NEUTRAL';

      if (toLabel) { direction = 'exchange_inflow'; sentiment = 'BEARISH'; }
      else if (fromLabel) { direction = 'exchange_outflow'; sentiment = 'BULLISH'; }

      whales.push({
        txHash: tx.hash,
        symbol: symbol.toUpperCase(),
        from: tx.from,
        to: tx.to,
        fromLabel,
        toLabel,
        amount,
        amountUsd,
        direction,
        sentiment,
        timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
      });

      if (whales.length >= limit) break;
    }
    return whales;
  } catch (err: any) {
    logger.error({ err: err.message, symbol, chain }, 'whale tx fetch error');
    return [];
  }
}