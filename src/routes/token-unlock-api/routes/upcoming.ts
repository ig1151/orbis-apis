import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { getAllUpcomingUnlocks } from '../data/unlocks';
import { getMultipleCoins } from '../services/coingecko';
import { logger } from '../logger';

const router = Router();

const schema = Joi.object({
  days: Joi.number().min(1).max(90).default(30),
  minUsd: Joi.number().min(0).default(0),
  category: Joi.string().optional(),
  limit: Joi.number().min(1).max(50).default(20),
});

function getSellPressureRisk(recipient: string, percentOfSupply: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const isHighRisk = ['Team', 'Investors', 'Core Contributors', 'Early Contributors', 'Private Sales'].some(
    (r) => recipient.toLowerCase().includes(r.toLowerCase())
  );
  if (percentOfSupply >= 5 && isHighRisk) return 'CRITICAL';
  if (percentOfSupply >= 2 && isHighRisk) return 'HIGH';
  if (percentOfSupply >= 1 || isHighRisk) return 'MEDIUM';
  return 'LOW';
}

router.get('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const days = parseInt(req.query.days as string) || 30;
  const minUsd = parseFloat(req.query.minUsd as string) || 0;
  const category = req.query.category as string | undefined;
  const limit = parseInt(req.query.limit as string) || 20;

  try {
    let upcoming = getAllUpcomingUnlocks(days);
    if (category) {
      upcoming = upcoming.filter((u) => u.category.toLowerCase() === category.toLowerCase());
    }

    // Get prices for all tokens
    const coingeckoIds = [...new Set(upcoming.map((u) => u.coingeckoId))];
    const prices = await getMultipleCoins(coingeckoIds);

    const events = upcoming.map((u) => {
      const coinData = prices.get(u.coingeckoId);
      const price = coinData?.current_price || null;
      const estimatedUsdValue = price ? Math.round(u.nextUnlock.amount * 1e6 * price) : null;
      const percentOfSupply = (u.nextUnlock.amount / u.totalSupply) * 100;
      const sellPressureRisk = getSellPressureRisk(u.nextUnlock.recipient, percentOfSupply);

      return {
        id: `${u.id}-${u.nextUnlock.date}`,
        symbol: u.symbol,
        name: u.name,
        category: u.category,
        unlockDate: u.nextUnlock.date,
        tokensUnlocked: u.nextUnlock.amount * 1e6,
        percentOfSupply: Math.round(percentOfSupply * 100) / 100,
        recipient: u.nextUnlock.recipient,
        vestingType: u.nextUnlock.vestingType,
        estimatedUsdValue,
        sellPressureRisk,
        notes: u.nextUnlock.notes || null,
      };
    });

    // Filter by minUsd
    const filtered = events
      .filter((e) => !minUsd || (e.estimatedUsdValue !== null && e.estimatedUsdValue >= minUsd))
      .slice(0, limit);

    logger.info({ days, count: filtered.length }, 'unlocks/upcoming');
    res.json({
      success: true,
      data: {
        days,
        count: filtered.length,
        unlocks: filtered,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'unlocks/upcoming error');
    res.status(500).json({ error: 'Failed to fetch upcoming unlocks', details: err.message });
  }
});


router.post('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const days = parseInt(req.body.days) || 30;
  const minUsd = parseFloat(req.body.minUsd) || 0;
  const category = req.body.category as string | undefined;
  const limit = parseInt(req.body.limit) || 20;
  try {
    let upcoming = getAllUpcomingUnlocks(days);
    if (category) upcoming = upcoming.filter((u) => u.category.toLowerCase() === category.toLowerCase());
    const coingeckoIds = [...new Set(upcoming.map((u) => u.coingeckoId))];
    const prices = await getMultipleCoins(coingeckoIds);
    const events = upcoming.map((u) => {
      const coinData = prices.get(u.coingeckoId);
      const price = coinData?.current_price || null;
      const estimatedUsdValue = price ? Math.round(u.nextUnlock.amount * 1e6 * price) : null;
      const percentOfSupply = (u.nextUnlock.amount / u.totalSupply) * 100;
      return { id: u.id, symbol: u.symbol, name: u.name, category: u.category, unlockDate: u.nextUnlock.date, tokensUnlocked: u.nextUnlock.amount * 1e6, percentOfSupply: Math.round(percentOfSupply * 100) / 100, recipient: u.nextUnlock.recipient, estimatedUsdValue };
    });
    const filtered = events.filter((e) => !minUsd || (e.estimatedUsdValue !== null && e.estimatedUsdValue >= minUsd)).slice(0, limit);
    res.json({ success: true, data: { days, count: filtered.length, unlocks: filtered, generatedAt: new Date().toISOString() } });
  } catch (err: any) { res.status(500).json({ error: 'Failed to fetch upcoming unlocks', details: err.message }); }
});

export default router;
