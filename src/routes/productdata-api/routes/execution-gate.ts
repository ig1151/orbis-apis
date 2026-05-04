import { Router, Request, Response } from 'express';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const start = Date.now();
  const { intended_action, product_id, url, listing_quality_score, availability, confidence } = req.body;

  if (!intended_action) {
    res.status(400).json({ error: 'intended_action is required' }); return;
  }

  const quality   = listing_quality_score ?? 50;
  const conf      = confidence ?? 0.5;
  const inStock   = availability === 'in_stock';
  const execute   = inStock && quality >= 60 && conf >= 0.5;
  const blockReason = !inStock ? 'product_not_in_stock'
    : quality < 60 ? 'listing_quality_too_low'
    : conf < 0.5   ? 'confidence_below_threshold'
    : null;

  res.json({
    product_id: product_id ?? null, url: url ?? null,
    intended_action, execute, block_reason: blockReason,
    fired: execute, urgency: execute ? 'high' : 'low',
    confidence: conf, market_impact_score: quality / 100,
    listing_quality_score: quality,
    autopilot_chain: {
      chained_to: 'autopilot/should-execute',
      autopilot_execute: execute,
      autopilot_reason: execute
        ? 'product_available_quality_sufficient'
        : 'execution_blocked_by_product_gate',
    },
    recommended_action: execute ? intended_action : 'review_product_data',
    execution_ready: execute,
    next_api:      execute ? 'autopilot' : 'product-data',
    next_endpoint: execute ? '/should-execute' : '/monitor-product',
    metadata: { latency_ms: Date.now() - start, estimated_cost: 0.003 },
  });
});

export default router;
