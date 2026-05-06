import { Router, Request, Response } from 'express';
import Joi from 'joi';
import axios from 'axios';
import { fetchCryptoPrices, fetchYahooPrices } from './prices';
import { pearson, correlationLabel, interpretCorrelation, detectRiskMode, detectMarketStructure, detectDivergence, calcConfidence } from './correlation';

export const router = Router();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const assetSchema = Joi.string().valid('BTC', 'ETH', 'SOL').required();

async function buildCorrelations(asset: string, days: number) {
  const [cryptoPrices, spyPrices, dxyPrices, gldPrices, usoPrices, tltPrices] = await Promise.all([
    fetchCryptoPrices(asset, days),
    fetchYahooPrices('SPY', days),
    fetchYahooPrices('DX-Y.NYB', days),
    fetchYahooPrices('GLD', days),
    fetchYahooPrices('USO', days),
    fetchYahooPrices('TLT', days),
  ]);
  return {
    scores: {
      SPY: pearson(cryptoPrices, spyPrices),
      DXY: pearson(cryptoPrices, dxyPrices),
      GLD: pearson(cryptoPrices, gldPrices),
      USO: pearson(cryptoPrices, usoPrices),
      TLT: pearson(cryptoPrices, tltPrices),
    },
    dataPoints: Math.min(cryptoPrices.length, spyPrices.length),
  };
}

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'market-correlation-api', timestamp: new Date().toISOString() });
});

router.get('/correlation/matrix', async (_req, res) => {
  try {
    const [btcPrices, ethPrices, solPrices, spyPrices, dxyPrices, gldPrices, usoPrices, tltPrices] =
      await Promise.all([
        fetchCryptoPrices('BTC', 30),
        fetchCryptoPrices('ETH', 30),
        fetchCryptoPrices('SOL', 30),
        fetchYahooPrices('SPY', 30),
        fetchYahooPrices('DX-Y.NYB', 30),
        fetchYahooPrices('GLD', 30),
        fetchYahooPrices('USO', 30),
        fetchYahooPrices('TLT', 30),
      ]);

    const assets = ['BTC', 'ETH', 'SOL', 'SPY', 'DXY', 'GLD', 'USO', 'TLT'];
    const priceMap: Record<string, number[]> = {
      BTC: btcPrices, ETH: ethPrices, SOL: solPrices,
      SPY: spyPrices, DXY: dxyPrices, GLD: gldPrices,
      USO: usoPrices, TLT: tltPrices,
    };

    const matrix: Record<string, Record<string, number>> = {};
    for (const a of assets) {
      matrix[a] = {};
      for (const b of assets) {
        matrix[a][b] = a === b ? 1 : pearson(priceMap[a], priceMap[b]);
      }
    }

    res.json({ timestamp: new Date().toISOString(), period: '30d', assets, matrix });
  } catch (err: any) {
    console.error('[matrix]', err.message);
    res.status(502).json({ error: 'Failed to compute matrix', detail: err.message });
  }
});

router.get('/correlation/:asset', async (req: Request, res: Response) => {
  const { error: assetErr, value: asset } = assetSchema.validate(req.params.asset?.toUpperCase());
  if (assetErr) return res.status(400).json({ error: 'Asset must be BTC, ETH, or SOL' });

  const { error: queryErr, value: query } = Joi.object({
    period: Joi.string().valid('7d', '30d', '90d').default('30d'),
  }).validate(req.query);
  if (queryErr) return res.status(400).json({ error: queryErr.details[0].message });

  const days = parseInt(query.period);

  try {
    const { scores, dataPoints } = await buildCorrelations(asset, days);

    const correlations: Record<string, any> = {};
    for (const [macro, score] of Object.entries(scores)) {
      correlations[macro] = {
        score,
        label: correlationLabel(score),
        interpretation: interpretCorrelation(asset, macro, score),
      };
    }

    const dominantMacroDriver = Object.entries(scores).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0][0];
    const riskMode = detectRiskMode(scores.SPY, scores.DXY);
    const marketStructure = detectMarketStructure(scores);
    const divergence = detectDivergence(scores);
    const confidence = calcConfidence(scores, dataPoints);

    res.json({
      asset,
      period: query.period,
      timestamp: new Date().toISOString(),
      correlations,
      dominantMacroDriver,
      riskMode,
      market_structure: marketStructure,
      divergence_detected: divergence.detected,
      divergence_assets: divergence.assets,
      implication: divergence.implication,
      confidence,
    });
  } catch (err: any) {
    console.error('[correlation]', err.message);
    res.status(502).json({ error: 'Failed to compute correlations', detail: err.message });
  }
});

router.get('/correlation/:asset/summary', async (req: Request, res: Response) => {
  const { error: assetErr, value: asset } = assetSchema.validate(req.params.asset?.toUpperCase());
  if (assetErr) return res.status(400).json({ error: 'Asset must be BTC, ETH, or SOL' });

  try {
    const { scores, dataPoints } = await buildCorrelations(asset, 30);
    const dominantMacroDriver = Object.entries(scores).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0][0];
    const riskMode = detectRiskMode(scores.SPY, scores.DXY);
    const marketStructure = detectMarketStructure(scores);
    const divergence = detectDivergence(scores);
    const confidence = calcConfidence(scores, dataPoints);

    let interpretation = '';
    try {
      const prompt = `You are a macro analyst. Given these 30-day correlation scores between ${asset} and macro indicators, write a 2-sentence interpretation for traders:
SPY: ${scores.SPY}, DXY: ${scores.DXY}, GLD: ${scores.GLD}, USO: ${scores.USO}, TLT: ${scores.TLT}
Dominant driver: ${dominantMacroDriver}, Risk mode: ${riskMode}, Market structure: ${marketStructure}
Divergence detected: ${divergence.detected}. Implication: ${divergence.implication}
Be concise and actionable. No preamble.`;

      const r = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        { model: 'anthropic/claude-sonnet-4-5', max_tokens: 200, messages: [{ role: 'user', content: prompt }] },
        { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` }, timeout: 15000 }
      );
      interpretation = r.data.choices[0].message.content.trim();
    } catch (aiErr: any) {
      console.error('[AI]', aiErr.message);
      interpretation = `${asset} is in ${riskMode} mode with ${marketStructure} structure. ${divergence.implication}`;
    }

    res.json({
      asset,
      period: '30d',
      timestamp: new Date().toISOString(),
      scores,
      dominantMacroDriver,
      riskMode,
      market_structure: marketStructure,
      divergence_detected: divergence.detected,
      implication: divergence.implication,
      confidence,
      interpretation,
    });
  } catch (err: any) {
    console.error('[summary]', err.message);
    res.status(502).json({ error: 'Failed to compute summary', detail: err.message });
  }
});

router.post('/correlation/matrix', async (_req, res) => {
  try {
    const [btcPrices, ethPrices, solPrices, spyPrices, dxyPrices, gldPrices, usoPrices, tltPrices] = await Promise.all([fetchCryptoPrices('BTC', 30), fetchCryptoPrices('ETH', 30), fetchCryptoPrices('SOL', 30), fetchYahooPrices('SPY', 30), fetchYahooPrices('DX-Y.NYB', 30), fetchYahooPrices('GLD', 30), fetchYahooPrices('USO', 30), fetchYahooPrices('TLT', 30)]);
    const assets = ['BTC', 'ETH', 'SOL', 'SPY', 'DXY', 'GLD', 'USO', 'TLT'];
    const priceMap: Record<string, number[]> = { BTC: btcPrices, ETH: ethPrices, SOL: solPrices, SPY: spyPrices, DXY: dxyPrices, GLD: gldPrices, USO: usoPrices, TLT: tltPrices };
    const matrix: Record<string, Record<string, number>> = {};
    for (const a of assets) { matrix[a] = {}; for (const b of assets) { matrix[a][b] = a === b ? 1 : pearson(priceMap[a], priceMap[b]); } }
    res.json({ timestamp: new Date().toISOString(), period: '30d', assets, matrix });
  } catch (err: any) { res.status(502).json({ error: 'Failed to compute matrix', detail: err.message }); }
});
router.post('/correlation', async (req, res) => {
  const asset = (req.body.asset || '').toUpperCase();
  const period = req.body.period || '30d';
  const { error: assetErr } = assetSchema.validate(asset);
  if (assetErr) return res.status(400).json({ error: 'Asset must be BTC, ETH, or SOL' });
  const days = parseInt(period);
  try {
    const { scores, dataPoints } = await buildCorrelations(asset, days);
    const correlations: Record<string, any> = {};
    for (const [macro, score] of Object.entries(scores)) { correlations[macro] = { score, label: correlationLabel(score), interpretation: interpretCorrelation(asset, macro, score) }; }
    res.json({ asset, period, timestamp: new Date().toISOString(), correlations, dominantMacroDriver: Object.entries(scores).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0][0], riskMode: detectRiskMode(scores.SPY, scores.DXY), confidence: calcConfidence(scores, dataPoints) });
  } catch (err: any) { res.status(502).json({ error: 'Failed to compute correlations', detail: err.message }); }
});
