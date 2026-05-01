import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { tavilySearch } from '../services/tavily';
import { callAI } from '../services/ai';
import { logger } from '../logger';
import { TokenNarratives } from '../types';

const router = Router();

const schema = Joi.object({
  token: Joi.string().required(),
});

router.get('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const token = (req.query.token as string).toUpperCase();

  try {
    const [searchResults1, searchResults2] = await Promise.all([
      tavilySearch(`${token} crypto token narrative sector category 2026`, 4),
      tavilySearch(`${token} use case defi ai rwa depin layer2`, 3),
    ]);

    const allResults = [...searchResults1, ...searchResults2];
    const searchContext = allResults.map((r) => `${r.title}: ${r.content}`).join('\n\n').slice(0, 3000);

    const aiPrompt = `You are a crypto market analyst. Identify which market narratives the token "${token}" belongs to.

Known narratives: AI Tokens, RWA (Real World Assets), DePIN, DeFi, Layer 2, Memecoins, Gaming, NFT, Liquid Staking, Restaking, BTC Ecosystem, ZK/zkVM, Solana Ecosystem, Base Ecosystem

Research context:
${searchContext}

Respond ONLY in this JSON format (no markdown):
{
  "token": "${token}",
  "narratives": [
    {
      "name": "string",
      "fit": "STRONG|MODERATE|WEAK",
      "reason": "string (1 sentence)"
    }
  ],
  "primaryNarrative": "string (the single strongest narrative fit)",
  "aiSummary": "string (2 sentences: what this token is and which narratives it plays into)"
}`;

    const aiResponse = await callAI(aiPrompt);

    let parsed: any;
    try {
      const cleaned = aiResponse.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        token,
        narratives: [],
        primaryNarrative: null,
        aiSummary: aiResponse.slice(0, 300),
      };
    }

    const result: TokenNarratives = {
      ...parsed,
      analyzedAt: new Date().toISOString(),
    };

    logger.info({ token, primaryNarrative: result.primaryNarrative }, 'narratives/scan');
    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message, token }, 'narratives/scan error');
    res.status(500).json({ error: 'Failed to scan token narratives', details: err.message });
  }
});

export default router;
