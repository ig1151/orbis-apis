import axios from 'axios';

export async function callClaude(prompt: string, maxTokens = 1500): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

  const res = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: 'anthropic/claude-sonnet-4-5',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      timeout: 30000,
    }
  );
  return res.data.choices[0]?.message?.content ?? '';
}

export async function callClaudeJSON(prompt: string, maxTokens = 1500): Promise<unknown> {
  const text = await callClaude(prompt + '\n\nReturn only valid JSON, no markdown.', maxTokens);
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    return null;
  }
}
