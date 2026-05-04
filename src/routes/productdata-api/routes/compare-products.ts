import { Router, Request, Response } from 'express';
import { scrape, validUrl } from '../scraper/index';
import { getCache, setCache } from '../services/cache';
import { scoreListingQuality, productId } from './helpers';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const start = Date.now();
  const { urls } = req.body;

  if (!urls || !Array.isArray(urls) || urls.length < 2) {
    res.status(400).json({ error: 'urls array with at least 2 items is required' });
    return;
  }

  const products = await Promise.all(urls.map(async (url: string) => {
    if (!validUrl(url)) return null;
    let p = await getCache(url);
    if (!p) { try { p = await scrape(url); await setCache(url, p); } catch { return null; } }
    return { url, product_id: productId(url), ...p, listing_quality_score: scoreListingQuality(p) };
  }));

  const valid = products.filter(Boolean) as any[];
  if (valid.length < 2) {
    res.status(422).json({ error: 'Could not extract at least 2 products' }); return;
  }

  const sorted_by_price   = [...valid].filter(p => p.price !== null).sort((a, b) => a.price - b.price);
  const sorted_by_quality = [...valid].sort((a, b) => b.listing_quality_score - a.listing_quality_score);
  const cheapest  = sorted_by_price[0] ?? null;
  const best      = sorted_by_quality[0] ?? null;
  const price_delta = sorted_by_price.length >= 2
    ? parseFloat((sorted_by_price[sorted_by_price.length - 1].price - sorted_by_price[0].price).toFixed(2))
    : null;

  res.json({
    product_id: null, fired: false, urgency: 'low',
    confidence: valid.length / urls.length, market_impact_score: 0,
    products: valid,
    comparison: {
      cheapest_url: cheapest?.url ?? null, cheapest_price: cheapest?.price ?? null,
      best_quality_url: best?.url ?? null, best_quality_score: best?.listing_quality_score ?? null,
      price_delta, all_in_stock: valid.every(p => p.availability === 'in_stock'),
    },
    recommended_action: 'score_listing_quality',
    execution_ready: false,
    next_api: 'product-data', next_endpoint: '/score-listing-quality',
    metadata: { latency_ms: Date.now() - start, estimated_cost: 0.0035 },
  });
});

export default router;
