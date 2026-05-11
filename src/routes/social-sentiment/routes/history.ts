import { Router, Request, Response } from 'express';
import Joi from 'joi';
import axios from 'axios';
import { analyzeSentiment } from '../services/sentiment.service';

const router = Router();

const SUPPORTED_SYMBOLS = [
  'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX',
  'LINK', 'DOT', 'MATIC', 'UNI', 'ARB', 'OP', 'SUI', 'APT',
  'PEPE', 'WIF', 'BONK', 'INJ', 'TIA', 'ATOM', 'NEAR', 'FET'
];

const WINDOWS = ['1d', '3d', '7d'];

async function fetchPostsForWindow(symbol: string, window: string) {
  const days = window === '1d' ? 1 : window === '3d' ? 3 : 7;
  const res = await axios.post(
    'https://api.tavily.com/search',
    {
      api_key: process.env.TAVILY_API_KEY,
      query: `${symbol} cryptocurrency sentiment community last ${days} days 2026`,
      max_results: 8,
      search_depth: 'basic',
      topic: 'finance',
    },
    { headers: { 'Content-Type': 'application/json' }, timeout: 12000 }
  );
  return (res.data.results || []).map((r: any) => ({ title: r.title || '', text: r.content || '' }));
}

router.get('/:symbol', async (req: Request, res: Response) => {
  const schema = Joi.object({
    symbol: Joi.string().uppercase().valid(...SUPPORTED_SYMBOLS).required(),
    window: Joi.string().valid(...WINDOWS).default('7d'),
  });
  const { error, value } = schema.validate({
    symbol: req.params.symbol.toUpperCase(),
    window: req.query.window || '7d',
  });
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const windows = value.window === '7d' ? ['1d', '3d', '7d'] : value.window === '3d' ? ['1d', '3d'] : ['1d'];
    const results = await Promise.allSettled(
      windows.map(async (w) => {
        const posts = await fetchPostsForWindow(value.symbol, w);
        const sentiment = await analyzeSentiment(value.symbol, posts);
        return { window: w, ...sentiment };
      })
    );

    const trend_windows = results
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<any>).value);

    const latest = trend_windows[trend_windows.length - 1];
    const earliest = trend_windows[0];
    const momentum = latest && earliest
      ? latest.sentiment_score - earliest.sentiment_score
      : 0;

    return res.json({
      symbol: value.symbol,
      window: value.window,
      trend_windows,
      momentum: parseFloat(momentum.toFixed(3)),
      momentum_direction: momentum > 0.1 ? 'improving' : momentum < -0.1 ? 'deteriorating' : 'stable',
      current_score: latest?.sentiment_score ?? 0,
      current_trend: latest?.trend ?? 'neutral',
      confidence: latest?.confidence ?? 0,
      recommended_actions_priority_order: ['check-signals', 'execution-gate', 'alpha-signal'],
      chain_to: ['/social-sentiment/crypto-sentiment/' + value.symbol, '/alpha-signal/scan-signals'],
      privacy: { data_stored: false, retention: 'none' },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch sentiment history' });
  }
});

export default router;
