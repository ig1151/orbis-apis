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

async function fetchCryptoPosts(symbol: string) {
  const res = await axios.post(
    'https://api.tavily.com/search',
    {
      api_key: process.env.TAVILY_API_KEY,
      query: `${symbol} cryptocurrency price sentiment community 2026`,
      max_results: 10,
      search_depth: 'basic',
      include_answer: false,
      topic: 'finance',
    },
    { headers: { 'Content-Type': 'application/json' }, timeout: 12000 }
  );
  return (res.data.results || []).map((r: any) => ({ title: r.title || '', text: r.content || '' }));
}

router.get('/:symbol', async (req: Request, res: Response) => {
  const schema = Joi.object({
    symbol: Joi.string().uppercase().valid(...SUPPORTED_SYMBOLS).required()
  });
  const { error, value } = schema.validate({ symbol: req.params.symbol.toUpperCase() });
  if (error) return res.status(400).json({ error: `Unsupported symbol. Supported: ${SUPPORTED_SYMBOLS.join(', ')}` });

  try {
    console.log(`[social-sentiment/crypto] symbol=${value.symbol}`);
    const posts = await fetchCryptoPosts(value.symbol);
    const sentiment = await analyzeSentiment(value.symbol, posts);
    return res.json({ symbol: value.symbol, ...sentiment, timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.error('[social-sentiment/crypto] error:', err.message);
    return res.status(500).json({ error: 'Failed to analyze crypto sentiment' });
  }
});

router.get('/', async (_req: Request, res: Response) => {
  return res.json({ supported_symbols: SUPPORTED_SYMBOLS, count: SUPPORTED_SYMBOLS.length });
});

export default router;
