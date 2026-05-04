import { Router, Request, Response } from 'express';
import { dispatchFiredEvent } from '../services/dispatcher';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const start = Date.now();
  await dispatchFiredEvent({
    trigger_id:          'test_' + Date.now(),
    symbol:              'BTC',
    condition_type:      'price_above',
    current_value:       78000,
    threshold:           50000,
    urgency:             'high',
    confidence:          0.88,
    market_impact_score: 0.75,
    recommended_action:  'score_and_route',
    fired_at:            new Date().toISOString(),
  });
  res.json({ dispatched: true, latency_ms: Date.now() - start });
});

export default router;
