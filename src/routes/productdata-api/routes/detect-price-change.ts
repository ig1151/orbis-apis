import { Router, Request, Response } from 'express';
import { scrape, validUrl } from '../scraper/index';
import { getCachedWithMeta, setCachedWithMeta } from '../services/cache';
import { productId } from './helpers';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const start = Date.now();
  const { url } = req.body;

  if (!url || !validUrl(url)) {
    res.status(400).json({ error: 'A valid url is required' }); return;
  }

  const previous = await getCachedWithMeta(url);
  let current;
  try { current = await scrape(url); await setCachedWithMeta(url, current); }
  catch (err: any) { res.status(422).json({ error: 'extraction_failed', message: err.message }); return; }

  const prevPrice  = previous?.data?.price ?? null;
  const currPrice  = current.price;
  const changed    = prevPrice !== null && currPrice !== null && prevPrice !== currPrice;
  const delta      = changed ? parseFloat((currPrice! - prevPrice).toFixed(2)) : null;
  const delta_pct  = changed && prevPrice ? parseFloat(((delta! / prevPrice) * 100).toFixed(2)) : null;
  const direction  = delta !== null ? (delta > 0 ? 'up' : 'down') : null;
  const urgency    = !changed ? 'low' : Math.abs(delta_pct ?? 0) >= 10 ? 'critical' : Math.abs(delta_pct ?? 0) >= 5 ? 'high' : 'medium';

  res.json({
    product_id: productId(url), url,
    fired: changed, urgency,
    confidence: previous ? 0.95 : 0.5,
    market_impact_score: changed ? Math.min(Math.abs(delta_pct ?? 0) / 20, 1) : 0,
    price_change: {
      previous_price: prevPrice, current_price: currPrice,
      delta, delta_pct, direction, changed,
      previous_cached_at: previous?.cached_at ?? null,
    },
    availability_change: {
      previous: previous?.data?.availability ?? null,
      current: current.availability,
      changed: previous?.data?.availability !== current.availability,
    },
    recommended_action: changed ? 'summarize_and_act' : 'continue_monitoring',
    execution_ready: changed && urgency !== 'low',
    next_api: 'product-data',
    next_endpoint: changed ? '/summarize-product' : '/monitor-product',
    metadata: { latency_ms: Date.now() - start, estimated_cost: 0.002 },
  });
});

export default router;
