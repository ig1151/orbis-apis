import { Router, Request, Response } from 'express';
import Joi from 'joi';
import axios from 'axios';
import { logger } from '../logger';

const router = Router();

const schema = Joi.object({
  text: Joi.string().min(20).max(50000).required(),
  max_keywords: Joi.number().integer().min(1).max(50).default(10),
  include_topics: Joi.boolean().default(true),
  include_entities: Joi.boolean().default(true),
});

async function callClaude(prompt: string): Promise<unknown> {
  
  const res = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    { model: 'anthropic/claude-sonnet-4-5', max_tokens: 600, messages: [{ role: 'user', content: prompt }] },
    { headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' }, timeout: 20000 }
  );
  const text = res.data.data.choices[0].message.content ?? '{}';
  try { return JSON.parse(text.replace(/```json|```/g, '').trim()); } catch { return null; }
}

router.post('/keywords', async (req: Request, res: Response) => {
  const { error, value } = schema.validate(req.body);
  if (error) { res.status(400).json({ error: 'Validation failed', details: error.details[0].message }); return; }

  const start = Date.now();
  const prompt = `Extract keywords, topics and entities from the following text.

Return ONLY valid JSON:
{
  "keywords": [{ "word": "keyword", "relevance": 0.0-1.0, "frequency": number }],
  "topics": ["topic1", "topic2"],
  "entities": { "people": [], "companies": [], "locations": [], "technologies": [] },
  "language": "detected language"
}

Rules:
- Return up to ${value.max_keywords} keywords sorted by relevance
- ${value.include_topics ? 'Include topics' : 'Skip topics, set topics to []'}
- ${value.include_entities ? 'Include entities' : 'Skip entities, set entities to {}'}

Text:
${value.text.slice(0, 8000)}`;

  try {
    const result = await callClaude(prompt) as Record<string, unknown>;
    logger.info({ keywords: (result?.keywords as unknown[])?.length }, 'Keywords extracted');
    res.json({ ...result, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Extraction failed';
    res.status(500).json({ error: 'Extraction failed', details: message });
  }
});

export default router;
