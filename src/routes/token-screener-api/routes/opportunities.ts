import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { getTopTokens } from '../services/coingecko';
import { callAI } from '../services/ai';
import { logger } from '../logger';
import { OpportunityResult } from '../types';

const router = Router();

const schema = Joi.object({
  limit: Joi.number().min(1).max(10).default(5),
  riskTolerance: Joi.string().valid('low', 'medium', 'high').default('medium'),
  minMarketCap: Joi.number().min(0).default(100000000), // default $100M min
});

router.get('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const limit = parseInt(req.query.limit as string) || 5;
  const riskTolerance = req.query.riskTolerance as string || 'medium';
  const minMarketCap = parseFloat(req.query.minMarketCap as string) || 100000000;

  try {
    const tokens = await getTopTokens(250);

    // Filter by market cap
    const filtered = tokens.filter(t => t.marketCap >= minMarketCap);

    // Get top momentum tokens for AI analysis
    const topMomentum = filtered
      .sort((a, b) => b.momentumScore - a.momentumScore)
      .slice(0, 20);

    const tokenSummary = topMomentum.map(t =>
      `${t.symbol}: price $${t.price}, 24h ${t.change24h > 0 ? '+' : ''}${t.change24h.toFixed(2)}%, 7d ${t.change7d !== null ? (t.change7d > 0 ? '+' : '') + t.change7d.toFixed(2) + '%' : 'N/A'}, vol/mcap ${t.volumeMarketCapRatio.toFixed(3)}, momentum ${t.momentumScore}/100, signals: ${t.signals.join(', ') || 'none'}`
    ).join('\n');

    const aiPrompt = `You are a crypto market analyst. Identify the top ${limit} opportunities from this token list for a ${riskTolerance} risk tolerance investor.

Tokens by momentum score:
${tokenSummary}

For each opportunity respond ONLY in this JSON format (no markdown):
{
  "opportunities": [
    {
      "symbol": "string",
      "opportunityType": "momentum_breakout|volume_surge|oversold_bounce|narrative_play|accumulation_zone",
      "reason": "string (1 sentence — specific reason this is an opportunity right now)",
      "riskLevel": "low|medium|high",
      "confidence": number (0-1)
    }
  ]
}

Focus on ${riskTolerance} risk opportunities. Return exactly ${limit} opportunities.`;

    const aiResponse = await callAI(aiPrompt);
    let parsed: any;
    try {
      parsed = JSON.parse(aiResponse.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { opportunities: [] };
    }

    const results: OpportunityResult[] = (parsed.opportunities || []).map((opp: any) => {
      const token = filtered.find(t => t.symbol === opp.symbol);
      return {
        symbol: opp.symbol,
        name: token?.name || opp.symbol,
        price: token?.price || 0,
        change24h: token?.change24h || 0,
        momentumScore: token?.momentumScore || 0,
        opportunityType: opp.opportunityType,
        reason: opp.reason,
        riskLevel: opp.riskLevel,
        confidence: opp.confidence,
      };
    });

    logger.info({ limit, riskTolerance, count: results.length }, 'opportunities');
    res.json({
      success: true,
      data: {
        riskTolerance,
        minMarketCapUsd: minMarketCap,
        count: results.length,
        opportunities: results,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'opportunities error');
    res.status(500).json({ error: 'Failed to find opportunities', details: err.message });
  }
});

export default router;
