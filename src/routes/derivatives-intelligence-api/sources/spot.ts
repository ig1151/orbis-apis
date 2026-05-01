import axios from 'axios';

const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
};

export interface SpotData {
  price: number;
  change24h: number;
  volume24hUSD: number;
}

export async function fetchSpot(asset: string): Promise<SpotData> {
  const id = COINGECKO_IDS[asset] ?? asset.toLowerCase();
  const res = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
    params: { ids: id, vs_currencies: 'usd', include_24hr_change: true, include_24hr_vol: true },
    timeout: 8000,
  });
  const d = res.data[id];
  return {
    price: d.usd,
    change24h: Math.round(d.usd_24h_change * 100) / 100,
    volume24hUSD: Math.round(d.usd_24h_vol),
  };
}
