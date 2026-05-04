import { Router, Request, Response } from 'express';
import { fetchPriceOrNull, deriveUrgency } from './helpers';
import { dispatchFiredEvent } from '../services/dispatcher';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const start = Date.now();
  const { triggers } = req.body;

  if (!triggers || !Array.isArray(triggers) || triggers.length === 0) {
    res.status(400).json({ error: 'triggers array is required' });
    return;
  }

  const results = await Promise.all(triggers.map(async (t: any) => {
    const price = await fetchPriceOrNull(t.symbol);
    const currentValue = price?.price ?? null;
    let fired = false;

    if (currentValue !== null && t.threshold !== undefined) {
      if (t.condition_type === 'price_above' || t.direction === 'above') {
        fired = currentValue >= t.threshold;
      } else if (t.condition_type === 'price_below' || t.direction === 'below') {
        fired = currentValue <= t.threshold;
      } else if (t.condition_type === 'price_change_percent' && price) {
        fired = Math.abs(price.changePercent24h) >= t.threshold;
      }
    }

    const confidence = fired ? 0.88 : 0.2;
    const impact = fired ? 0.75 : 0.1;
    const urgency = deriveUrgency(confidence, impact);

    if (fired) {
      dispatchFiredEvent({
        trigger_id:          t.trigger_id ?? 'unknown',
        symbol:              t.symbol?.toUpperCase() ?? '',
        condition_type:      t.condition_type ?? 'unknown',
        current_value:       currentValue,
        threshold:           t.threshold,
        urgency,
        confidence,
        market_impact_score: impact,
        recommended_action:  'score_and_route',
        fired_at:            new Date().toISOString(),
      }).catch((err: any) => { console.error('[check-triggers] dispatch error:', err.message); });
    }

    return {
      trigger_id:          t.trigger_id ?? null,
      symbol:              t.symbol?.toUpperCase() ?? null,
      fired,
      current_value:       currentValue,
      threshold:           t.threshold,
      urgency,
      confidence,
      market_impact_score: impact,
      recommended_action:  fired ? 'score_and_route' : 'recheck_later',
      execution_ready:     fired,
      next_api:            fired ? 'crypto-alerts' : 'crypto-alerts',
      next_endpoint:       fired ? '/score-trigger' : '/check-triggers',
    };
  }));

  const firedCount = results.filter(r => r.fired).length;

  res.json({
    trigger_id:          null,
    fired:               firedCount > 0,
    checked:             triggers.length,
    fired_count:         firedCount,
    results,
    urgency:             firedCount > 0 ? results.find(r => r.fired)?.urgency ?? 'low' : 'low',
    confidence:          firedCount > 0 ? 0.88 : 0.2,
    market_impact_score: firedCount > 0 ? 0.75 : 0.1,
    recommended_action:  firedCount > 0 ? 'score_and_route' : 'recheck_later',
    execution_ready:     firedCount > 0,
    next_api:            'crypto-alerts',
    next_endpoint:       firedCount > 0 ? '/score-trigger' : '/check-triggers',
    metadata: {
      latency_ms:     Date.now() - start,
      estimated_cost: 0.0015,
    },
  });
});

export default router;
