import axios from 'axios';

const TAVILY_BASE = 'https://api.tavily.com';
const TAVILY_KEY = process.env.TAVILY_API_KEY || '';
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';

export async function research(query: string, depth: string = 'basic') {
  const searchRes = await axios.post(`${TAVILY_BASE}/search`, {
    api_key: TAVILY_KEY,
    query,
    search_depth: depth === 'deep' ? 'advanced' : 'basic',
    max_results: depth === 'deep' ? 10 : 5,
    include_answer: true,
  }, { timeout: 20000 });

  const results = searchRes.data.results || [];
  const tavilyAnswer = searchRes.data.answer || '';

  const sources = results.map((r: any) => ({
    title: r.title,
    url: r.url,
    content: r.content?.slice(0, 600),
    score: r.score,
    published_date: r.published_date,
  }));

  const prompt = `You are a research analyst. Based on the following search results, provide a comprehensive structured research report on this query: "${query}"

Tavily Answer: ${tavilyAnswer}

Sources:
${sources.map((s: any, i: number) => `${i + 1}. ${s.title}\n${s.content}`).join('\n\n')}

Return ONLY valid JSON with this exact structure:
{
  "summary": "<3-5 sentence comprehensive summary>",
  "key_findings": ["<finding1>", "<finding2>", "<finding3>"],
  "conclusion": "<1-2 sentence conclusion>",
  "confidence": "high|medium|low",
  "follow_up_questions": ["<question1>", "<question2>"]
}`;

  const aiRes = await axios.post(`${OPENROUTER_BASE}/chat/completions`, {
    model: 'anthropic/claude-sonnet-4-5',
    max_tokens: 1000,
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
    query,
    depth,
    source_count: sources.length,
    sources,
    tavily_answer: tavilyAnswer,
    research: analysis,
    fetched_at: new Date().toISOString(),
  };
}
