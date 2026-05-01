import axios from 'axios';

type Messages = string | { role: string; content: string }[];

const cache = new Map<string, { result: string; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function callAI(input: Messages, systemPrompt?: string): Promise<string> {
  const messages: { role: string; content: string }[] = typeof input === 'string'
    ? [{ role: 'user', content: input }]
    : input;

  const cacheKey = JSON.stringify({ messages, systemPrompt });
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  const body: Record<string, unknown> = { model: 'anthropic/claude-sonnet-4-5', max_tokens: 1000, messages };
  if (systemPrompt) body.system = systemPrompt;

  const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', body, {
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    timeout: 25000,
  });

  const data = res.data as { choices: { message: { content: string } }[] };
  const result = data.choices[0].message.content;

  cache.set(cacheKey, { result, timestamp: Date.now() });
  return result;
}
