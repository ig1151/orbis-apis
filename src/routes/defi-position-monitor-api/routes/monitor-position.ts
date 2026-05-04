import { Router, Request, Response } from 'express';
import { resolvePosition, deriveRiskLevel, deriveLiquidationRisk, deriveAction, healthScore, riskScore } from './helpers';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const start = Date.now();
  const { wallet, chain, interval, thresholds } = req.body;

  if (!wallet) {
    res.status(400).json({ error: 'wallet is required' });
    return;
  }

  const position = await resolvePosition(wallet, chain ?? 'ethereum');
  const hf = position?.healthFactor ?? 2.5;
  const rl = deriveRiskLevel(hf);
  const triggered = rl === 'high' || rl === 'critical';
  const defaultThresholds = { health_factor_min: 1.3, ltv_max: 0.75 };
  const activeThresholds = thresholds ?? defaultThresholds;

  const alerts = triggered ? [
    {
      type:         'health_factor_alert',
      severity:     rl,
      message:      'Health factor ' + hf + ' is below safe threshold of ' + activeThresholds.health_factor_min,
      triggered_at: new Date().toISOString(),
    },
  ] : [];

  res.json({
    wallet,
    monitoring_active:  true,
    interval_seconds:   interval ?? 60,
    thresholds:         activeThresholds,
    current_snapshot: {
      health_factor:    hf,
      collateral_usd:   position?.totalCollateralUSD ?? 0,
      debt_usd:         position?.totalDebtUSD ?? 0,
      risk_level:       rl,
      liquidation_risk: deriveLiquidationRisk(hf),
    },
    alerts,
    trigger_fired:      triggered,
    health_score:       healthScore(hf),
    risk_score:         riskScore(hf),
    risk_level:         rl,
    liquidation_risk:   deriveLiquidationRisk(hf),
    recommended_action: triggered ? deriveAction(rl) : 'hold_and_monitor',
    execution_ready:    triggered,
    next_api:           'defi-position-monitor',
    next_endpoint:      triggered ? '/recommend-action' : '/monitor-position',
    metadata: {
      latency_ms:     Date.now() - start,
      estimated_cost: 0.002,
    },
  });
});

export default router;
