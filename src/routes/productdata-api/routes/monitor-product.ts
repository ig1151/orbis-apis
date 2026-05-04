import { Router, Request, Response } from 'express';
import { scrape, validUrl } from '../scraper/index';
import { getCachedWithMeta, setCachedWithMeta } from '../services/cache';
import { scoreListingQuality, productId, deriveUrgency } from './helpers';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const start = Date.now();
  const { url, thresholds, interval } = req.body;

  if (!url || !validUrl(url)) {
    res.status(400).json({ error: 'A valid url is required' }); return;
  }

  const active = thresholds ?? { price_change_pct: 5, availability_change: true };
  const previous = await getCachedWithMeta(url);
  let current;
  try { current = await scrape(url); await setCachedWithMeta(url, current); }
  catch (err: any) { res.status(422).json({ error: 'extraction_failed', message: err.message }); return; }

  const prevPrice     = previous?.data?.price ?? null;
  const currPrice     = current.price;
  const priceChanged  = prevPrice !== null && currPrice !== null && prevPrice !== currPrice;
  const priceDeltaPct = priceChanged && prevPrice ? Math.abs((currPrice! - prevPrice) / prevPrice * 100) : 0;
  const availChanged  = previous && previous.data.availability !== current.availability;
  const triggered     = (priceChanged && priceDeltaPct >= active.price_change_pct) || (active.availability_change && availChanged);
  const quality       = scoreListingQuality(current);
  const urgency       = triggered ? deriveUrgency(priceDeltaPct * 5) : 'low';

  const alerts: any[] = [];
  if (priceChanged && priceDeltaPct >= active.price_change_pct)
    alerts.push({ type: 'price_change', severity: urgency, delta_pct: parseFloat(priceDeltaPct.toFixed(2)) });
  if (active.availability_change && availChanged)
    alerts.push({ type: 'availability_change', severity: 'high', previous: previous!.data.availability, current: current.availability });

  res.json({
    product_id: productId(url), url,
    monitoring_active: true, interval_seconds: interval ?? 300,
    thresholds: active, fired: triggered, urgency,
    confidence: previous ? 0.92 : 0.5,
    market_impact_score: triggered ? Math.min(priceDeltaPct / 20, 1) : 0,
    current_snapshot: { price: currPrice, availability: current.availability, quality_score: quality },
    alerts,
    recommended_action: triggered ? 'detect_price_change' : 'continue_monitoring',
    execution_ready: triggered,
    next_api: 'product-data',
    next_endpoint: triggered ? '/detect-price-change' : '/monitor-product',
    metadata: { latency_ms: Date.now() - start, estimated_cost: 0.0015 },
  });
});

export default router;
