import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

const WATCH_TICKERS = [
  'AAPL', 'TSLA', 'NVDA', 'AMD', 'MSFT', 'AMZN', 'GOOGL',
  'META', 'SPY', 'QQQ', 'GME', 'AMC', 'PLTR', 'RIVN', 'SOFI'
];

const cache = new Map<string, { data: any; expires: number }>();

async function fetchMentions(ticker: string): Promise<number> {
  try {
    const res = await axios.post(
      'https://api.tavily.com/search',
      {
        api_key: process.env.TAVILY_API_KEY,
        query: `${ticker} stock reddit wallstreetbets mentions 2026`,
        max_results: 5,
        search_depth: 'basic',
        topic: 'finance',
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 8000 }
    );
    return (res.data.results || []).length;
  } catch {
    return 0;
  }
}

router.get('/', async (_req: Request, res: Response) => {
  const cacheKey = 'trending:all';
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return res.json(cached.data);
  }

  try {
    console.log('[social-sentiment/trending] fetching trending tickers');
    const results = await Promise.allSettled(
      WATCH_TICKERS.map(async (ticker) => ({
        ticker,
        mentions: await fetchMentions(ticker)
      }))
    );

    const trending = results
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<any>).value)
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 10);

    const response = { trending, count: trending.length, timestamp: new Date().toISOString() };
    cache.set(cacheKey, { data: response, expires: Date.now() + 600000 });
    return res.json(response);
  } catch (err: any) {
    console.error('[social-sentiment/trending] error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch trending tickers' });
  }
});

export default router;
