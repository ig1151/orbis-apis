import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { getTokenPrice, getMultipleTokenPrices, getTokensByChain, getTrendingTokens } from '../services/priceService';

const router = Router();

router.get('/price/:coinId', async (req: Request, res: Response) => {
  const { coinId } = req.params;
  if (!coinId || coinId.length > 100) {
    res.status(400).json({ error: 'Invalid coinId' });
    return;
  }
  try {
    const price = await getTokenPrice(coinId.toLowerCase());
    res.json({ success: true, data: price });
  } catch (err: any) {
    console.log(`[token-price-feed] price error: ${err.message}`);
    if (err.message?.includes('not found')) {
      res.status(404).json({ error: err.message });
    } else {
      res.status(502).json({ error: 'Failed to fetch price data', detail: err.message });
    }
  }
});

router.get('/multi', async (req: Request, res: Response) => {
  const schema = Joi.object({ ids: Joi.string().max(500).required() });
  const { error, value } = schema.validate(req.query);
  if (error) {
    res.status(400).json({ error: 'Validation failed', detail: error.details[0].message });
    return;
  }
  const ids = value.ids.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
  if (ids.length === 0 || ids.length > 25) {
    res.status(400).json({ error: 'Provide between 1 and 25 coin IDs' });
    return;
  }
  try {
    const prices = await getMultipleTokenPrices(ids);
    res.json({ success: true, count: Object.keys(prices).length, data: prices });
  } catch (err: any) {
    console.log(`[token-price-feed] multi error: ${err.message}`);
    res.status(502).json({ error: 'Failed to fetch prices', detail: err.message });
  }
});

router.get('/chain/:chain', async (req: Request, res: Response) => {
  const { chain } = req.params;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
  try {
    const tokens = await getTokensByChain(chain, limit);
    res.json({ success: true, chain, count: tokens.length, data: tokens });
  } catch (err: any) {
    console.log(`[token-price-feed] chain error: ${err.message}`);
    if (err.message?.includes('Unsupported chain')) {
      res.status(400).json({ error: err.message });
    } else {
      res.status(502).json({ error: 'Failed to fetch chain tokens', detail: err.message });
    }
  }
});

router.get('/trending', async (_req: Request, res: Response) => {
  try {
    const trending = await getTrendingTokens();
    res.json({ success: true, count: trending.length, data: trending });
  } catch (err: any) {
    console.log(`[token-price-feed] trending error: ${err.message}`);
    res.status(502).json({ error: 'Failed to fetch trending tokens', detail: err.message });
  }
});


router.post('/price', async (req: Request, res: Response) => {
  const { coinId } = req.body;
  if (!coinId || coinId.length > 100) { res.status(400).json({ error: 'Invalid coinId' }); return; }
  try {
    const price = await getTokenPrice(coinId.toLowerCase());
    res.json({ success: true, data: price });
  } catch (err: any) {
    if (err.message?.includes('not found')) { res.status(404).json({ error: err.message }); }
    else { res.status(502).json({ error: 'Failed to fetch price data', detail: err.message }); }
  }
});
router.post('/multi', async (req: Request, res: Response) => {
  const { ids } = req.body;
  if (!ids) { res.status(400).json({ error: 'ids is required' }); return; }
  const idList = Array.isArray(ids) ? ids : ids.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
  if (idList.length === 0 || idList.length > 25) { res.status(400).json({ error: 'Provide between 1 and 25 coin IDs' }); return; }
  try {
    const prices = await getMultipleTokenPrices(idList);
    res.json({ success: true, count: Object.keys(prices).length, data: prices });
  } catch (err: any) { res.status(502).json({ error: 'Failed to fetch prices', detail: err.message }); }
});
router.post('/chain', async (req: Request, res: Response) => {
  const { chain, limit } = req.body;
  if (!chain) { res.status(400).json({ error: 'chain is required' }); return; }
  try {
    const tokens = await getTokensByChain(chain, Math.min(parseInt(limit) || 10, 50));
    res.json({ success: true, chain, count: tokens.length, data: tokens });
  } catch (err: any) {
    if (err.message?.includes('Unsupported chain')) { res.status(400).json({ error: err.message }); }
    else { res.status(502).json({ error: 'Failed to fetch chain tokens', detail: err.message }); }
  }
});
router.post('/trending', async (_req: Request, res: Response) => {
  try {
    const trending = await getTrendingTokens();
    res.json({ success: true, count: trending.length, data: trending });
  } catch (err: any) { res.status(502).json({ error: 'Failed to fetch trending tokens', detail: err.message }); }
});

export default router;
