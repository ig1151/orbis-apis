import axios from 'axios';

const LIQ_API = process.env.LIQUIDATION_API_URL || 'https://liquidation-feed-api-1.onrender.com';

export interface LiquidationData {
  recentHighSeverity: number;
  dominantSide: string;
  pressure: string;
}

export async function fetchLiquidations(): Promise<LiquidationData> {
  const res = await axios.get(`${LIQ_API}/v1/liquidations/recent`, {
    params: { severity: 'high', limit: 20 },
    timeout: 10000,
  });

  const events: any[] = res.data.liquidations || res.data.data || res.data.events || res.data || [];
  const arr = Array.isArray(events) ? events : [];

  const longs  = arr.filter((e: any) => e.liquidation_type === 'long'  || e.side === 'long').length;
  const shorts = arr.filter((e: any) => e.liquidation_type === 'short' || e.side === 'short').length;

  const dominantSide = longs > shorts ? 'long' : shorts > longs ? 'short' : 'mixed';
  const pressure = arr.length > 10 ? 'critical' : arr.length > 5 ? 'high' : arr.length > 2 ? 'elevated' : 'low';

  return { recentHighSeverity: arr.length, dominantSide, pressure };
}
