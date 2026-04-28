import { Router, Request, Response } from 'express';
import Joi from 'joi';
import axios from 'axios';
import { logger } from '../logger';

const router = Router();

const schema = Joi.object({
  text: Joi.string().min(50).max(50000).required(),
  format: Joi.string().valid('bullets', 'paragraph', 'tldr', 'headline').default('bullets'),
  max_length: Joi.number().integer().min(50).max(500).default(150),
  language: Joi.string().max(50).optional(),
});

async function callClaude(prompt: string): Promise<string> {
  
  const res = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    { model: 'anthropic/claude-sonnet-4-5', max_tokens: 600, messages: [{ role: 'user', content: prompt }] },
    { headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' }, timeout: 20000 }
  );
  return res.data.data.choices[0].message.content ?? '';
}

router.post('/summarize', async (req: Request, res: Response) => {
  const { error, value } = schema.validate(req.body);
  if (error) { res.status(400).json({ error: 'Validation failed', details: error.details[0].message }); return; }

  const start = Date.now();
  const formatInstructions: Record<string, string> = {
    bullets: `Return a JSON object: { "summary": ["bullet point 1", "bullet point 2", "bullet point 3"], "format": "bullets" }`,
    paragraph: `Return a JSON object: { "summary": "paragraph summary", "format": "paragraph" }`,
    tldr: `Return a JSON object: { "summary": "one sentence TL;DR", "format": "tldr" }`,
    headline: `Return a JSON object: { "summary": "headline style summary under 10 words", "format": "headline" }`,
  };

  const prompt = `Summarize the following text in ${value.max_length} words or less.
${value.language ? `Respond in ${value.language}.` : ''}
${formatInstructions[value.format]}
Only return the JSON object, no markdown.

Text:
${value.text.slice(0, 8000)}`;

  try {
    const raw = await callClaude(prompt);
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    const wordCount = typeof parsed.summary === 'string' ? parsed.summary.split(' ').length : (parsed.summary as string[]).join(' ').split(' ').length;
    logger.info({ format: value.format, wordCount }, 'Text summarized');
    res.json({ ...parsed, word_count: wordCount, original_length: value.text.length, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Summarization failed';
    res.status(500).json({ error: 'Summarization failed', details: message });
  }
});

export default router;
