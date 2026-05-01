import axios from 'axios';
import { logger } from '../logger';

export interface ProtocolInfo {
  name: string;
  slug: string;
  tvl: number | null;
  change_7d: number | null;
  change_1m: number | null;
  chains: string[];
  category: string | null;
  audits: number | null;
  audit_links: string[] | null;
}

export async function getProtocolInfo(slug: string): Promise<ProtocolInfo | null> {
  try {
    const res = await axios.get(`https://api.llama.fi/protocol/${slug}`, { timeout: 10000 });
    const d = res.data;
    return {
      name: d.name || slug,
      slug,
      tvl: d.tvl || null,
      change_7d: d.change_7d || null,
      change_1m: d.change_1m || null,
      chains: d.chains || [],
      category: d.category || null,
      audits: d.audits || null,
      audit_links: d.audit_links || null,
    };
  } catch (err: any) {
    logger.error({ err: err.message, slug }, 'DeFiLlama protocol fetch error');
    return null;
  }
}

export async function getProtocolTvlHistory(slug: string): Promise<Array<{ date: number; totalLiquidityUSD: number }>> {
  try {
    const res = await axios.get(`https://api.llama.fi/tvl/${slug}`, { timeout: 10000 });
    return res.data || [];
  } catch {
    return [];
  }
}
