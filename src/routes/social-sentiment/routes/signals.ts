import { Router, Request, Response } from 'express';
import Joi from 'joi';
import axios from 'axios';
import { analyzeSentiment } from '../services/sentiment.service';

const router = Router();

async function fetchStockPosts(ticker: string) {
  const res = await axios.post(
    'https://api.tavily.com/search',
    {
      api_key: process.env.TAVILY_API_KEY,
      query: `${ticker} stock price sentiment reddit community 2026`,
      max_results: 10,
      search_depth: 'basic',
      include_answer: false,
      topic: 'finance',
    },
    { headers: { 'Content-Type': 'application/json' }, timeout: 12000 }
  );
  return (res.data.results || []).map((r: any) => ({ title: r.title || '', text: r.content || '' }));
}

router.get('/', async (req: Request, res: Response) => {
  const schema = Joi.object({
    ticker: Joi.string().uppercase().max(10).required()
  });
  const { error, value } = schema.validate({ ticker: (req.query.ticker as string || '').toUpperCase() });
  if (error) return res.status(400).json({ error: 'ticker query parameter is required' });

  try {
    console.log(`[social-sentiment/signals] ticker=${value.ticker}`);
    const posts = await fetchStockPosts(value.ticker);
    const sentiment = await analyzeSentiment(value.ticker, posts);
    return res.json({ ticker: value.ticker, ...sentiment, timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.error('[social-sentiment/signals] error:', err.message);
    return res.status(500).json({ error: 'Failed to generate signal' });
  }
});

export default router;
