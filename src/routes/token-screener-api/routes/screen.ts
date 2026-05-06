import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { getTopTokens } from '../services/coingecko';
import { logger } from '../logger';

const router = Router();

const CHAIN_CATEGORIES: Record<string, string> = {
  solana: 'solana-ecosystem',
  bsc: 'binance-smart-chain',
  ethereum: 'ethereum-ecosystem',
  base: 'base-ecosystem',
  arbitrum: 'arbitrum-ecosystem',
  polygon: 'polygon-ecosystem',
};

const schema = Joi.object({
  filter: Joi.string().valid(
    'gainers', 'losers', 'volume_spike', 'momentum', 'near_ath',
    'deep_value', 'trending', 'all'
  ).default('trending'),
  limit: Joi.number().min(1).max(50).default(10),
  minMarketCap: Joi.number().min(0).default(0),
  maxMarketCap: Joi.number().optional(),
  minVolume: Joi.number().min(0).default(0),
  category: Joi.string().optional(),
  chain: Joi.string().valid('solana', 'bsc', 'ethereum', 'base', 'arbitrum', 'polygon').optional(),
});

router.get('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const filter = req.query.filter as string || 'trending';
  const limit = parseInt(req.query.limit as string) || 10;
  const minMarketCap = parseFloat(req.query.minMarketCap as string) || 0;
  const maxMarketCap = req.query.maxMarketCap ? parseFloat(req.query.maxMarketCap as string) : undefined;
  const minVolume = parseFloat(req.query.minVolume as string) || 0;
  const chain = req.query.chain as string | undefined;

  // chain shorthand overrides category
  const category = chain
    ? CHAIN_CATEGORIES[chain.toLowerCase()]
    : req.query.category as string | undefined;

  try {
    let tokens = await getTopTokens(250, category);

    tokens = tokens.filter(t => {
      if (t.marketCap < minMarketCap) return false;
      if (maxMarketCap && t.marketCap > maxMarketCap) return false;
      if (t.volume24h < minVolume) return false;
      return true;
    });

    switch (filter) {
      case 'gainers':
        tokens = tokens.sort((a, b) => b.change24h - a.change24h);
        break;
      case 'losers':
        tokens = tokens.sort((a, b) => a.change24h - b.change24h);
        break;
      case 'volume_spike':
        tokens = tokens
          .filter(t => t.volumeMarketCapRatio > 0.1)
          .sort((a, b) => b.volumeMarketCapRatio - a.volumeMarketCapRatio);
        break;
      case 'momentum':
        tokens = tokens.sort((a, b) => b.momentumScore - a.momentumScore);
        break;
      case 'near_ath':
        tokens = tokens
          .filter(t => t.athChangePercent !== null && t.athChangePercent > -20)
          .sort((a, b) => (b.athChangePercent || -100) - (a.athChangePercent || -100));
        break;
      case 'deep_value':
        tokens = tokens
          .filter(t => t.athChangePercent !== null && t.athChangePercent < -70)
          .sort((a, b) => (a.athChangePercent || 0) - (b.athChangePercent || 0));
        break;
      case 'trending':
        tokens = tokens
          .filter(t => t.momentumScore > 55)
          .sort((a, b) => b.momentumScore - a.momentumScore);
        break;
      default:
        tokens = tokens.sort((a, b) => b.momentumScore - a.momentumScore);
    }

    const results = tokens.slice(0, limit);

    logger.info({ filter, count: results.length, category, chain }, 'screen');
    res.json({
      success: true,
      data: {
        filter,
        chain: chain || null,
        category: category || 'all',
        count: results.length,
        tokens: results,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'screen error');
    res.status(500).json({ error: 'Failed to screen tokens', details: err.message });
  }
});


router.post('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const filter = req.body.filter || 'trending';
  const limit = parseInt(req.body.limit) || 10;
  const minMarketCap = parseFloat(req.body.minMarketCap) || 0;
  const maxMarketCap = req.body.maxMarketCap ? parseFloat(req.body.maxMarketCap) : undefined;
  const minVolume = parseFloat(req.body.minVolume) || 0;
  const chain = req.body.chain as string | undefined;
  const category = chain ? CHAIN_CATEGORIES[chain.toLowerCase()] : req.body.category as string | undefined;
  try {
    let tokens = await getTopTokens(250, category);
    tokens = tokens.filter(t => { if (t.marketCap < minMarketCap) return false; if (maxMarketCap && t.marketCap > maxMarketCap) return false; if (t.volume24h < minVolume) return false; return true; });
    switch (filter) {
      case 'gainers': tokens = tokens.sort((a, b) => b.change24h - a.change24h); break;
      case 'losers': tokens = tokens.sort((a, b) => a.change24h - b.change24h); break;
      case 'volume_spike': tokens = tokens.filter(t => t.volumeMarketCapRatio > 0.1).sort((a, b) => b.volumeMarketCapRatio - a.volumeMarketCapRatio); break;
      case 'momentum': tokens = tokens.sort((a, b) => b.momentumScore - a.momentumScore); break;
      case 'trending': tokens = tokens.filter(t => t.momentumScore > 55).sort((a, b) => b.momentumScore - a.momentumScore); break;
      default: tokens = tokens.sort((a, b) => b.momentumScore - a.momentumScore);
    }
    const results = tokens.slice(0, limit);
    res.json({ success: true, data: { filter, chain: chain || null, category: category || 'all', count: results.length, tokens: results, generatedAt: new Date().toISOString() } });
  } catch (err: any) { res.status(500).json({ error: 'Failed to screen tokens', details: err.message }); }
});

export default router;