import { Router, Request, Response } from 'express';
import { tavilySearch } from '../services/tavily';
import { getCoinsByCategory } from '../services/coingecko';
import { callAI } from '../services/ai';
import { logger } from '../logger';
import { NarrativeDetail } from '../types';

const router = Router();

const NARRATIVE_TO_CATEGORY: Record<string, string> = {
  'ai-tokens': 'artificial-intelligence',
  'rwa': 'real-world-assets-rwa',
  'depin': 'depin',
  'defi': 'decentralized-finance-defi',
  'layer-2': 'layer-2',
  'base-ecosystem': 'base-ecosystem',
  'solana-ecosystem': 'solana-ecosystem',
  'memecoins': 'meme-token',
  'gaming': 'gaming',
  'nft': 'non-fungible-tokens-nft',
  'liquid-staking': 'liquid-staking-tokens',
  'restaking': 'restaking',
  'btc-ecosystem': 'bitcoin-ecosystem',
  'zkvm': 'zero-knowledge-zk',
};

// GET /v1/narrative/:name
router.get('/:name', async (req: Request, res: Response): Promise<void> => {
  const { name } = req.params;
  const slug = name.toLowerCase();

  try {
    // Search for recent news on this narrative
    const [searchResults, searchResults2] = await Promise.all([
      tavilySearch(`crypto ${slug.replace(/-/g, ' ')} narrative 2026 market`, 5),
      tavilySearch(`${slug.replace(/-/g, ' ')} tokens price catalyst`, 3),
    ]);

    const allResults = [...searchResults, ...searchResults2];
    const searchContext = allResults.map((r) => `${r.title}: ${r.content}`).join('\n\n').slice(0, 3000);
    const sources = allResults.map((r) => r.url).slice(0, 5);

    // Get top tokens in this category
    const categoryId = NARRATIVE_TO_CATEGORY[slug];
    const topCoins = categoryId ? await getCoinsByCategory(categoryId, 5) : [];
    const topTokens = topCoins.map((c) => c.symbol);

    const aiPrompt = `You are a crypto market analyst. Provide a deep-dive analysis of the "${slug.replace(/-/g, ' ')}" narrative in crypto.

Recent news and context:
${searchContext}

Top tokens in this category: ${topTokens.join(', ') || 'unknown'}

Respond ONLY in this JSON format (no markdown):
{
  "name": "string (proper name)",
  "description": "string (2 sentences)",
  "momentumScore": number (0-100),
  "trend": "SURGING|RISING|STABLE|DECLINING|FADING",
  "catalysts": ["string", "string", "string"],
  "topTokens": ["SYMBOL", "SYMBOL", "SYMBOL"],
  "searchVolumeTrend": "UP|FLAT|DOWN",
  "summary": "string (3 sentences — current state of narrative)",
  "bullCase": "string (2 sentences)",
  "bearCase": "string (2 sentences)",
  "keyRisks": ["string", "string"],
  "relatedNarratives": ["string", "string"]
}`;

    const aiResponse = await callAI(aiPrompt);

    let parsed: any;
    try {
      const cleaned = aiResponse.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        name: slug,
        description: 'Unable to parse narrative data',
        momentumScore: 0,
        trend: 'STABLE',
        catalysts: [],
        topTokens,
        searchVolumeTrend: 'FLAT',
        summary: aiResponse.slice(0, 300),
        bullCase: '',
        bearCase: '',
        keyRisks: [],
        relatedNarratives: [],
      };
    }

    const result: NarrativeDetail = {
      ...parsed,
      slug,
      timeframe: '7d',
      sources,
      analyzedAt: new Date().toISOString(),
    };

    logger.info({ slug, momentumScore: result.momentumScore, trend: result.trend }, 'narrative detail');
    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message, slug }, 'narrative detail error');
    res.status(500).json({ error: 'Failed to analyze narrative', details: err.message });
  }
});

export default router;
