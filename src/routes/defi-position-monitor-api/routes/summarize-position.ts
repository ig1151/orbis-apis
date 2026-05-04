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
  const collateral = position?.totalCollateralUSD ?? 0;
  const debt = position?.totalDebtUSD ?? 0;
  const action = deriveAction(rl);
  const status = rl === 'critical' ? 'DANGER' : rl === 'high' ? 'WARNING' : 'STABLE';

  res.json({
    wallet:      wallet ?? null,
    position_id: position_id ?? null,
    summary: {
      collateral_usd: collateral,
      debt_usd:       debt,
      net_equity_usd: parseFloat((collateral - debt).toFixed(2)),
      health_factor:  hf,
      protocol:       'aave-v3',
      chain:          chain ?? 'ethereum',
      status,
    },
    agent_brief:        `aave-v3 on ${chain ?? 'ethereum'}: HF=${hf}, risk=${rl}, liquidation=${liqRisk}. Action: ${action}.`,
    health_score:       healthScore(hf),
    risk_score:         riskScore(hf),
    risk_level:         rl,
    liquidation_risk:   liqRisk,
    recommended_action: action,
    execution_ready:    rl === 'critical' || rl === 'high',
    next_api:           'defi-position-monitor',
    next_endpoint:      '/execution-gate',
    metadata: {
      latency_ms:     Date.now() - start,
      estimated_cost: 0.0025,
    },
  });
});

export default router;
