import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { tavilySearch } from '../services/tavily';
import { getCategories, getCoinsByCategory } from '../services/coingecko';
import { callAI } from '../services/ai';
import { logger } from '../logger';
import { NarrativeCompare } from '../types';

const router = Router();

const schema = Joi.object({
  narratives: Joi.string().required(), // comma-separated, e.g. "ai-tokens,rwa,depin"
  timeframe: Joi.string().valid('24h', '7d').default('7d'),
});

const NARRATIVE_TO_CATEGORY: Record<string, string> = {
  'ai-tokens': 'artificial-intelligence',
  'rwa': 'real-world-assets-rwa',
  'depin': 'depin',
  'defi': 'decentralized-finance-defi',
  'layer-2': 'layer-2',
  'memecoins': 'meme-token',
  'gaming': 'gaming',
  'liquid-staking': 'liquid-staking-tokens',
  'restaking': 'restaking',
  'btc-ecosystem': 'bitcoin-ecosystem',
  'zkvm': 'zero-knowledge-zk',
};

router.get('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const narrativeList = (req.query.narratives as string).split(',').map((n) => n.trim().toLowerCase()).slice(0, 3);
  const timeframe = req.query.timeframe as string || '7d';

  try {
    const categories = await getCategories();

    const narrativeData = await Promise.all(narrativeList.map(async (slug) => {
      const categoryId = NARRATIVE_TO_CATEGORY[slug];
      const category = categories.find((c) => c.id === categoryId);
      const topCoins = categoryId ? await getCoinsByCategory(categoryId, 3) : [];

      return {
        slug,
        marketCapChange: category?.market_cap_change_24h || 0,
        volume24h: category?.volume_24h || 0,
        topTokens: topCoins.map((c) => c.symbol),
      };
    }));

    // Search for comparison context
    const searchQuery = `crypto ${narrativeList.join(' vs ')} narrative comparison 2026`;
    const searchResults = await tavilySearch(searchQuery, 4);
    const searchContext = searchResults.map((r) => r.content).join('\n').slice(0, 2000);

    const context = narrativeData.map((n) =>
      `${n.slug}: 24h market cap change ${n.marketCapChange.toFixed(2)}%, volume $${(n.volume24h / 1e6).toFixed(0)}M, top tokens: ${n.topTokens.join(', ') || 'unknown'}`
    ).join('\n');

    const aiPrompt = `You are a crypto market analyst. Compare these narratives head-to-head over ${timeframe}:

${context}

Recent news context:
${searchContext}

Respond ONLY in this JSON format (no markdown):
{
  "narratives": [
    {
      "name": "string",
      "momentumScore": number (0-100),
      "trend": "SURGING|RISING|STABLE|DECLINING|FADING",
      "catalysts": ["string", "string"],
      "topTokens": ["SYMBOL", "SYMBOL"]
    }
  ],
  "winner": "string (name of strongest narrative)",
  "aiAnalysis": "string (3 sentences: which narrative is strongest and why, which is weakest and why, what to watch)"
}`;

    const aiResponse = await callAI(aiPrompt);

    let parsed: any;
    try {
      const cleaned = aiResponse.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { narratives: [], winner: narrativeList[0], aiAnalysis: aiResponse.slice(0, 300) };
    }

    const result: NarrativeCompare = {
      ...parsed,
      timeframe,
      analyzedAt: new Date().toISOString(),
    };

    logger.info({ narratives: narrativeList, winner: result.winner }, 'narratives/compare');
    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message }, 'narratives/compare error');
    res.status(500).json({ error: 'Failed to compare narratives', details: err.message });
  }
});

export default router;
