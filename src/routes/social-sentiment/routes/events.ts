import { Router, Request, Response } from 'express';
import Joi from 'joi';
import axios from 'axios';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const schema = Joi.object({
    symbol: Joi.string().uppercase().required(),
    content: Joi.string().min(10).max(10000).optional(),
    posts: Joi.array().items(Joi.object({ title: Joi.string(), text: Joi.string() })).max(30).optional(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  if (!value.content && !value.posts) return res.status(400).json({ error: 'content or posts is required' });

  const text = value.content || (value.posts || []).map((p: any) => `${p.title} ${p.text}`).join('\n');

  try {
    const prompt = `You are a crypto market event detector. Extract market-moving events from this content about ${value.symbol}.
Return ONLY valid JSON:
{
  "events": [
    {
      "event_type": "regulatory|partnership|hack|listing|whale_move|macro|technical|sentiment_shift",
      "title": "short event title",
      "description": "one sentence",
      "impact": "high|medium|low",
      "direction": "bullish|bearish|neutral",
      "confidence": 0.0-1.0,
      "time_sensitivity": "immediate|24h|week",
      "portfolio_impact_estimate": "string e.g. +5-10% price impact"
    }
  ],
  "event_count": number,
  "highest_impact_event": "title or null",
  "overall_event_sentiment": "bullish|bearish|neutral"
}

Content: ${text.slice(0, 6000)}`;

    const res2 = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      { model: 'anthropic/claude-sonnet-4-5', max_tokens: 800, messages: [{ role: 'user', content: prompt }] },
      { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` }, timeout: 15000 }
    );
    const raw = res2.data?.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());

    return res.json({
      symbol: value.symbol,
      ...parsed,
      recommended_actions_priority_order: ['review-high-impact-events', 'execution-gate', 'alpha-signal'],
      chain_to: ['/social-sentiment/execution-gate', '/alpha-signal/detect-event'],
      privacy: { data_stored: false, retention: 'none' },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to extract events' });
  }
});

export default router;
