import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

router.post('/compress', async (req: Request, res: Response) => {
  const { agent_id, history, max_tokens = 500 } = req.body;
  if (!agent_id || !history || !Array.isArray(history)) {
    return res.status(400).json({ success: false, error: 'agent_id and history array are required' });
  }
  const start = Date.now();
  const historyText = history.map((h: any) => `[${h.created_at || h.timestamp || '?'}] (${h.role || 'agent'}) ${h.content}`).join('\n');
  const totalTokens = Math.ceil(historyText.length / 4);

  try {
    const { data } = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'anthropic/claude-sonnet-4-5',
      max_tokens,
      messages: [{ role: 'user', content: `Compress this agent memory history into a structured JSON summary. Return ONLY valid JSON with keys: summary (string), key_facts (array of strings), important_entities (array of strings), time_range (object with start and end), topics (array of strings).\n\nMemory history:\n${historyText.slice(0, 8000)}` }]
    }, { headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' } });

    let compressed: any = {};
    try {
      compressed = JSON.parse(data.choices[0].message.content.replace(/```json|```/g, '').trim());
    } catch {
      compressed = { summary: data.choices[0].message.content, key_facts: [], important_entities: [], topics: [] };
    }

    return res.json({
      success: true, agent_id, compressed,
      metadata: {
        original_entries: history.length, original_tokens: totalTokens,
        compressed_tokens: Math.ceil(JSON.stringify(compressed).length / 4),
        compression_ratio: Math.round((1 - Math.ceil(JSON.stringify(compressed).length / 4) / totalTokens) * 100) + '%',
        duration_ms: Date.now() - start, tokens_used: data.usage?.total_tokens ?? null,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Compression failed', details: err.message });
  }
});

export default router;
