import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { fetchSpot } from './sources/spot';
import { fetchFunding } from './sources/funding';
import { fetchLiquidations } from './sources/liquidations';
import { fetchOptions } from './sources/options';
import { buildIntelligence } from './intelligence';

export const router = Router();

const assetSchema = Joi.object({
  asset: Joi.string().valid('BTC', 'ETH').required(),
});

function validateAsset(req: Request, res: Response): string | null {
  const { error, value } = assetSchema.validate({ asset: req.params.asset?.toUpperCase() });
  if (error) {
    res.status(400).json({ error: error.details[0].message });
    return null;
  }
  return value.asset;
}

async function gatherData(asset: string) {
  const [spot, funding, liquidations, options] = await Promise.allSettled([
    fetchSpot(asset),
    fetchFunding(asset),
    fetchLiquidations(),
    fetchOptions(asset),
  ]);
  return {
    spotData:     spot.status === 'fulfilled'         ? spot.value         : null,
    fundingData:  funding.status === 'fulfilled'      ? funding.value      : null,
    liqData:      liquidations.status === 'fulfilled' ? liquidations.value : null,
    optionsData:  options.status === 'fulfilled'      ? options.value      : null,
  };
}

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'derivatives-intelligence-api', timestamp: new Date().toISOString() });
});

router.get('/intelligence/:asset', async (req: Request, res: Response) => {
  const asset = validateAsset(req, res);
  if (!asset) return;
  try {
    const { spotData, fundingData, liqData, optionsData } = await gatherData(asset);
    const intelligence = buildIntelligence(asset, spotData, fundingData, liqData, optionsData);
    res.json({
      asset,
      timestamp: new Date().toISOString(),
      spot: spotData,
      funding: fundingData,
      liquidations: liqData,
      options: optionsData,
      intelligence,
    });
  } catch (err: any) {
    console.error('[intelligence]', err.message);
    res.status(502).json({ error: 'Failed to build intelligence report', detail: err.message });
  }
});

router.get('/intelligence/:asset/signal', async (req: Request, res: Response) => {
  const asset = validateAsset(req, res);
  if (!asset) return;
  try {
    const { spotData, fundingData, liqData, optionsData } = await gatherData(asset);
    const intelligence = buildIntelligence(asset, spotData, fundingData, liqData, optionsData);
    res.json({ asset, timestamp: new Date().toISOString(), ...intelligence });
  } catch (err: any) {
    console.error('[signal]', err.message);
    res.status(502).json({ error: 'Failed to build signal', detail: err.message });
  }
});
