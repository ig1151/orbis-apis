import axios from 'axios';
import { logger } from '../logger';
import { PriceData } from '../types';

const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  ARB: 'arbitrum',
  OP: 'optimism',
  AVAX: 'avalanche-2',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  UNI: 'uniswap',
  DOGE: 'dogecoin',
  SUI: 'sui',
  APT: 'aptos',
  SEI: 'sei-network',
  INJ: 'injective-protocol',
  TIA: 'celestia',
  ATOM: 'cosmos',
  DOT: 'polkadot',
  NEAR: 'near',
  FET: 'fetch-ai',
};

const cache = new Map<string, { data: PriceData; ts: number }>();
const TTL = 5 * 60 * 1000;

export async function getPriceData(symbol: string): Promise<PriceData | null> {
  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.ts < TTL) return cached.data;

  const coingeckoId = COINGECKO_IDS[symbol.toUpperCase()];
  if (!coingeckoId) {
    logger.warn({ symbol }, 'Unknown symbol for CoinGecko');
    return null;
  }

  try {
    const res = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
      params: {
        vs_currency: 'usd',
        ids: coingeckoId,
        per_page: 1,
        page: 1,
      },
      timeout: 8000,
    });

    const coin = res.data[0];
    if (!coin) return null;

    const change24h = coin.price_change_24h || 0;
    const changePercent = coin.price_change_percentage_24h || 0;

    const priceSignal: PriceData['priceSignal'] =
      changePercent >= 3 ? 'BULLISH' :
      changePercent <= -3 ? 'BEARISH' : 'NEUTRAL';

    const data: PriceData = {
      symbol: symbol.toUpperCase(),
      price: coin.current_price,
      change24h,
      changePercent24h: Math.round(changePercent * 100) / 100,
      marketCap: coin.market_cap || null,
      volume24h: coin.total_volume || null,
      high24h: coin.high_24h || null,
      low24h: coin.low_24h || null,
      priceSignal,
    };

    cache.set(symbol, { data, ts: Date.now() });
    return data;
  } catch (err: any) {
    logger.warn({ err: err.message, symbol }, 'CoinGecko price fetch failed');
    return null;
  }
}
