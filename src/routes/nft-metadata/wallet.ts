import { Router, Request, Response } from 'express';
import axios from 'axios';

export const nftWalletRouter = Router();

nftWalletRouter.get('/wallet/:walletAddress', async (req: Request, res: Response) => {
  const { walletAddress } = req.params;
  const chain = (req.query.chain as string) || 'ethereum';
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 200);
  const next = (req.query.next as string) || undefined;
  if (!walletAddress) return res.status(400).json({ error: 'walletAddress is required' });
  try {
    const { data } = await axios.get(
      `https://api.opensea.io/api/v2/chain/${chain}/account/${walletAddress}/nfts`,
      { headers: { 'X-API-KEY': process.env.OPENSEA_API_KEY, accept: 'application/json' }, params: { limit, next } }
    );
    return res.json({
      success: true,
      data: {
        walletAddress, chain,
        count: data.nfts?.length ?? 0,
        next: data.next ?? null,
        nfts: (data.nfts || []).map((nft: any) => ({
          tokenId: nft.identifier, name: nft.name, imageUrl: nft.image_url,
          contractAddress: nft.contract, tokenStandard: nft.token_standard,
          collection: nft.collection, updatedAt: nft.updated_at,
        })),
      },
    });
  } catch (err: any) {
    return res.status(err.response?.status || 500).json({ error: 'Failed to fetch wallet NFTs', details: err.response?.data?.errors?.[0] || err.message });
  }
});

nftWalletRouter.post('/wallet', async (req: Request, res: Response) => {
  const { walletAddress, chain = 'ethereum', limit = 20 } = req.body;
  if (!walletAddress) return res.status(400).json({ error: 'walletAddress is required' });
  try {
    const { data } = await axios.get(`https://api.opensea.io/api/v2/chain/${chain}/account/${walletAddress}/nfts`, { headers: { 'X-API-KEY': process.env.OPENSEA_API_KEY, accept: 'application/json' }, params: { limit: Math.min(limit, 200) } });
    return res.json({ success: true, data: { walletAddress, chain, count: data.nfts?.length || 0, nfts: data.nfts || [] } });
  } catch (err: any) { return res.status(err.response?.status || 500).json({ error: 'Failed to fetch wallet NFTs', details: err.message }); }
});
