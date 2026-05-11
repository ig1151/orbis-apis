import { v4 as uuidv4 } from 'uuid';
import { Router, Request, Response } from 'express';
import Joi from 'joi';
import axios from 'axios';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const schema = Joi.object({
    symbol: Joi.string().uppercase().required(),
    themes: Joi.array().items(Joi.string()).min(1).max(20).required(),
    posts: Joi.array().items(Joi.object({ title: Joi.string(), text: Joi.string() })).max(30).optional(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const prompt = `You are a crypto narrative analyst. Given these sentiment themes for ${value.symbol}: ${value.themes.join(', ')}.
Group them into 2-4 narrative clusters. Return ONLY valid JSON:
{
  "clusters": [
    {
      "cluster_name": "string",
      "themes": ["theme1", "theme2"],
      "sentiment": "bullish|bearish|neutral",
      "strength": "high|medium|low",
      "narrative_summary": "one sentence",
      "portfolio_impact": "positive|negative|neutral",
      "estimated_duration": "short_term|medium_term|long_term"
    }
  ],
  "dominant_narrative": "cluster_name",
  "narrative_conflict": true or false,
  "conflict_reason": "string or null"
}`;

    const res2 = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      { model: 'anthropic/claude-sonnet-4-5', max_tokens: 800, messages: [{ role: 'user', content: prompt }] },
      { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` }, timeout: 15000 }
    );
    const text = res2.data?.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());

    const trace_id = `nar_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const execution_id = `exec_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    return res.json({
      symbol: value.symbol,
      trace_id, execution_id,
      ...parsed,
      confidence: 0.78,
      recommended_actions_priority_order: ['monitor-dominant-narrative', 'check-conflict', 'execution-gate'],
      chain_to: ['/social-sentiment/crypto-sentiment/' + value.symbol, '/alpha-signal/explain'],
      privacy: { data_stored: false, retention: 'none' },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to cluster narratives' });
  }
});

export default router;
