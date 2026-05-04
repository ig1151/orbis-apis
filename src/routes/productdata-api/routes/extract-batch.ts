import { Router, Request, Response } from 'express';
import { scrape, validUrl } from '../scraper/index';
import { getCache, setCache } from '../services/cache';
import { scoreListingQuality, productId } from './helpers';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const start = Date.now();
  const { urls, force_refresh = false } = req.body;

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    res.status(400).json({ error: 'urls array is required' });
    return;
  }
  if (urls.length > 10) {
    res.status(400).json({ error: 'Maximum 10 URLs per batch' });
    return;
  }

  const results = await Promise.all(urls.map(async (url: string) => {
    if (!validUrl(url)) return { url, error: 'invalid_url', product: null };
    try {
      let product = force_refresh ? null : await getCache(url);
      const cached = !!product;
      if (!product) { product = await scrape(url); await setCache(url, product); }
      return { url, product_id: productId(url), product, listing_quality_score: scoreListingQuality(product), cached };
    } catch (err: any) {
      return { url, error: err.message, product: null };
    }
  }));

  const successful = results.filter(r => r.product);

  res.json({
    product_id: null, fired: false, urgency: 'low',
    confidence: successful.length / urls.length,
    market_impact_score: 0,
    total: urls.length, successful: successful.length,
    failed: urls.length - successful.length,
    results,
    recommended_action: 'compare_products',
    execution_ready: false,
    next_api: 'product-data', next_endpoint: '/compare-products',
    metadata: { latency_ms: Date.now() - start, estimated_cost: 0.008 },
  });
});

export default router;
