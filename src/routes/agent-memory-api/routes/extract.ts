import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

router.post('/extract', async (req: Request, res: Response) => {
  const { content, type = 'facts' } = req.body;
  if (!content) return res.status(400).json({ success: false, error: 'content is required' });
  const validTypes = ['facts', 'entities', 'summary'];
  if (!validTypes.includes(type)) return res.status(400).json({ success: false, error: `type must be one of: ${validTypes.join(', ')}` });

  const start = Date.now();
  const prompts: Record<string, string> = {
    facts: `Extract key facts from the following text. Return ONLY valid JSON with key: facts (array of strings).\n\nText: ${content.slice(0, 6000)}`,
    entities: `Extract named entities. Return ONLY valid JSON with keys: people, organizations, locations, tokens, dates, other (all arrays).\n\nText: ${content.slice(0, 6000)}`,
    summary: `Summarize for an AI agent. Return ONLY valid JSON with keys: summary (string, max 3 sentences), topics (array), sentiment (positive|neutral|negative), importance_score (float 0-1).\n\nText: ${content.slice(0, 6000)}`,
  };

  try {
    const { data } = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'anthropic/claude-sonnet-4-5',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompts[type] }]
    }, { headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' } });

    let result: any = {};
    try {
      result = JSON.parse(data.choices[0].message.content.replace(/```json|```/g, '').trim());
    } catch {
      result = { raw: data.choices[0].message.content };
    }

    return res.json({
      success: true, type, result,
      metadata: { input_tokens: Math.ceil(content.length / 4), tokens_used: data.usage?.total_tokens ?? null, duration_ms: Date.now() - start },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Extraction failed', details: err.message });
  }
});

export default router;
