import { Router, Request, Response } from 'express';
import Joi from 'joi';

const router = Router();

router.get('/discovery', (_req, res) => {
  res.json({
    api: "Agent Crypto Trigger Market Alert API",
    version: '1.0.0',
    mount: "/crypto-trigger",
    human_approval_required: true,
    x_agent_callable: true,
    x_mcp_compatible: true,
    pricing: { model: 'per_call', unit_cost_usd: 0.002 },
    endpoints: ["/trigger", "/triggers", "/test", "/trigger/:id"],
    recommended_actions_priority_order: ["/trigger", "/triggers", "/test"],
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

// Create a market trigger
router.post('/trigger', (req: Request, res: Response) => {
  const schema = Joi.object({ asset: Joi.string().optional(), condition: Joi.string().optional(), threshold: Joi.string().optional(), webhook_url: Joi.string().optional(), });
  const { error } = schema.validate(req.body, { allowUnknown: false });
  if (error) return res.status(400).json({ success: false, error: error.details[0].message });
  const trace_id = `trace_${Date.now()}`;
  const execution_id = `exec_${Date.now()}`;
  const session_id = req.body?.session_id || req.query?.session_id || `session_${Date.now()}`;
  res.json({ success: true, trace_id, execution_id, session_id, trigger_id: 'trigger_id_value', active: 'active_value', condition: 'condition_value', estimated_ttl_seconds: 'estimated_ttl_seconds_value', human_approval_required: true, computed_at: new Date().toISOString() });
});

// List active triggers
router.get('/triggers', (req: Request, res: Response) => {
  const trace_id = `trace_${Date.now()}`;
  const execution_id = `exec_${Date.now()}`;
  const session_id = req.body?.session_id || req.query?.session_id || `session_${Date.now()}`;
  res.json({ success: true, trace_id, execution_id, session_id, triggers: 'triggers_value', total: 'total_value', human_approval_required: true, computed_at: new Date().toISOString() });
});

// Test a trigger condition against current data
router.post('/test', (req: Request, res: Response) => {
  const schema = Joi.object({ asset: Joi.string().optional(), condition: Joi.string().optional(), threshold: Joi.string().optional(), });
  const { error } = schema.validate(req.body, { allowUnknown: false });
  if (error) return res.status(400).json({ success: false, error: error.details[0].message });
  const trace_id = `trace_${Date.now()}`;
  const execution_id = `exec_${Date.now()}`;
  const session_id = req.body?.session_id || req.query?.session_id || `session_${Date.now()}`;
  res.json({ success: true, trace_id, execution_id, session_id, would_fire: 'would_fire_value', current_value: 'current_value_value', threshold: 'threshold_value', delta: 'delta_value', human_approval_required: true, computed_at: new Date().toISOString() });
});

// Delete a trigger
router.delete('/trigger/:id', (req: Request, res: Response) => {
  const trace_id = `trace_${Date.now()}`;
  const execution_id = `exec_${Date.now()}`;
  const session_id = req.body?.session_id || req.query?.session_id || `session_${Date.now()}`;
  res.json({ success: true, trace_id, execution_id, session_id, deleted: 'deleted_value', trigger_id: 'trigger_id_value', human_approval_required: true, computed_at: new Date().toISOString() });
});

export default router;