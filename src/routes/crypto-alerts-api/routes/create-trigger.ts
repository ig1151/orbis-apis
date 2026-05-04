import { Router, Request, Response } from 'express';
import { newTriggerId } from './helpers';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const start = Date.now();
  const { symbol, condition_type, threshold, direction, ttl_hours, metadata: meta } = req.body;

  if (!symbol || !condition_type || threshold === undefined) {
    res.status(400).json({ error: 'symbol, condition_type, and threshold are required' });
    return;
  }

  const trigger_id = newTriggerId();

  res.status(201).json({
    trigger_id,
    symbol:         symbol.toUpperCase(),
    condition_type,
    threshold,
    direction:      direction ?? null,
    ttl_hours:      ttl_hours ?? 24,
    status:         'active',
    fired:          false,
    urgency:        'low',
    confidence:     0,
    market_impact_score: 0,
    recommended_action:  'monitor',
    execution_ready:     false,
    next_api:            'crypto-alerts',
    next_endpoint:       '/check-triggers',
    metadata: {
      latency_ms:     Date.now() - start,
      estimated_cost: 0.0025,
      trigger_meta:   meta ?? null,
    },
  });
});

export default router;
