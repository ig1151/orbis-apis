import { Router, Request, Response } from 'express';
import Joi from 'joi';
import axios from 'axios';

const router = Router();

const schema = Joi.object({
  prompt: Joi.string().min(1).max(10000).required(),
  provider: Joi.string().valid('openai', 'anthropic', 'auto').default('auto'),
  system_prompt: Joi.string().max(2000).optional(),
  max_tokens: Joi.number().integer().min(1).max(4000).default(1000),
  temperature: Joi.number().min(0).max(2).default(0.7),
});

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function callOpenRouter(prompt: string, systemPrompt: string | undefined, maxTokens: number, temperature: number, model: string): Promise<string> {
  const messages: any[] = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });
  const r = await axios.post(OPENROUTER_URL, {
    model, max_tokens: maxTokens, temperature, messages,
  }, {
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    timeout: 30000,
  });
  return r.data.choices[0].message.content;
}

router.post('/generate', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = schema.validate(req.body);
  if (error) { res.status(400).json({ error: 'Validation failed', details: error.details[0].message }); return; }
  const { prompt, provider, system_prompt, max_tokens, temperature } = value;

  const modelMap: Record<string, string> = {
    openai: 'openai/gpt-4o-mini',
    anthropic: 'anthropic/claude-sonnet-4-5',
    auto: 'anthropic/claude-sonnet-4-5',
  };

  const primaryModel = modelMap[provider];
  const fallbackModel = 'openai/gpt-4o-mini';

  let text: string;
  let usedModel: string;

  try {
    try {
      text = await callOpenRouter(prompt, system_prompt, max_tokens, temperature, primaryModel);
      usedModel = primaryModel;
    } catch {
      text = await callOpenRouter(prompt, system_prompt, max_tokens, temperature, fallbackModel);
      usedModel = fallbackModel + '_fallback';
    }

    res.json({
      success: true, text, provider: usedModel,
      metadata: { latency_ms: Date.now() - start, estimated_cost: 0.002, model: usedModel },
      execution_ready: true, next_api: 'text-gen', next_endpoint: '/text-gen/generate',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Text generation failed', details: err.message, execution_ready: false });
  }
});

export default router;
