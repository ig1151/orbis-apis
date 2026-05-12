import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { callAI } from '../services/ai';
import { logger } from '../logger';

const router = Router();

const contractSchema = Joi.object({
  name: Joi.string().required(),
  address: Joi.string().optional(),
  chain: Joi.string().optional(),
  auditStatus: Joi.string().optional(),
  features: Joi.array().items(Joi.string()).optional(),
});

const schema = Joi.object({
  contractA: contractSchema.required(),
  contractB: contractSchema.required(),
  comparisonDimensions: Joi.array().items(Joi.string()).default([]),
});

const SYSTEM_PROMPT = `You are a smart contract comparative risk engine. Compare two contracts across security, efficiency, and risk dimensions. Return a minified single-line JSON object with no newlines inside string values. Shape: {"winner":string,"contractA":{"name":string,"riskScore":number,"gasEfficiency":number,"securityScore":number,"upgradeability":string,"centralizedControls":boolean},"contractB":{"name":string,"riskScore":number,"gasEfficiency":number,"securityScore":number,"upgradeability":string,"centralizedControls":boolean},"keyDifferences":string[],"sharedVulnerabilities":string[],"recommendation":string,"confidenceLevel":number}`;

router.post('/', validate(schema, 'body'), async (req: Request, res: Response): Promise<void> => {
  const { contractA, contractB, comparisonDimensions = [] } = req.body;
  try {
    const prompt = `Compare smart contract risk. Contract A: ${JSON.stringify(contractA)} vs Contract B: ${JSON.stringify(contractB)}. Focus: ${comparisonDimensions.join(', ') || 'all dimensions'}. Return only the JSON object.`;
    const raw = await callAI(prompt, SYSTEM_PROMPT);
    let parsed: any;
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { winner: 'unknown', contractA: { name: contractA.name, riskScore: 50, gasEfficiency: 50, securityScore: 50, upgradeability: 'unknown', centralizedControls: false }, contractB: { name: contractB.name, riskScore: 50, gasEfficiency: 50, securityScore: 50, upgradeability: 'unknown', centralizedControls: false }, keyDifferences: [], sharedVulnerabilities: [], recommendation: raw.slice(0, 200), confidenceLevel: 0.5 };
    }
    logger.info({ contractA: contractA.name, contractB: contractB.name }, 'smart-contract-risk/compare');
    res.json({ success: true, data: parsed });
  } catch (err: any) {
    logger.error({ err: err.message }, 'smart-contract-risk/compare error');
    res.status(500).json({ error: 'Smart contract comparison failed', details: err.message });
  }
});

export default router;
