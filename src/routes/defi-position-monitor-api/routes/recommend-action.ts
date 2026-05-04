import { Router, Request, Response } from 'express';
import { resolvePosition, deriveRiskLevel, deriveLiquidationRisk, deriveAction, healthScore, riskScore } from './helpers';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const start = Date.now();
  const { wallet, position_id, chain, objective } = req.body;

  if (!wallet && !position_id) {
    res.status(400).json({ error: 'wallet or position_id is required' });
    return;
  }

  const position = await resolvePosition(wallet, chain ?? 'ethereum');

  const hf = position?.healthFactor ?? 2.5;
  const rl = deriveRiskLevel(hf);

  const actionOptions = [
    { action: 'add_collateral',  estimated_impact: '+0.3 health factor',    priority: 1 },
    { action: 'partial_repay',   estimated_impact: '+0.25 health factor',   priority: 2 },
    { action: 'hedge_with_put',  estimated_impact: 'downside protection',   priority: 3 },
    { action: 'close_position',  estimated_impact: 'full risk elimination', priority: 4 },
  ];

  res.json({
    wallet:      wallet ?? null,
    position_id: position_id ?? null,
    objective:   objective ?? 'preserve_capital',
    health_score:       healthScore(hf),
    risk_score:         riskScore(hf),
    risk_level:         rl,
    liquidation_risk:   deriveLiquidationRisk(hf),
    recommended_action: deriveAction(rl),
    action_options:     actionOptions,
    urgency:            rl === 'critical' ? 'immediate' : rl === 'high' ? 'urgent' : 'routine',
    execution_ready:    rl === 'critical' || rl === 'high',
    next_api:           'defi-position-monitor',
    next_endpoint:      '/rebalance-plan',
    metadata: {
      latency_ms:     Date.now() - start,
      estimated_cost: 0.004,
    },
  });
});

export default router;
