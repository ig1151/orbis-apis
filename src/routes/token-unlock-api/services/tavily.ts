import axios from 'axios';
import { logger } from '../logger';

export async function tavilySearch(query: string, maxResults = 4): Promise<Array<{ title: string; content: string; url: string }>> {
  try {
    const res = await axios.post(
      'https://api.tavily.com/search',
      { query, max_results: maxResults, search_depth: 'basic' },
      {
        headers: { Authorization: `Bearer ${process.env.TAVILY_API_KEY}`, 'Content-Type': 'application/json' },
        timeout: 12000,
      }
    );
    return res.data.results || [];
  } catch (err: any) {
    logger.error({ err: err.message, query }, 'Tavily error');
    return [];
  }
}
