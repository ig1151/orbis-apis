import { Router, Request, Response } from 'express';
import { scrape, validUrl } from '../scraper/index';
import { getCache, setCache } from '../services/cache';
import { scoreListingQuality, productId, agentBrief } from './helpers';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const start = Date.now();
  const { url, force_refresh = false } = req.body;

  if (!url || !validUrl(url)) {
    res.status(400).json({ error: 'A valid url is required' });
    return;
  }

  let cached = false;
  let product = force_refresh ? null : await getCache(url);
  if (product) {
    cached = true;
  } else {
    try {
      product = await scrape(url);
      await setCache(url, product);
    } catch (err: any) {
      res.status(422).json({ error: 'extraction_failed', message: err.message });
      return;
    }
  }

  const quality = scoreListingQuality(product);
  const pid     = productId(url);

  res.json({
    product_id:            pid,
    url,
    product,
    agent_brief:           agentBrief(product, url),
    fired:                 false,
    urgency:               'low',
    confidence:            quality / 100,
    market_impact_score:   0,
    listing_quality_score: quality,
    recommended_action:    'normalize_and_score',
    execution_ready:       false,
    next_api:              'product-data',
    next_endpoint:         '/normalize-product',
    metadata: { cached, latency_ms: Date.now() - start, estimated_cost: 0.003 },
  });
});

export default router;
