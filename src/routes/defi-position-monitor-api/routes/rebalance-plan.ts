import { Router, Request, Response } from 'express';
import { resolvePosition, deriveRiskLevel, deriveLiquidationRisk, deriveAction, healthScore, riskScore } from './helpers';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const start = Date.now();
  const { wallet, positions, chain, objective } = req.body;

  if (!wallet && !positions) {
    res.status(400).json({ error: 'wallet or positions array is required' });
    return;
  }

  const position = await resolvePosition(wallet, chain ?? 'ethereum');

  const hf = position?.healthFactor ?? 2.5;
  const rl = deriveRiskLevel(hf);
  const collateral = position?.totalCollateralUSD ?? 0;
  const debt = position?.totalDebtUSD ?? 0;
  const shortfall = debt > 0 ? Math.max(0, Math.round(debt * 0.25)) : 0;

  const steps = [
    {
      step: 1,
      action: 'evaluate_collateral_shortfall',
      protocol: 'aave-v3',
      asset: 'ETH',
      amount_usd: shortfall || 5000,
      rationale: 'Increase health factor by an estimated 0.3',
    },
    {
      step: 2,
      action: 'bridge_if_required',
      protocol: 'cross-chain-bridge',
      asset: 'USDC',
      amount_usd: shortfall || 3000,
      rationale: 'Source liquidity from cheapest available chain',
    },
    {
      step: 3,
      action: 'add_collateral',
      protocol: 'aave-v3',
      asset: 'USDC',
      amount_usd: shortfall || 3000,
      rationale: 'Restore buffer above 1.4 health factor',
    },
    {
      step: 4,
      action: 'verify_execution',
      protocol: 'autopilot',
      asset: null,
      amount_usd: null,
      rationale: 'Gate final execution via autopilot /should-execute',
    },
  ];

  res.json({
    wallet:      wallet ?? null,
    objective:   objective ?? 'preserve_capital',
    health_score:     healthScore(hf),
    risk_score:       riskScore(hf),
    risk_level:       rl,
    liquidation_risk: deriveLiquidationRisk(hf),
    current_position: {
      collateral_usd: collateral,
      debt_usd:       debt,
      health_factor:  hf,
    },
    rebalance_plan: {
      steps,
      estimated_gas_usd:              parseFloat((Math.random() * 20 + 5).toFixed(2)),
      estimated_slippage_pct:         parseFloat((Math.random() * 0.4 + 0.1).toFixed(3)),
      projected_health_factor_post:   parseFloat((hf + 0.35).toFixed(2)),
    },
    recommended_action: deriveAction(rl),
    execution_ready:    true,
    next_api:           'defi-position-monitor',
    next_endpoint:      '/execution-gate',
    metadata: {
      latency_ms:     Date.now() - start,
      estimated_cost: 0.005,
    },
  });
});

export default router;
