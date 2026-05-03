import axios from 'axios';

const TAVILY_BASE = 'https://api.tavily.com';
const TAVILY_KEY = process.env.TAVILY_API_KEY || '';
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';

export async function getTokenNews(token: string) {
  const searchRes = await axios.post(`${TAVILY_BASE}/search`, {
    api_key: TAVILY_KEY,
    query: `${token} cryptocurrency news price analysis 2025`,
    search_depth: 'advanced',
    max_results: 8,
    include_answer: false,
  }, { timeout: 15000 });

  const results = searchRes.data.results || [];
  const articles = results.map((r: any) => ({
    title: r.title,
    url: r.url,
    content: r.content?.slice(0, 500),
    published_date: r.published_date,
  }));

  const prompt = `You are a crypto market analyst. Based on these recent news articles about ${token}, provide a sentiment analysis and market impact assessment.

Articles:
${articles.map((a: any, i: number) => `${i + 1}. ${a.title}\n${a.content}`).join('\n\n')}

Return ONLY valid JSON with this exact structure:
{
  "sentiment": "bullish|bearish|neutral",
  "sentiment_score": <-100 to 100>,
  "summary": "<3-4 sentence market summary>",
  "key_themes": ["<theme1>", "<theme2>", "<theme3>"],
  "impact": "high|medium|low",
  "timeframe": "short_term|medium_term|long_term"
}`;

  const aiRes = await axios.post(`${OPENROUTER_BASE}/chat/completions`, {
    model: 'anthropic/claude-sonnet-4-5',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  }, {
    headers: { Authorization: `Bearer ${OPENROUTER_KEY}`, 'Content-Type': 'application/json' },
    timeout: 30000,
  });

  const raw = aiRes.data.choices?.[0]?.message?.content || '{}';
  const cleaned = raw.replace(/```json|```/g, '').trim();
  let analysis = {};
  try { analysis = JSON.parse(cleaned); } catch { analysis = { error: 'Failed to parse AI response', raw }; }

  return {
    token,
    article_count: articles.length,
    articles,
    analysis,
    fetched_at: new Date().toISOString(),
  };
}
