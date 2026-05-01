import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { fetchOptionsData } from './deribit';
import { calcPutCallRatio, calcMaxPain, aggregateOI } from './analytics';

export const router = Router();

// ── validation ─────────────────────────────────────────────────────────────
const currencySchema = Joi.object({
  currency: Joi.string().valid('BTC', 'ETH').required(),
});

function validateCurrency(req: Request, res: Response): string | null {
  const { error, value } = currencySchema.validate({ currency: req.params.currency?.toUpperCase() });
  if (error) {
    res.status(400).json({ error: error.details[0].message });
    return null;
  }
  return value.currency;
}

// ── health ─────────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'derivatives-api', timestamp: new Date().toISOString() });
});

// ── summary ────────────────────────────────────────────────────────────────
router.get('/options/summary/:currency', async (req: Request, res: Response) => {
  const currency = validateCurrency(req, res);
  if (!currency) return;
  try {
    const instruments = await fetchOptionsData(currency);
    const pcr = calcPutCallRatio(instruments);
    const maxPain = calcMaxPain(instruments);
    const oi = aggregateOI(instruments);

    const expiries = Object.keys(maxPain);
    res.json({
      currency,
      timestamp: new Date().toISOString(),
      summary: {
        totalCallOI: oi.totalCallOI,
        totalPutOI: oi.totalPutOI,
        putCallRatioOI: pcr.byOI,
        putCallRatioVolume: pcr.byVolume,
        nearestExpiry: expiries[0] || null,
        maxPainByExpiry: maxPain,
      },
    });
  } catch (err: any) {
    console.error('[summary]', err.message);
    res.status(502).json({ error: 'Failed to fetch options data', detail: err.message });
  }
});

// ── open interest ──────────────────────────────────────────────────────────
router.get('/options/open-interest/:currency', async (req: Request, res: Response) => {
  const currency = validateCurrency(req, res);
  if (!currency) return;
  try {
    const instruments = await fetchOptionsData(currency);
    const oi = aggregateOI(instruments);
    res.json({ currency, timestamp: new Date().toISOString(), ...oi });
  } catch (err: any) {
    console.error('[open-interest]', err.message);
    res.status(502).json({ error: 'Failed to fetch open interest', detail: err.message });
  }
});

// ── put/call ratio ─────────────────────────────────────────────────────────
router.get('/options/put-call-ratio/:currency', async (req: Request, res: Response) => {
  const currency = validateCurrency(req, res);
  if (!currency) return;
  try {
    const instruments = await fetchOptionsData(currency);
    const pcr = calcPutCallRatio(instruments);
    res.json({
      currency,
      timestamp: new Date().toISOString(),
      putCallRatio: {
        byOpenInterest: pcr.byOI,
        byVolume: pcr.byVolume,
        interpretation: pcr.byOI > 1 ? 'bearish' : pcr.byOI > 0.7 ? 'neutral' : 'bullish',
      },
    });
  } catch (err: any) {
    console.error('[put-call-ratio]', err.message);
    res.status(502).json({ error: 'Failed to fetch put/call ratio', detail: err.message });
  }
});

// ── max pain ───────────────────────────────────────────────────────────────
router.get('/options/max-pain/:currency', async (req: Request, res: Response) => {
  const currency = validateCurrency(req, res);
  if (!currency) return;
  try {
    const instruments = await fetchOptionsData(currency);
    const maxPainMap = calcMaxPain(instruments);
    const expiries = Object.entries(maxPainMap).map(([expiry, data]) => ({
      expiry,
      maxPain: (data as any).maxPain,
      totalNotionalUSD: (data as any).totalNotional,
    }));
    res.json({ currency, timestamp: new Date().toISOString(), expiries });
  } catch (err: any) {
    console.error('[max-pain]', err.message);
    res.status(502).json({ error: 'Failed to compute max pain', detail: err.message });
  }
});
