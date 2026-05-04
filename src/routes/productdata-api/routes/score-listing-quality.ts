import { Router, Request, Response } from 'express';
import { scrape, validUrl } from '../scraper/index';
import { getCache } from '../services/cache';
import { scoreListingQuality, productId, deriveUrgency } from './helpers';

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
  const urgency = deriveUrgency(quality);
  const pid     = url ? productId(url) : 'unknown';
  const issues: string[] = [];
  if (!product.title)          issues.push('missing_title');
  if (!product.price)          issues.push('missing_price');
  if (!product.availability)   issues.push('missing_availability');
  if (!product.images?.length) issues.push('missing_images');
  if (!product.brand)          issues.push('missing_brand');
  if (!product.description)    issues.push('missing_description');

  res.json({
    product_id: pid, url: url ?? null,
    fired: quality < 60, urgency,
    confidence: quality / 100, market_impact_score: quality / 100,
    listing_quality_score: quality,
    grade: quality >= 80 ? 'A' : quality >= 60 ? 'B' : quality >= 40 ? 'C' : 'D',
    issues,
    recommended_action: quality < 60 ? 'flag_for_review' : 'monitor_product',
    execution_ready: quality >= 60,
    next_api: 'product-data', next_endpoint: '/monitor-product',
    metadata: { latency_ms: Date.now() - start, estimated_cost: 0.0025 },
  });
});

export default router;
