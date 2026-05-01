import axios from 'axios';

const FUNDING_API = process.env.FUNDING_RATE_API_URL || 'https://funding-rate-api.onrender.com';

export interface FundingData {
  averageRate: number;
  sentiment: string;
  topExchange: string;
  arbitrageExists: boolean;
  signal: string;
}

export async function fetchFunding(asset: string): Promise<FundingData> {
  const [ratesRes, signalRes] = await Promise.allSettled([
    axios.get(`${FUNDING_API}/v1/rates/now`, { params: { symbol: asset }, timeout: 10000 }),
    axios.get(`${FUNDING_API}/v1/rates/signal`, { params: { symbol: asset }, timeout: 10000 }),
  ]);

  let averageRate = 0;
  let sentiment = 'neutral';
  let topExchange = 'unknown';
  let arbitrageExists = false;
  let signal = '';

  if (ratesRes.status === 'fulfilled') {
    const d = ratesRes.value.data;
    const rates: any[] = d.data?.rates || d.rates || d.data || [];
    if (rates.length > 0) {
      const avg = rates.reduce((s: number, r: any) => s + (r.rate8h || r.fundingRate || r.rate || 0), 0) / rates.length;
      averageRate = Math.round(avg * 1000000) / 1000000;
      topExchange = rates[0]?.exchange || rates[0]?.name || 'unknown';
      sentiment = averageRate > 0.0005 ? 'long-heavy' : averageRate < -0.0005 ? 'short-heavy' : 'neutral';
      arbitrageExists = d.data?.arbitrage?.exists || d.arbitrage?.exists || false;
    }
  }

  if (signalRes.status === 'fulfilled') {
    const s = signalRes.value.data;
    signal = s.signal || s.recommendation || s.narrative || '';
  }

  return { averageRate, sentiment, topExchange, arbitrageExists, signal };
}
