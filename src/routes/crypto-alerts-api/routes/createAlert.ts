import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { validateBody } from '../middleware/validate';
import { saveAlert } from '../store/alerts';
import { logger } from '../logger';
import { Alert, AlertType } from '../types';

const router = Router();

const SUPPORTED_SYMBOLS = ['BTC', 'ETH', 'SOL', 'BNB', 'ARB', 'OP', 'AVAX', 'MATIC', 'LINK', 'UNI', 'DOGE', 'SUI', 'APT', 'PEPE', 'WIF', 'BONK', 'USDC', 'USDT', 'WETH', 'EIGEN', 'TIA'];

const schema = Joi.object({
  type: Joi.string().valid('price_above', 'price_below', 'price_change_percent', 'whale_movement', 'funding_rate_spike').required(),
  symbol: Joi.string().uppercase().valid(...SUPPORTED_SYMBOLS).required(),
  threshold: Joi.number().required(),
  direction: Joi.string().valid('above', 'below').optional(),
  ttlHours: Joi.number().min(1).max(168).default(24), // max 7 days
});

router.post('/', validateBody(schema), async (req: Request, res: Response): Promise<void> => {
  const { type, symbol, threshold, direction, ttlHours } = req.body;

  try {
    const alertId = `alert_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

    const alert: Alert = {
      alertId,
      type: type as AlertType,
      symbol: symbol.toUpperCase(),
      condition: {
        threshold,
        direction: direction || (type === 'price_above' ? 'above' : type === 'price_below' ? 'below' : undefined),
        percentChange: type === 'price_change_percent' ? threshold : undefined,
      },
      currentValue: null,
      triggered: false,
      triggeredAt: null,
      triggeredValue: null,
      status: 'active',
      message: null,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      ttlHours,
    };

    saveAlert(alert);
    logger.info({ alertId, type, symbol, threshold }, 'alert created');
    res.status(201).json({
      success: true,
      data: alert,
      message: `Alert created. Check /v1/alerts/check?alertId=${alertId} to see if it has triggered.`,
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'create alert error');
    res.status(500).json({ error: 'Failed to create alert', details: err.message });
  }
});

export default router;
