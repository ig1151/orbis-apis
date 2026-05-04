import { Router, Request, Response } from 'express';
import { scrape, validUrl } from '../scraper/index';
import { getCache } from '../services/cache';
import { scoreListingQuality, productId, agentBrief } from './helpers';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const start = Date.now();
  const { url, product: inputProduct } = req.body;

  if (!url && !inputProduct) {
    res.status(400).json({ error: 'url or product object is required' });
    return;
  }

  let product = inputProduct;
  if (!product && url) {
    product = await getCache(url);
    if (!product && validUrl(url)) {
      try { product = await scrape(url); } catch (err: any) {
        res.status(422).json({ error: 'extraction_failed', message: err.message }); return;
      }
    }
  }

  const quality = scoreListingQuality(product);
  const pid     = url ? productId(url) : 'unknown';

  res.json({
    product_id: pid, url: url ?? null,
    normalized: {
      product_id: pid,
      title:        (product.title || '').trim(),
      price:        product.price,
      currency:     product.currency || 'USD',
      availability: product.availability || 'unknown',
      in_stock:     product.availability === 'in_stock',
      images:       product.images || [],
      image_count:  (product.images || []).length,
      brand:        product.brand || null,
      sku:          product.sku || null,
      description:  product.description || null,
      rating:       product.rating || null,
      review_count: product.review_count || null,
      source:       product.source,
      completeness_pct: quality,
    },
    agent_brief: agentBrief(product, url ?? ''),
    fired: false, urgency: 'low',
    confidence: quality / 100, market_impact_score: 0,
    listing_quality_score: quality,
    recommended_action: 'score_listing_quality',
    execution_ready: false,
    next_api: 'product-data', next_endpoint: '/score-listing-quality',
    metadata: { latency_ms: Date.now() - start, estimated_cost: 0.0015 },
  });
});

export default router;
