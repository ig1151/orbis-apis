import { Router, Request, Response } from 'express';
import axios from 'axios';

export const nftCollectionRouter = Router();

nftCollectionRouter.get('/collection/:contractAddress', async (req: Request, res: Response) => {
  const { contractAddress } = req.params;
  const chain = (req.query.chain as string) || 'ethereum';
  if (!contractAddress) return res.status(400).json({ error: 'contractAddress is required' });
  try {
    const headers = { 'X-API-KEY': process.env.OPENSEA_API_KEY, accept: 'application/json' };
    const { data: contractData } = await axios.get(`https://api.opensea.io/api/v2/chain/${chain}/contract/${contractAddress}`, { headers });
    const slug = contractData.collection;
    const [{ data: colData }, { data: statsData }] = await Promise.all([
      axios.get(`https://api.opensea.io/api/v2/collections/${slug}`, { headers }),
      axios.get(`https://api.opensea.io/api/v2/collections/${slug}/stats`, { headers }),
    ]);
    const total = statsData.total || {};
    const day1 = (statsData.intervals || []).find((i: any) => i.interval === 'one_day') || {};
    return res.json({
      success: true,
      data: {
        slug, name: colData.name, description: colData.description,
        imageUrl: colData.image_url, bannerImageUrl: colData.banner_image_url,
        externalUrl: colData.project_url, contractAddress, chain,
        floorPrice: total.floor_price ?? null, floorPriceCurrency: total.floor_price_symbol ?? 'ETH',
        volume24h: day1.volume ?? null, sales24h: day1.sales ?? null,
        averagePrice24h: day1.average_price ?? null, totalVolume: total.volume ?? null,
        totalSales: total.sales ?? null, marketCap: total.market_cap ?? null,
        royaltyFee: colData.fees?.[0]?.fee ?? null,
      },
    });
  } catch (err: any) {
    return res.status(err.response?.status || 500).json({ error: 'Failed to fetch collection data', details: err.response?.data?.errors?.[0] || err.message });
  }
});
