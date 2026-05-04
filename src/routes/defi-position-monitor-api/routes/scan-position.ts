import { Router, Request, Response } from 'express';
import { resolvePosition, deriveRiskLevel, deriveLiquidationRisk, deriveAction, healthScore, riskScore } from './helpers';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const start = Date.now();
  const { wallet, protocol, chain } = req.body;

  if (!wallet || !protocol || !chain) {
    res.status(400).json({ error: 'wallet, protocol, and chain are required' });
    return;
  }

  const position = await resolvePosition(wallet, chain);

  const hf = position?.healthFactor ?? 2.5;
  const rl = deriveRiskLevel(hf);

  res.json({
    wallet,
    protocol,
    chain,
    position: {
      collateral_usd:        position?.totalCollateralUSD ?? 0,
      debt_usd:              position?.totalDebtUSD ?? 0,
      available_borrows_usd: position?.availableBorrowsUSD ?? 0,
      ltv:                   position?.ltv ?? 0,
      health_factor:         hf,
      liquidation_threshold: position?.currentLiquidationThreshold ?? 0,
      has_position:          position !== null,
    },
    health_score:       healthScore(hf),
    risk_score:         riskScore(hf),
    risk_level:         rl,
    liquidation_risk:   deriveLiquidationRisk(hf),
    recommended_action: deriveAction(rl),
    execution_ready:    rl === 'critical' || rl === 'high',
    next_api:           'defi-position-monitor',
    next_endpoint:      '/score-health',
    metadata: {
      latency_ms:     Date.now() - start,
      estimated_cost: 0.0035,
    },
  });
});

export default router;
