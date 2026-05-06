import { Router, Request, Response } from 'express';
import axios from 'axios';

export const nftTokenRouter = Router();

nftTokenRouter.get('/token/:contractAddress/:tokenId', async (req: Request, res: Response) => {
  const { contractAddress, tokenId } = req.params;
  const chain = (req.query.chain as string) || 'ethereum';
  if (!contractAddress || !tokenId) return res.status(400).json({ error: 'contractAddress and tokenId are required' });
  try {
    const { data } = await axios.get(
      `https://api.opensea.io/api/v2/chain/${chain}/contract/${contractAddress}/nfts/${tokenId}`,
      { headers: { 'X-API-KEY': process.env.OPENSEA_API_KEY, accept: 'application/json' } }
    );
    const nft = data.nft;
    return res.json({
      success: true,
      data: {
        tokenId: nft.identifier, name: nft.name, description: nft.description,
        imageUrl: nft.image_url, animationUrl: nft.animation_url, externalUrl: nft.external_url,
        contractAddress: nft.contract, chain, tokenStandard: nft.token_standard,
        traits: (nft.traits || []).map((t: any) => ({ type: t.trait_type, value: t.value, displayType: t.display_type ?? null })),
        owners: nft.owners ?? [], lastUpdated: nft.updated_at,
      },
    });
  } catch (err: any) {
    return res.status(err.response?.status || 500).json({ error: 'Failed to fetch NFT metadata', details: err.response?.data?.errors?.[0] || err.message });
  }
});

nftTokenRouter.post('/token', async (req: Request, res: Response) => {
  const { contractAddress, tokenId, chain = 'ethereum' } = req.body;
  if (!contractAddress || !tokenId) return res.status(400).json({ error: 'contractAddress and tokenId are required' });
  try {
    const { data } = await axios.get(`https://api.opensea.io/api/v2/chain/${chain}/contract/${contractAddress}/nfts/${tokenId}`, { headers: { 'X-API-KEY': process.env.OPENSEA_API_KEY, accept: 'application/json' } });
    const nft = data.nft;
    return res.json({ success: true, data: { tokenId: nft.identifier, name: nft.name, description: nft.description, imageUrl: nft.image_url, contractAddress: nft.contract, chain, traits: (nft.traits || []).map((t: any) => ({ type: t.trait_type, value: t.value })) } });
  } catch (err: any) { return res.status(err.response?.status || 500).json({ error: 'Failed to fetch NFT metadata', details: err.message }); }
});
