import { Router, Request, Response } from 'express';
import { fetchPriceOrNull, deriveUrgency, urgencyToAction, newTriggerId } from './helpers';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const start = Date.now();
  const { symbols, rules, interval } = req.body;

  if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
    res.status(400).json({ error: 'symbols array is required' });
    return;
  }

  const snapshots = await Promise.all(symbols.map(async (sym: string) => {
    const price = await fetchPriceOrNull(sym);
    const volatility = price ? Math.abs(price.changePercent24h) : 0;
    const confidence = Math.min(volatility / 15, 1);
    const impact = price ? Math.min(price.volume24h / 5e9, 1) : 0.2;
    const urgency = deriveUrgency(confidence, impact);
    const fired = urgency === 'high' || urgency === 'critical';

    return {
      trigger_id:          newTriggerId(),
      symbol:              sym.toUpperCase(),
      fired,
      current_price:       price?.price ?? null,
      change_24h_pct:      price?.changePercent24h ?? null,
      volume_24h:          price?.volume24h ?? null,
      urgency,
      confidence:          parseFloat(confidence.toFixed(3)),
      market_impact_score: parseFloat(impact.toFixed(3)),
      recommended_action:  urgencyToAction(urgency),
    };
  }));

  const firedAlerts = snapshots.filter(s => s.fired);
  const topUrgency = firedAlerts.length > 0
    ? (['critical', 'high', 'medium', 'low'] as const).find(u => firedAlerts.some(a => a.urgency === u)) ?? 'low'
    : 'low';

  res.json({
    trigger_id:          null,
    fired:               firedAlerts.length > 0,
    monitoring_active:   true,
    interval_seconds:    interval ?? 60,
    symbols_monitored:   symbols.length,
    alerts_fired:        firedAlerts.length,
    snapshots,
    urgency:             topUrgency,
    confidence:          firedAlerts.length > 0 ? 0.85 : 0.2,
    market_impact_score: firedAlerts.length > 0 ? 0.75 : 0.15,
    recommended_action:  firedAlerts.length > 0 ? 'score_and_route' : 'continue_monitoring',
    execution_ready:     firedAlerts.length > 0,
    next_api:            'crypto-alerts',
    next_endpoint:       firedAlerts.length > 0 ? '/score-trigger' : '/monitor-alerts',
    metadata: {
      latency_ms:     Date.now() - start,
      estimated_cost: 0.002,
    },
  });
});

export default router;
