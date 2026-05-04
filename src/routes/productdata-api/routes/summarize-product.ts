import { Router, Request, Response } from 'express';
import { scrape, validUrl } from '../scraper/index';
import { getCache } from '../services/cache';
import { scoreListingQuality, productId, agentBrief, deriveUrgency } from './helpers';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const start = Date.now();
  const { url, product: inputProduct } = req.body;

  if (!url && !inputProduct) {
    res.status(400).json({ error: 'url or product object is required' }); return;
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
  const status  = product.availability === 'in_stock' ? 'AVAILABLE'
    : product.availability === 'out_of_stock' ? 'UNAVAILABLE' : 'UNKNOWN';

  res.json({
    product_id: pid, url: url ?? null,
    summary: {
      title: product.title, price: product.price, currency: product.currency,
      availability: product.availability, brand: product.brand,
      image_count: product.images?.length ?? 0, quality_score: quality, status,
    },
    agent_brief: agentBrief(product, url ?? ''),
    fired: false, urgency,
    confidence: quality / 100, market_impact_score: 0,
    listing_quality_score: quality,
    recommended_action: 'execution_gate',
    execution_ready: quality >= 60 && product.availability === 'in_stock',
    next_api: 'product-data', next_endpoint: '/execution-gate',
    metadata: { latency_ms: Date.now() - start, estimated_cost: 0.002 },
  });
});

export default router;
