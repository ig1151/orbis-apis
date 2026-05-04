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
  const bufferPct = parseFloat(((hf - 1.0) / hf * 100).toFixed(2));

  res.json({
    wallet:      wallet ?? null,
    position_id: position_id ?? null,
    health_score:         healthScore(hf),
    risk_score:           riskScore(hf),
    risk_level:           rl,
    liquidation_risk:     deriveLiquidationRisk(hf),
    health_factor:        hf,
    liquidation_buffer_pct: bufferPct,
    confidence:           position ? 0.95 : 0.60,
    recommended_action:   deriveAction(rl),
    execution_ready:      rl === 'critical' || rl === 'high',
    next_api:             'defi-position-monitor',
    next_endpoint:        '/detect-liquidation-risk',
    metadata: {
      latency_ms:     Date.now() - start,
      estimated_cost: 0.0025,
    },
  });
});

export default router;
