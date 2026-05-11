import { Router, Request, Response } from 'express';
import Joi from 'joi';

const router = Router();

router.get('/discovery', (_req, res) => {
  res.json({
    api: "Liquidation Feed API",
    version: '1.0.0',
    mount: "/liquidation-feed",
    human_approval_required: true,
    x_agent_callable: true,
    x_mcp_compatible: true,
    pricing: { model: 'per_call', unit_cost_usd: 0.002 },
    endpoints: ["/recent", "/asset/:symbol", "/alert-config"],
    recommended_actions_priority_order: ["/recent", "/asset/:symbol", "/alert-config"],
    chain_to: ["agent-memory", "market-snapshot", "onchain-signal", "tx-simulator"],
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

// Get recent liquidation events
router.get('/recent', (req: Request, res: Response) => {
  const trace_id = `trace_${Date.now()}`;
  const execution_id = `exec_${Date.now()}`;
  const session_id = req.body?.session_id || req.query?.session_id || `session_${Date.now()}`;
  res.json({ success: true, trace_id, execution_id, session_id, liquidations: 'liquidations_value', total_volume_usd: 'total_volume_usd_value', updated_at: 'updated_at_value', human_approval_required: true, computed_at: new Date().toISOString() });
});

// Liquidations for a specific asset
router.get('/asset/:symbol', (req: Request, res: Response) => {
  const trace_id = `trace_${Date.now()}`;
  const execution_id = `exec_${Date.now()}`;
  const session_id = req.body?.session_id || req.query?.session_id || `session_${Date.now()}`;
  res.json({ success: true, trace_id, execution_id, session_id, symbol: 'symbol_value', liquidations: 'liquidations_value', volume_24h_usd: 'volume_24h_usd_value', dominant_protocol: 'dominant_protocol_value', human_approval_required: true, computed_at: new Date().toISOString() });
});

// Configure liquidation alert thresholds
router.post('/alert-config', (req: Request, res: Response) => {
  const schema = Joi.object({ asset: Joi.string().optional(), threshold_usd: Joi.string().optional(), chain: Joi.string().optional(), webhook_url: Joi.string().optional(), });
  const { error } = schema.validate(req.body, { allowUnknown: false });
  if (error) return res.status(400).json({ success: false, error: error.details[0].message });
  const trace_id = `trace_${Date.now()}`;
  const execution_id = `exec_${Date.now()}`;
  const session_id = req.body?.session_id || req.query?.session_id || `session_${Date.now()}`;
  res.json({ success: true, trace_id, execution_id, session_id, alert_id: 'alert_id_value', active: 'active_value', threshold_usd: 'threshold_usd_value', human_approval_required: true, computed_at: new Date().toISOString() });
});

export default router;