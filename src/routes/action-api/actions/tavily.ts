import axios from 'axios';

export async function search(query: string, maxResults = 5): Promise<Array<{ title: string; url: string; content: string }>> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await axios.post(
      'https://api.tavily.com/search',
      { query, max_results: maxResults, search_depth: 'basic' },
      {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        timeout: 12000,
      }
    );
    return (res.data.results ?? []).map((r: { title: string; url: string; content?: string }) => ({
      title: r.title, url: r.url, content: r.content ?? '',
    }));
  } catch {
    return [];
  }
}
