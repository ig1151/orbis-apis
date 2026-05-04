import { Router, Request, Response } from 'express';
import { fetchPriceOrNull, deriveUrgency, urgencyToAction } from './helpers';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const start = Date.now();
  const { trigger_id, symbol, fired, urgency: inputUrgency, confidence, market_impact_score, condition_type } = req.body;

  if (!trigger_id && !symbol) {
    res.status(400).json({ error: 'trigger_id or symbol is required' });
    return;
  }

  const price = await fetchPriceOrNull(symbol);
  const conf = confidence ?? 0.5;
  const impact = market_impact_score ?? 0.5;
  const urgency = inputUrgency ?? deriveUrgency(conf, impact);
  const isFired = fired ?? false;
  const action = urgencyToAction(urgency);

  res.json({
    trigger_id:    trigger_id ?? null,
    symbol:        symbol?.toUpperCase() ?? null,
    fired:         isFired,
    urgency,
    confidence:    conf,
    market_impact_score: impact,
    summary: {
      symbol:         symbol?.toUpperCase() ?? null,
      condition_type: condition_type ?? null,
      current_price:  price?.price ?? null,
      change_24h_pct: price?.changePercent24h ?? null,
      fired:          isFired,
      urgency,
      status:         urgency === 'critical' ? 'DANGER' : urgency === 'high' ? 'WARNING' : 'STABLE',
    },
    agent_brief: symbol
      ? (symbol.toUpperCase() + ' trigger: fired=' + isFired + ', urgency=' + urgency + ', action=' + action + '.')
      : ('Trigger ' + (trigger_id ?? 'unknown') + ': fired=' + isFired + ', urgency=' + urgency + '.'),
    recommended_action: action,
    execution_ready:    urgency === 'critical' || urgency === 'high',
    next_api:           'crypto-alerts',
    next_endpoint:      '/execution-gate',
    metadata: {
      latency_ms:     Date.now() - start,
      estimated_cost: 0.0015,
    },
  });
});

export default router;
