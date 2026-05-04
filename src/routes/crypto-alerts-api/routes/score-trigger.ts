import { Router, Request, Response } from 'express';
import { fetchPriceOrNull, deriveUrgency, urgencyToAction } from './helpers';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const start = Date.now();
  const { trigger_id, symbol, fired, threshold, condition_type } = req.body;

  if (!trigger_id && !symbol) {
    res.status(400).json({ error: 'trigger_id or symbol is required' });
    return;
  }

  const price = await fetchPriceOrNull(symbol);
  const isFired = fired ?? false;

  const volatilityScore = price ? Math.min(Math.abs(price.changePercent24h) / 20, 1) : 0.3;
  const volumeScore = price ? Math.min(price.volume24h / 5e9, 1) : 0.3;
  const proximityScore = price && threshold
    ? Math.max(0, 1 - Math.abs(price.price - threshold) / threshold)
    : 0.5;

  const confidence = isFired
    ? parseFloat(((volatilityScore + proximityScore) / 2 * 0.4 + 0.6).toFixed(3))
    : parseFloat(((volatilityScore + proximityScore) / 2).toFixed(3));

  const market_impact_score = parseFloat(((volatilityScore + volumeScore) / 2).toFixed(3));
  const urgency = deriveUrgency(confidence, market_impact_score);

  res.json({
    trigger_id:    trigger_id ?? null,
    symbol:        symbol?.toUpperCase() ?? null,
    fired:         isFired,
    urgency,
    confidence,
    market_impact_score,
    scoring_breakdown: {
      volatility_score: parseFloat(volatilityScore.toFixed(3)),
      volume_score:     parseFloat(volumeScore.toFixed(3)),
      proximity_score:  parseFloat(proximityScore.toFixed(3)),
    },
    current_price:     price?.price ?? null,
    change_24h_pct:    price?.changePercent24h ?? null,
    recommended_action: urgencyToAction(urgency),
    execution_ready:    urgency === 'critical' || urgency === 'high',
    next_api:           'crypto-alerts',
    next_endpoint:      '/route-alert',
    metadata: {
      latency_ms:     Date.now() - start,
      estimated_cost: 0.0025,
    },
  });
});

export default router;
