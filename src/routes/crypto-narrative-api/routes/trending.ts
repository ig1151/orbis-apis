import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { getCategories } from '../services/coingecko';
import { tavilySearch } from '../services/tavily';
import { callAI } from '../services/ai';
import { logger } from '../logger';
import { Narrative } from '../types';

const router = Router();

const schema = Joi.object({
  limit: Joi.number().min(1).max(20).default(8),
  timeframe: Joi.string().valid('24h', '7d').default('24h'),
});

// Known narrative slugs mapped to CoinGecko category IDs
const NARRATIVE_MAP: Record<string, string> = {
  'ai-tokens': 'artificial-intelligence',
  'ai-agents': 'ai-agents',
  'ai-applications': 'ai-applications',
  'rwa': 'real-world-assets-rwa',
  'defi': 'decentralized-finance-defi',
  'layer-1': 'layer-1',
  'layer-2': 'layer-2',
  'base-ecosystem': 'base-ecosystem',
  'solana-ecosystem': 'solana-ecosystem',
  'memecoins': 'meme-token',
  'gaming': 'gaming',
  'nft': 'non-fungible-tokens-nft',
  'liquid-staking': 'liquid-staking-tokens',
  'restaking': 'restaking',
  'btc-ecosystem': 'bitcoin-ecosystem',
  'zk': 'zero-knowledge-zk',
  'defai': 'defai',
  'rwa-protocol': 'rwa-protocol',
};

router.get('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const limit = parseInt(req.query.limit as string) || 8;
  const timeframe = req.query.timeframe as string || '24h';

  try {
    // Get category data from CoinGecko
    const categories = await getCategories();

    // Filter to known narratives and sort by 24h market cap change
    const narrativeCategories = categories
      .filter((c) => Object.values(NARRATIVE_MAP).includes(c.id))
      .sort((a, b) => (b.market_cap_change_24h || 0) - (a.market_cap_change_24h || 0))
      .slice(0, limit);

    // Get top category slugs for Tavily search
    const topNames = narrativeCategories.slice(0, 3).map((c) => c.name).join(', ');
    const searchResults = await tavilySearch(
      `crypto market narrative trending ${topNames} ${new Date().toISOString().slice(0, 10)}`,
      5
    );

    const searchContext = searchResults.map((r) => r.content).join('\n\n').slice(0, 2000);

    // Build category context for AI
    const categoryContext = narrativeCategories.map((c) => {
      const slug = Object.keys(NARRATIVE_MAP).find((k) => NARRATIVE_MAP[k] === c.id) || c.id;
      return `${c.name} (${slug}): market cap change ${c.market_cap_change_24h?.toFixed(2) || 0}% in 24h, volume $${(c.volume_24h / 1e6).toFixed(0)}M`;
    }).join('\n');

    const aiPrompt = `You are a crypto market analyst. Based on the data below, identify the top trending narratives in crypto right now and score their momentum.

CoinGecko Category Performance (24h):
${categoryContext}

Recent News Context:
${searchContext}

For each of the top ${Math.min(limit, narrativeCategories.length)} narratives, respond ONLY in this JSON format (no markdown):
{
  "narratives": [
    {
      "name": "string",
      "slug": "string (kebab-case)",
      "description": "string (1 sentence)",
      "momentumScore": number (0-100),
      "trend": "SURGING|RISING|STABLE|DECLINING|FADING",
      "catalysts": ["string", "string"],
      "topTokens": ["SYMBOL", "SYMBOL", "SYMBOL"],
      "searchVolumeTrend": "UP|FLAT|DOWN"
    }
  ]
}`;

    const aiResponse = await callAI(aiPrompt);

    let parsed: { narratives: Narrative[] };
    try {
      const cleaned = aiResponse.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { narratives: [] };
    }

    const narratives = parsed.narratives.map((n) => ({
      ...n,
      timeframe,
      analyzedAt: new Date().toISOString(),
    }));

    logger.info({ count: narratives.length, timeframe }, 'narratives/trending');
    res.json({
      success: true,
      data: {
        timeframe,
        count: narratives.length,
        narratives,
        analyzedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'narratives/trending error');
    res.status(500).json({ error: 'Failed to fetch trending narratives', details: err.message });
  }
});

export default router;
