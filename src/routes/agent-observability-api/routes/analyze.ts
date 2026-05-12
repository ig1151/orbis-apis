import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { callAI } from '../services/ai';
import { logger } from '../logger';

const router = Router();

const schema = Joi.object({
  agentId: Joi.string().required(),
  logs: Joi.array().items(Joi.string()).default([]),
  metrics: Joi.object().default({}),
  traceWindow: Joi.string().valid('15m', '1h', '6h', '24h').default('1h'),
});

const SYSTEM_PROMPT = `You are an AI agent observability and diagnostics engine. Analyze agent behavior, detect anomalies, and surface actionable insights. Return a minified single-line JSON object with no newlines inside string values. Shape: {"agentId":string,"healthScore":number,"status":"healthy"|"degraded"|"critical","anomalies":string[],"performanceInsights":string[],"errorPatterns":string[],"recommendedActions":string[],"loopDetected":boolean,"avgResponseMs":number,"summary":string}`;

router.post('/analyze', validate(schema, 'body'), async (req: Request, res: Response): Promise<void> => {
  const { agentId, logs = [], metrics = {}, traceWindow = '1h' } = req.body;
  try {
    const prompt = `Analyze agent observability. Agent ID: "${agentId}". Trace window: ${traceWindow}. Metrics: ${JSON.stringify(metrics)}. Recent logs (last 5): ${JSON.stringify(logs.slice(-5))}. Return only the JSON object.`;
    const raw = await callAI(prompt, SYSTEM_PROMPT);
    let parsed: any;
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { agentId, healthScore: 50, status: 'degraded', anomalies: [], performanceInsights: [], errorPatterns: [], recommendedActions: [], loopDetected: false, avgResponseMs: 0, summary: raw.slice(0, 200) };
    }
    logger.info({ agentId, traceWindow }, 'agent-observability/analyze');
    res.json({ success: true, data: parsed });
  } catch (err: any) {
    logger.error({ err: err.message, agentId }, 'agent-observability error');
    res.status(500).json({ error: 'Agent observability analysis failed', details: err.message });
  }
});

export default router;
