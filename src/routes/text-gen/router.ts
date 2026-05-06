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

async function callAnthropic(prompt: string, systemPrompt: string | undefined, maxTokens: number, temperature: number): Promise<string> {
  const messages: any[] = [{ role: 'user', content: prompt }];
  const body: any = { model: 'claude-sonnet-4-5', max_tokens: maxTokens, temperature, messages };
  if (systemPrompt) body.system = systemPrompt;
  const r = await axios.post('https://api.anthropic.com/v1/messages', body, {
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    timeout: 30000,
  });
  return r.data.content[0].text;
}

async function callOpenAI(prompt: string, systemPrompt: string | undefined, maxTokens: number, temperature: number): Promise<string> {
  const messages: any[] = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });
  const r = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-4o-mini', max_tokens: maxTokens, temperature, messages,
  }, {
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    timeout: 30000,
  });
  return r.data.choices[0].message.content;
}

router.post('/generate', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = schema.validate(req.body);
  if (error) { res.status(400).json({ error: 'Validation failed', details: error.details[0].message }); return; }
  const { prompt, provider, system_prompt, max_tokens, temperature } = value;
  let text: string;
  let usedProvider: string;
  try {
    if (provider === 'anthropic') {
      text = await callAnthropic(prompt, system_prompt, max_tokens, temperature);
      usedProvider = 'anthropic';
    } else if (provider === 'openai') {
      text = await callOpenAI(prompt, system_prompt, max_tokens, temperature);
      usedProvider = 'openai';
    } else {
      try {
        text = await callAnthropic(prompt, system_prompt, max_tokens, temperature);
        usedProvider = 'anthropic';
      } catch {
        text = await callOpenAI(prompt, system_prompt, max_tokens, temperature);
        usedProvider = 'openai_fallback';
      }
    }
    res.json({
      success: true, text, provider: usedProvider,
      metadata: { latency_ms: Date.now() - start, estimated_cost: 0.002, model: usedProvider.includes('anthropic') ? 'claude-sonnet-4-5' : 'gpt-4o-mini' },
      execution_ready: true, next_api: 'text-gen', next_endpoint: '/text-gen/generate',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Text generation failed', details: err.message, execution_ready: false });
  }
});

export default router;
