import axios from 'axios';

const DERIV_API = process.env.DERIVATIVES_API_URL || 'https://derivatives-api-oqhb.onrender.com';

export interface OptionsData {
  putCallRatio: number;
  maxPain: number | null;
  nearestExpiry: string | null;
  totalCallOI: number;
  totalPutOI: number;
}

export async function fetchOptions(asset: string): Promise<OptionsData> {
  const res = await axios.get(`${DERIV_API}/v1/options/summary/${asset}`, { timeout: 15000 });
  const summary = res.data.summary || {};
  return {
    putCallRatio: summary.putCallRatioOI || 0,
    maxPain: summary.maxPainByExpiry
      ? (Object.values(summary.maxPainByExpiry)[0] as any)?.maxPain ?? null
      : null,
    nearestExpiry: summary.nearestExpiry || null,
    totalCallOI: summary.totalCallOI || 0,
    totalPutOI: summary.totalPutOI || 0,
  };
}
