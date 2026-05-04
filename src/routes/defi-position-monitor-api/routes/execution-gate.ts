import { Router, Request, Response } from 'express';
import { resolvePosition, deriveRiskLevel, deriveLiquidationRisk, deriveAction, healthScore, riskScore } from './helpers';

const router = Router();

const DEFENSIVE_ACTIONS = [
  'add_collateral',
  'add_collateral_or_repay_immediately',
  'add_collateral_or_partial_repay',
  'partial_repay',
  'close_position',
];

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const start = Date.now();
  const { intended_action, wallet, position_id, chain } = req.body;

  if (!intended_action) {
    res.status(400).json({ error: 'intended_action is required' });
    return;
  }

  const position = await resolvePosition(wallet, chain ?? 'ethereum');

  const hf = position?.healthFactor ?? 2.5;
  const rl = deriveRiskLevel(hf);
  const isDefensive = DEFENSIVE_ACTIONS.includes(intended_action);
  const tooRisky = hf < 1.05 && !isDefensive;
  const execute = !tooRisky;

  res.json({
    wallet:          wallet ?? null,
    position_id:     position_id ?? null,
    intended_action,
    execute,
    block_reason:    tooRisky ? 'health_factor_below_safe_threshold_and_action_is_not_defensive' : null,
    health_score:    healthScore(hf),
    risk_score:      riskScore(hf),
    risk_level:      rl,
    liquidation_risk: deriveLiquidationRisk(hf),
    recommended_action: execute ? intended_action : deriveAction(rl),
    execution_ready: execute,
    autopilot_chain: {
      chained_to:       'autopilot/should-execute',
      autopilot_execute: execute,
      autopilot_reason:  execute
        ? 'position_risk_acceptable_or_action_is_defensive'
        : 'execution_blocked_by_defi_position_gate',
    },
    next_api:      execute ? 'cross-chain-bridge' : 'defi-position-monitor',
    next_endpoint: execute ? '/execution-gate'    : '/recommend-action',
    metadata: {
      latency_ms:     Date.now() - start,
      estimated_cost: 0.0045,
    },
  });
});

export default router;
