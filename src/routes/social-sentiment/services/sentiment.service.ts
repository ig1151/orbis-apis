import axios from 'axios';

export interface SentimentResult {
  sentiment_score: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  mentions: number;
  signal: 'buy' | 'sell' | 'neutral';
  confidence: number;
  reason: string;
  top_themes: string[];
}

export async function analyzeSentiment(ticker: string, posts: { title: string; text: string }[]): Promise<SentimentResult> {
  const content = posts
    .slice(0, 30)
    .map(p => `${p.title} ${p.text}`.trim())
    .join('\n---\n')
    .slice(0, 8000);

  const prompt = [
    `You are a financial sentiment analysis engine.`,
    `Analyze the following social media posts and news headlines about "${ticker}".`,
    `Return ONLY a valid JSON object with no explanation, no markdown, no backticks:`,
    `{`,
    `  "sentiment_score": <float between -1.0 (very bearish) and 1.0 (very bullish)>,`,
    `  "trend": "<bullish|bearish|neutral>",`,
    `  "mentions": <total number of posts analyzed>,`,
    `  "signal": "<buy|sell|neutral>",`,
    `  "confidence": <float between 0.0 and 1.0>,`,
    `  "reason": "<one sentence explaining the signal>",`,
    `  "top_themes": ["<theme1>", "<theme2>", "<theme3>"]`,
    `}`,
    `Posts to analyze:`,
    content,
  ].join('\n');

  try {
    const res = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'anthropic/claude-sonnet-4-5',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        timeout: 15000,
      }
    );
    const text = res.data?.choices?.[0]?.message?.content || '{}';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return { ...parsed, mentions: posts.length };
  } catch (err: any) {
    console.error('[sentiment] AI analysis failed:', err.message);
    return {
      sentiment_score: 0,
      trend: 'neutral',
      mentions: posts.length,
      signal: 'neutral',
      confidence: 0,
      reason: 'Unable to analyze sentiment at this time.',
      top_themes: [],
    };
  }
}
