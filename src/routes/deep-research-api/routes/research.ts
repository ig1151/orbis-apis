import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { callAI } from '../services/ai';
import { logger } from '../logger';

const router = Router();

const schema = Joi.object({
  topic: Joi.string().min(3).max(300).required(),
  depth: Joi.string().valid('surface', 'standard', 'comprehensive').default('comprehensive'),
  context: Joi.string().max(500).optional(),
});

const SYSTEM_PROMPT = `You are a deep research intelligence engine specializing in financial markets, DeFi protocols, and blockchain ecosystems. Return a minified single-line JSON object with no newlines inside string values. Shape: {"summary":string,"keyFindings":string[],"riskFactors":string[],"opportunities":string[],"dataSources":string[],"confidenceScore":number,"researchDepth":string,"timestamp":string}`;

router.post('/', validate(schema, 'body'), async (req: Request, res: Response): Promise<void> => {
  const { topic, depth = 'comprehensive', context = '' } = req.body;
  try {
    const prompt = `Conduct deep research on: "${topic}". Depth: ${depth}. Context: ${context || 'none'}. Return only the JSON object.`;
    const raw = await callAI(prompt, SYSTEM_PROMPT);
    let parsed: any;
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { summary: raw.slice(0, 300), keyFindings: [], riskFactors: [], opportunities: [], dataSources: [], confidenceScore: 0.5, researchDepth: depth, timestamp: new Date().toISOString() };
    }
    logger.info({ topic, depth }, 'deep-research/generate');
    res.json({ success: true, data: parsed });
  } catch (err: any) {
    logger.error({ err: err.message, topic }, 'deep-research error');
    res.status(500).json({ error: 'Deep research failed', details: err.message });
  }
});

export default router;
