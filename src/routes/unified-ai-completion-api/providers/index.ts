// All providers route through OpenRouter — one HTTP client, unified schema
import axios, { AxiosError } from 'axios';
import { PRICING } from '../pricing.config';

export interface ProviderRequest {
  modelSlug:      string;
  messages:       { role: string; content: string }[];
  temperature:    number;
  max_tokens:     number;
  jsonMode:       boolean;
  tools?:         unknown[];
}

export interface ProviderResponse {
  content:        string;
  inputTokens:    number;
  outputTokens:   number;
  totalTokens:    number;
  providerModel:  string;
}

export async function callProvider(req: ProviderRequest): Promise<ProviderResponse> {
  const systemMessages = req.jsonMode
    ? [{ role: 'system', content: 'You must respond with a single raw JSON object only. No markdown. No backticks. No code fences. Start with { and end with }.' }]
    : [];

  const body: Record<string, unknown> = {
    model:       req.modelSlug,
    max_tokens:  req.max_tokens,
    temperature: req.temperature,
    messages:    [...systemMessages, ...req.messages],
  };
  if (req.tools?.length) body.tools = req.tools;

  const { backoffMs, maxProviderAttempts, fallbackOrder } = PRICING.failoverPolicy;
  let lastError: unknown;

  // Try requested model first, then fallbacks
  const modelsToTry = [req.modelSlug, ...fallbackOrder.filter(m => m !== req.modelSlug)];

  for (let attempt = 0; attempt < maxProviderAttempts; attempt++) {
    const slug = modelsToTry[attempt] ?? modelsToTry[modelsToTry.length - 1];
    try {
      const res = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        { ...body, model: slug },
        {
          headers: {
            Authorization:  `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer':  'https://orbis-apis.onrender.com',
            'X-Title':       'Orbis Unified AI API',
          },
          timeout: 30_000,
        }
      );
      const data = res.data as {
        choices: { message: { content: string } }[];
        usage?:  { prompt_tokens: number; completion_tokens: number; total_tokens: number };
        model?:  string;
      };
      return {
        content:       data.choices[0]?.message?.content ?? '',
        inputTokens:   data.usage?.prompt_tokens    ?? 0,
        outputTokens:  data.usage?.completion_tokens ?? 0,
        totalTokens:   data.usage?.total_tokens      ?? 0,
        providerModel: data.model ?? slug,
      };
    } catch (err) {
      lastError = err;
      const status = (err as AxiosError)?.response?.status;
      // Don't retry on auth or bad request errors
      if (status === 401 || status === 400) break;
      if (attempt < maxProviderAttempts - 1) {
        await new Promise(r => setTimeout(r, backoffMs[attempt] ?? 2000));
      }
    }
  }
  throw lastError;
}
