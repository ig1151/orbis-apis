import axios from 'axios';
import { logger } from '../logger';

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export async function tavilySearch(query: string, maxResults = 5): Promise<TavilyResult[]> {
  try {
    const res = await axios.post(
      'https://api.tavily.com/search',
      {
        query,
        max_results: maxResults,
        search_depth: 'basic',
        include_answer: false,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );
    return res.data.results || [];
  } catch (err: any) {
    logger.error({ err: err.message, query }, 'Tavily search error');
    return [];
  }
}
