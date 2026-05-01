import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { getAllUpcomingUnlocks } from '../data/unlocks';
import { getMultipleCoins } from '../services/coingecko';
import { logger } from '../logger';

const router = Router();

const schema = Joi.object({
  from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  category: Joi.string().optional(),
  minUsd: Joi.number().min(0).default(0),
  recipient: Joi.string().optional(),
});

router.get('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const from = req.query.from ? new Date(req.query.from as string) : new Date();
  const to = req.query.to ? new Date(req.query.to as string) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const category = req.query.category as string | undefined;
  const minUsd = parseFloat(req.query.minUsd as string) || 0;
  const recipient = req.query.recipient as string | undefined;

  try {
    const days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    let upcoming = getAllUpcomingUnlocks(Math.max(days, 90));

    upcoming = upcoming.filter((u) => {
      const d = new Date(u.nextUnlock.date);
      return d >= from && d <= to;
    });

    if (category) upcoming = upcoming.filter((u) => u.category.toLowerCase() === category.toLowerCase());
    if (recipient) upcoming = upcoming.filter((u) => u.nextUnlock.recipient.toLowerCase().includes(recipient.toLowerCase()));

    const coingeckoIds = [...new Set(upcoming.map((u) => u.coingeckoId))];
    const prices = await getMultipleCoins(coingeckoIds);

    const events = upcoming.map((u) => {
      const coinData = prices.get(u.coingeckoId);
      const price = coinData?.current_price || null;
      const estimatedUsdValue = price ? Math.round(u.nextUnlock.amount * 1e6 * price) : null;
      const percentOfSupply = (u.nextUnlock.amount / u.totalSupply) * 100;
      return {
        symbol: u.symbol,
        name: u.name,
        category: u.category,
        unlockDate: u.nextUnlock.date,
        tokensUnlocked: u.nextUnlock.amount * 1e6,
        percentOfSupply: Math.round(percentOfSupply * 100) / 100,
        recipient: u.nextUnlock.recipient,
        vestingType: u.nextUnlock.vestingType,
        estimatedUsdValue,
        notes: u.nextUnlock.notes || null,
      };
    }).filter((e) => !minUsd || (e.estimatedUsdValue !== null && e.estimatedUsdValue >= minUsd));

    logger.info({ from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10), count: events.length }, 'unlocks/calendar');
    res.json({
      success: true,
      data: {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
        count: events.length,
        events,
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'unlocks/calendar error');
    res.status(500).json({ error: 'Failed to fetch unlock calendar', details: err.message });
  }
});

export default router;
