import { Router, Request, Response } from 'express';
import { deriveUrgency, urgencyToAction } from './helpers';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const start = Date.now();
  const { trigger_id, intended_action, fired, urgency: inputUrgency, confidence, market_impact_score } = req.body;

  if (!intended_action) {
    res.status(400).json({ error: 'intended_action is required' });
    return;
  }

  const conf = confidence ?? 0.5;
  const impact = market_impact_score ?? 0.5;
  const urgency = inputUrgency ?? deriveUrgency(conf, impact);
  const isFired = fired ?? false;

  const tooLowConfidence = conf < 0.4;
  const notFired = !isFired;
  const execute = !tooLowConfidence && !notFired;
  const blockReason = notFired
    ? 'trigger_not_fired'
    : tooLowConfidence
    ? 'confidence_below_threshold'
    : null;

  res.json({
    trigger_id:    trigger_id ?? null,
    intended_action,
    fired:         isFired,
    execute,
    block_reason:  blockReason,
    urgency,
    confidence:    conf,
    market_impact_score: impact,
    autopilot_chain: {
      chained_to:        'autopilot/should-execute',
      autopilot_execute: execute,
      autopilot_reason:  execute
        ? 'trigger_fired_and_confidence_sufficient'
        : 'execution_blocked_by_alert_gate',
    },
    recommended_action: execute ? intended_action : urgencyToAction(urgency),
    execution_ready:    execute,
    next_api:      execute ? 'action-api' : 'crypto-alerts',
    next_endpoint: execute ? '/execute'   : '/score-trigger',
    metadata: {
      latency_ms:     Date.now() - start,
      estimated_cost: 0.004,
    },
  });
});

export default router;
