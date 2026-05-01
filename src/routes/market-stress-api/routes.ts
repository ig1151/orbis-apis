import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { computeMarketStress, SignalResult } from './signals';

export const router = Router();
const SUPPORTED_ASSETS = ['BTC', 'ETH', 'SOL', 'BNB', 'ARB', 'MATIC', 'AVAX', 'OP', 'LINK', 'AAVE'];

router.get('/v1/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', api: 'market-stress-api', version: '1.0.0', timestamp: new Date().toISOString() });
});

router.get('/v1/stress/scan/top', async (req: Request, res: Response) => {
  const schema = Joi.object({ limit: Joi.number().integer().min(1).max(10).default(5), min_stress: Joi.number().min(0).max(10).default(0) });
  const { error, value } = schema.validate(req.query);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const results: SignalResult[] = await Promise.all(SUPPORTED_ASSETS.map(computeMarketStress));
    const filtered = results.filter(r => r.stress_score >= value.min_stress).sort((a, b) => b.stress_score - a.stress_score).slice(0, value.limit);
    const avgStress = parseFloat((results.reduce((s, r) => s + r.stress_score, 0) / results.length).toFixed(1));
    res.json({ success: true, summary: { total_assets_scanned: SUPPORTED_ASSETS.length, avg_stress_score: avgStress, market_mood: avgStress >= 7 ? 'danger' : avgStress >= 5 ? 'elevated' : avgStress >= 3 ? 'cautious' : 'calm', cascade_risk_count: results.filter(r => r.combined_signal === 'cascade_risk').length }, top_stress_assets: filtered });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to run stress scan' });
  }
});

router.get('/v1/stress', async (req: Request, res: Response) => {
  const schema = Joi.object({ assets: Joi.string().max(100).default('BTC,ETH,SOL,BNB') });
  const { error, value } = schema.validate(req.query);
  if (error) return res.status(400).json({ error: error.details[0].message });
  const assets = value.assets.split(',').map((a: string) => a.trim().toUpperCase()).slice(0, 10);
  try {
    const results: SignalResult[] = await Promise.all(assets.map(computeMarketStress));
    results.sort((a, b) => b.stress_score - a.stress_score);
    const avgStress = parseFloat((results.reduce((s, r) => s + r.stress_score, 0) / results.length).toFixed(1));
    res.json({ success: true, summary: { assets_scanned: results.length, avg_stress_score: avgStress, highest_stress_asset: results[0].asset, highest_stress_score: results[0].stress_score, cascade_risk_assets: results.filter(r => r.combined_signal === 'cascade_risk' || r.combined_signal === 'overleveraged_market').length, market_mood: avgStress >= 7 ? 'danger' : avgStress >= 5 ? 'elevated' : avgStress >= 3 ? 'cautious' : 'calm' }, assets: results });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to compute stress signals' });
  }
});

router.get('/v1/stress/:asset', async (req: Request, res: Response) => {
  const asset = req.params.asset.toUpperCase();
  if (asset.length > 10) return res.status(400).json({ error: 'Invalid asset symbol' });
  try {
    const result = await computeMarketStress(asset);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to compute stress signal' });
  }
});

router.get('/docs', (_req: Request, res: Response) => {
  res.send('<html><body><h1>Market Stress API</h1><p>$0.012/call</p><p>GET /v1/stress/:asset — single asset</p><p>GET /v1/stress?assets=BTC,ETH — multi-asset</p><p>GET /v1/stress/scan/top — top stressed assets</p></body></html>');
});

router.get('/openapi.json', (_req: Request, res: Response) => {
  res.json({ openapi: '3.0.0', info: { title: 'Market Stress API', version: '1.0.0', description: '$0.012/call' }, servers: [{ url: 'https://market-stress-api.onrender.com' }] });
});
