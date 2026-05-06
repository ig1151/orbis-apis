import { Router, Request, Response } from 'express';
import axios from 'axios';

export const nftTransfersRouter = Router();

nftTransfersRouter.get('/transfers/:contractAddress/:tokenId', async (req: Request, res: Response) => {
  const { contractAddress, tokenId } = req.params;
  const chain = (req.query.chain as string) || 'ethereum';
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  if (!contractAddress || !tokenId) return res.status(400).json({ error: 'contractAddress and tokenId are required' });
  try {
    const { data } = await axios.get(
      `https://api.opensea.io/api/v2/events/chain/${chain}/contract/${contractAddress}/nfts/${tokenId}`,
      { headers: { 'X-API-KEY': process.env.OPENSEA_API_KEY, accept: 'application/json' }, params: { event_type: 'transfer', limit } }
    );
    return res.json({
      success: true,
      data: {
        contractAddress, tokenId, chain,
        count: data.asset_events?.length ?? 0,
        next: data.next ?? null,
        transfers: (data.asset_events || []).map((e: any) => ({
          eventType: e.event_type, fromAddress: e.from_address, toAddress: e.to_address,
          transactionHash: e.transaction, timestamp: e.closing_date ?? e.created_date, quantity: e.quantity ?? 1,
        })),
      },
    });
  } catch (err: any) {
    return res.status(err.response?.status || 500).json({ error: 'Failed to fetch transfer history', details: err.response?.data?.errors?.[0] || err.message });
  }
});

nftTransfersRouter.post('/transfers', async (req: Request, res: Response) => {
  const { contractAddress, tokenId, chain = 'ethereum', limit = 20 } = req.body;
  if (!contractAddress || !tokenId) return res.status(400).json({ error: 'contractAddress and tokenId are required' });
  try {
    const { data } = await axios.get(`https://api.opensea.io/api/v2/events/chain/${chain}/contract/${contractAddress}/nfts/${tokenId}`, { headers: { 'X-API-KEY': process.env.OPENSEA_API_KEY, accept: 'application/json' }, params: { event_type: 'transfer', limit: Math.min(limit, 50) } });
    return res.json({ success: true, data: { contractAddress, tokenId, chain, count: data.asset_events?.length || 0, transfers: data.asset_events || [] } });
  } catch (err: any) { return res.status(err.response?.status || 500).json({ error: 'Failed to fetch transfers', details: err.message }); }
});
