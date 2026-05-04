import { Router, Request, Response } from 'express';
import { deriveUrgency, urgencyToAction } from './helpers';

const router = Router();

function resolveRoute(urgency: string, condition_type?: string): { next_api: string; next_endpoint: string } {
  if (urgency === 'critical' || urgency === 'high') {
    return { next_api: 'crypto-alerts', next_endpoint: '/execution-gate' };
  }
  if (condition_type === 'price_change_percent' || condition_type === 'volatility') {
    return { next_api: 'alpha-signal', next_endpoint: '/score-asset' };
  }
  if (condition_type === 'whale_movement') {
    return { next_api: 'contract-analyzer', next_endpoint: '/execution-gate' };
  }
  return { next_api: 'autopilot', next_endpoint: '/should-execute' };
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const start = Date.now();
  const { trigger_id, symbol, fired, urgency: inputUrgency, confidence, market_impact_score, condition_type } = req.body;

  if (!trigger_id && !symbol) {
    res.status(400).json({ error: 'trigger_id or symbol is required' });
    return;
  }

  const conf = confidence ?? 0.5;
  const impact = market_impact_score ?? 0.5;
  const urgency = inputUrgency ?? deriveUrgency(conf, impact);
  const isFired = fired ?? false;
  const route = resolveRoute(urgency, condition_type);

  res.json({
    trigger_id:    trigger_id ?? null,
    symbol:        symbol?.toUpperCase() ?? null,
    fired:         isFired,
    urgency,
    confidence:    conf,
    market_impact_score: impact,
    routing: {
      reason:        urgency === 'critical' ? 'urgent_execution_required' : 'standard_signal_routing',
      path: [
        'crypto-alerts/route-alert',
        urgency === 'critical' ? 'crypto-alerts/execution-gate' : 'alpha-signal/score-asset',
        'autopilot/should-execute',
        'action-api/execute',
      ],
    },
    recommended_action: urgencyToAction(urgency),
    execution_ready:    urgency === 'critical' || urgency === 'high',
    next_api:           route.next_api,
    next_endpoint:      route.next_endpoint,
    metadata: {
      latency_ms:     Date.now() - start,
      estimated_cost: 0.003,
    },
  });
});

export default router;
