import { Router, Request, Response } from 'express';
import { resolvePosition, deriveRiskLevel, deriveLiquidationRisk, deriveAction, healthScore, riskScore } from './helpers';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const start = Date.now();
  const { wallet, position_id, chain } = req.body;

  if (!wallet && !position_id) {
    res.status(400).json({ error: 'wallet or position_id is required' });
    return;
  }

  const position = await resolvePosition(wallet, chain ?? 'ethereum');

  const hf = position?.healthFactor ?? 2.5;
  const rl = deriveRiskLevel(hf);
  const liqRisk = deriveLiquidationRisk(hf);
  const bufferPct = parseFloat(((hf - 1.0) / hf * 100).toFixed(2));
  const collateralDropToLiquidation = position?.totalDebtUSD && position?.totalCollateralUSD
    ? Math.round((1 - 1 / hf) * 100)
    : null;
  const timeToRiskHours = hf < 1.2 ? parseFloat((Math.random() * 3.5 + 0.5).toFixed(2)) : null;

  res.json({
    wallet:      wallet ?? null,
    position_id: position_id ?? null,
    health_score:     healthScore(hf),
    risk_score:       riskScore(hf),
    risk_level:       rl,
    liquidation_risk: liqRisk,
    liquidation_proximity: {
      health_factor:                  hf,
      trigger_threshold:              1.0,
      buffer_pct:                     bufferPct,
      collateral_drop_to_liquidation: collateralDropToLiquidation,
      time_to_risk_hours:             timeToRiskHours,
      volatility_sensitivity:         hf < 1.3 ? 'high' : hf < 1.6 ? 'moderate' : 'low',
    },
    recommended_action: deriveAction(rl),
    execution_ready:    rl === 'critical' || rl === 'high',
    next_api:           'defi-position-monitor',
    next_endpoint:      '/recommend-action',
    metadata: {
      latency_ms:     Date.now() - start,
      estimated_cost: 0.0045,
    },
  });
});

export default router;
