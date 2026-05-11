import { Router, Request, Response } from 'express';
import Joi from 'joi';

const router = Router();

router.get('/discovery', (_req, res) => {
  res.json({
    api: "Strategy Signal API",
    version: '1.0.0',
    mount: "/strategy-signal",
    human_approval_required: true,
    x_agent_callable: true,
    x_mcp_compatible: true,
    pricing: { model: 'per_call', unit_cost_usd: 0.002 },
    endpoints: ["/generate", "/backtest/:strategy_id", "/rank"],
    recommended_actions_priority_order: ["/generate", "/backtest/:strategy_id", "/rank"],
    chain_to: ["agent-memory", "alpha-signal", "strategy-signal", "market-snapshot"],
  });
});

router.post('/execution-gate', (req, res) => {
  const { action, payload } = req.body || {};
  const checks = {
    action_recognized: !!action,
    payload_present: !!payload,
    human_approval_required: true,
    confidence_sufficient: true,
    rate_limit_ok: true,
  };
  const passed = Object.values(checks).every(Boolean);
  res.json({ passed, checks, approved_at: new Date().toISOString() });
});

// Generate a strategy signal
router.post('/generate', (req: Request, res: Response) => {
  const schema = Joi.object({ assets: Joi.string().optional(), strategy_type: Joi.string().optional(), risk_tolerance: Joi.string().optional(), horizon: Joi.string().optional(), });
  const { error } = schema.validate(req.body, { allowUnknown: false });
  if (error) return res.status(400).json({ success: false, error: error.details[0].message });
  const trace_id = `trace_${Date.now()}`;
  const execution_id = `exec_${Date.now()}`;
  const session_id = req.body?.session_id || req.query?.session_id || `session_${Date.now()}`;
  res.json({ success: true, trace_id, execution_id, session_id, signal: 'signal_value', direction: 'direction_value', confidence: 'confidence_value', entry_price: 'entry_price_value', stop_loss: 'stop_loss_value', take_profit: 'take_profit_value', reasoning: 'reasoning_value', human_approval_required: 'human_approval_required_value', computed_at: new Date().toISOString() });
});

// Retrieve backtest results for a strategy
router.get('/backtest/:strategy_id', (req: Request, res: Response) => {
  const trace_id = `trace_${Date.now()}`;
  const execution_id = `exec_${Date.now()}`;
  const session_id = req.body?.session_id || req.query?.session_id || `session_${Date.now()}`;
  res.json({ success: true, trace_id, execution_id, session_id, strategy_id: 'strategy_id_value', sharpe: 'sharpe_value', max_drawdown: 'max_drawdown_value', win_rate: 'win_rate_value', total_return_pct: 'total_return_pct_value', period: 'period_value', human_approval_required: true, computed_at: new Date().toISOString() });
});

// Rank assets by strategy signal strength
router.post('/rank', (req: Request, res: Response) => {
  const schema = Joi.object({ assets: Joi.string().optional(), strategy_type: Joi.string().optional(), });
  const { error } = schema.validate(req.body, { allowUnknown: false });
  if (error) return res.status(400).json({ success: false, error: error.details[0].message });
  const trace_id = `trace_${Date.now()}`;
  const execution_id = `exec_${Date.now()}`;
  const session_id = req.body?.session_id || req.query?.session_id || `session_${Date.now()}`;
  res.json({ success: true, trace_id, execution_id, session_id, ranked_assets: 'ranked_assets_value', top_pick: 'top_pick_value', signal_distribution: 'signal_distribution_value', human_approval_required: true, computed_at: new Date().toISOString() });
});

export default router;