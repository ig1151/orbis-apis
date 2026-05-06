import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { getCoinData, resolveId, extractTokenomics } from './coingecko';
import { ruleBasedScore, aiScore } from './scorer';

export const router = Router();

async function resolveToken(token: string) {
  const id = await resolveId(token);
  return getCoinData(id);
}

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'tokenomics-api', timestamp: new Date().toISOString() });
});

router.get('/tokenomics/compare', async (req: Request, res: Response) => {
  const { error, value } = Joi.object({ tokens: Joi.string().required() }).validate(req.query);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const tokenList = value.tokens.split(',').map((t: string) => t.trim().toUpperCase()).slice(0, 5);

  try {
    const results = await Promise.allSettled(
      tokenList.map(async (token: string) => {
        const data = await resolveToken(token);
        const tokenomics = extractTokenomics(data);
        const score = ruleBasedScore(tokenomics);
        return {
          token,
          name: tokenomics.name,
          circulatingPct: tokenomics.circulatingPct,
          inflationRate: tokenomics.inflationRate,
          fdvToMcapRatio: tokenomics.fdvToMcapRatio,
          score: score.overall,
          label: score.label,
        };
      })
    );

    const tokens = results
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as any).value);

    res.json({ timestamp: new Date().toISOString(), count: tokens.length, comparison: tokens.sort((a, b) => b.score - a.score) });
  } catch (err: any) {
    console.error('[compare]', err.message);
    res.status(502).json({ error: err.message });
  }
});

router.get('/tokenomics/:token/supply', async (req: Request, res: Response) => {
  const token = req.params.token?.toUpperCase();
  if (!token) return res.status(400).json({ error: 'Token is required' });
  try {
    const data = await resolveToken(token);
    const tokenomics = extractTokenomics(data);
    res.json({
      token, name: tokenomics.name, timestamp: new Date().toISOString(),
      circulating: tokenomics.circulating, total: tokenomics.total, max: tokenomics.max,
      circulatingPct: tokenomics.circulatingPct, inflationRate: tokenomics.inflationRate,
      fdvToMcapRatio: tokenomics.fdvToMcapRatio, marketCap: tokenomics.marketCap,
      fullyDilutedValuation: tokenomics.fullyDilutedValuation,
    });
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});

router.get('/tokenomics/:token/score', async (req: Request, res: Response) => {
  const token = req.params.token?.toUpperCase();
  if (!token) return res.status(400).json({ error: 'Token is required' });
  try {
    const data = await resolveToken(token);
    const tokenomics = extractTokenomics(data);
    const ruleScore = ruleBasedScore(tokenomics);
    const score = await aiScore(token, tokenomics, ruleScore);
    res.json({ token, name: tokenomics.name, timestamp: new Date().toISOString(), score });
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});

router.get('/tokenomics/:token', async (req: Request, res: Response) => {
  const token = req.params.token?.toUpperCase();
  if (!token) return res.status(400).json({ error: 'Token is required' });
  try {
    const data = await resolveToken(token);
    const tokenomics = extractTokenomics(data);
    const ruleScore = ruleBasedScore(tokenomics);
    const score = await aiScore(token, tokenomics, ruleScore);
    res.json({
      token, name: tokenomics.name, timestamp: new Date().toISOString(),
      supply: {
        circulating: tokenomics.circulating, total: tokenomics.total, max: tokenomics.max,
        circulatingPct: tokenomics.circulatingPct, inflationRate: tokenomics.inflationRate,
      },
      market: {
        price: tokenomics.price, marketCap: tokenomics.marketCap,
        fullyDilutedValuation: tokenomics.fullyDilutedValuation, fdvToMcapRatio: tokenomics.fdvToMcapRatio,
      },
      score,
    });
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});

router.post('/tokenomics/compare', async (req, res) => {
  const tokens = req.body.tokens;
  if (!tokens) return res.status(400).json({ error: 'tokens is required' });
  const tokenList = (Array.isArray(tokens) ? tokens : tokens.split(',')).map((t: string) => t.trim().toUpperCase()).slice(0, 5);
  try {
    const results = await Promise.allSettled(tokenList.map(async (token: string) => { const data = await resolveToken(token); const tokenomics = extractTokenomics(data); const score = ruleBasedScore(tokenomics); return { token, name: tokenomics.name, circulatingPct: tokenomics.circulatingPct, inflationRate: tokenomics.inflationRate, fdvToMcapRatio: tokenomics.fdvToMcapRatio, score: score.overall, label: score.label }; }));
    const tokenResults = results.filter(r => r.status === 'fulfilled').map(r => (r as any).value);
    res.json({ timestamp: new Date().toISOString(), count: tokenResults.length, comparison: tokenResults.sort((a: any, b: any) => b.score - a.score) });
  } catch (err: any) { res.status(502).json({ error: err.message }); }
});
router.post('/tokenomics', async (req, res) => {
  const token = (req.body.token || '').toUpperCase();
  if (!token) return res.status(400).json({ error: 'token is required' });
  try {
    const data = await resolveToken(token);
    const tokenomics = extractTokenomics(data);
    const ruleScore = ruleBasedScore(tokenomics);
    const score = await aiScore(token, tokenomics, ruleScore);
    res.json({ token, name: tokenomics.name, timestamp: new Date().toISOString(), supply: { circulating: tokenomics.circulating, total: tokenomics.total, max: tokenomics.max, circulatingPct: tokenomics.circulatingPct, inflationRate: tokenomics.inflationRate }, market: { price: tokenomics.price, marketCap: tokenomics.marketCap, fullyDilutedValuation: tokenomics.fullyDilutedValuation, fdvToMcapRatio: tokenomics.fdvToMcapRatio }, score });
  } catch (err: any) { res.status(502).json({ error: err.message }); }
});
