import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { callAI } from '../services/ai';
import { logger } from '../logger';

const router = Router();

const schema = Joi.object({
  protocol: Joi.string().required(),
  tvl: Joi.number().positive().required(),
  chain: Joi.string().required(),
  auditStatus: Joi.string().valid('audited', 'partial', 'unaudited', 'unknown').default('unknown'),
  features: Joi.array().items(Joi.string()).default([]),
});

const SYSTEM_PROMPT = `You are a DeFi risk assessment engine. Evaluate protocol security, economic risk, and systemic exposure. Return a minified single-line JSON object with no newlines inside string values. Shape: {"protocol":string,"chain":string,"overallRiskScore":number,"riskTier":"low"|"medium"|"high"|"critical","smartContractRisk":number,"economicRisk":number,"liquidityRisk":number,"governanceRisk":number,"auditCoverage":string,"knownVulnerabilities":string[],"rugPullIndicators":string[],"tvlConcentrationRisk":string,"recommendation":string,"safeAllocationPct":number}`;

router.post('/', validate(schema, 'body'), async (req: Request, res: Response): Promise<void> => {
  const { protocol, tvl, chain, auditStatus = 'unknown', features = [] } = req.body;
  try {
    const prompt = `Assess DeFi risk for protocol: "${protocol}". Chain: ${chain}. TVL: $${tvl}. Audit: ${auditStatus}. Features: ${features.join(', ') || 'standard AMM'}. Return only the JSON object.`;
    const raw = await callAI(prompt, SYSTEM_PROMPT);
    let parsed: any;
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { protocol, chain, overallRiskScore: 50, riskTier: 'medium', smartContractRisk: 50, economicRisk: 50, liquidityRisk: 50, governanceRisk: 50, auditCoverage: auditStatus, knownVulnerabilities: [], rugPullIndicators: [], tvlConcentrationRisk: 'unknown', recommendation: raw.slice(0, 200), safeAllocationPct: 5 };
    }
    logger.info({ protocol, chain, tvl }, 'defi-risk/assess');
    res.json({ success: true, data: parsed });
  } catch (err: any) {
    logger.error({ err: err.message, protocol }, 'defi-risk/assess error');
    res.status(500).json({ error: 'DeFi risk assessment failed', details: err.message });
  }
});

export default router;
