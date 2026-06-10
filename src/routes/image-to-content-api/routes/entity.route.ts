import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
export const entityRouter = Router();
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4-6';

entityRouter.post('/', async (req: Request, res: Response) => {
  const { entities, context, domain } = req.body;
  if (!entities || !Array.isArray(entities) || entities.length === 0) {
    res.status(400).json({ error: 'entities array is required' }); return;
  }
  const trace_id = `ent_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
  const t0 = Date.now();
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'OPENROUTER_API_KEY not set' }); return; }

  const prompt = `You are an entity linking system. Link these entities to known concepts.
Entities: ${JSON.stringify(entities)}
Domain: ${domain || 'general'}
Context: ${context || 'none'}

Return ONLY valid JSON:
{
  "linked_entities": [
    {
      "entity": "original entity string",
      "type": "person|org|location|product|concept|event|date|currency|other",
      "canonical_name": "standardized name",
      "description": "brief description",
      "confidence": 0.0-1.0,
      "related_concepts": ["concept1", "concept2"],
      "domain_relevance": "high|medium|low"
    }
  ],
  "entity_count": 0,
  "high_confidence_count": 0,
  "entity_graph_summary": "one sentence describing entity relationships"
}`;

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: MODEL, max_tokens: 1000, messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } }),
    });
    if (!response.ok) { res.status(200).json({ success: false, error: 'upstream_unavailable', detail: 'Model error', retryable: true }); return; }
    const data = await response.json() as any;
    const parsed = JSON.parse(data.choices[0].message.content.replace(/```json|```/g, '').trim());
    res.status(200).json({
      trace_id, status: 'success', model: MODEL,
      ...parsed,
      recommended_actions_priority_order: ['review-high-confidence', 'build-knowledge-graph'],
      chain_to: ['/image-to-content/analyze', '/image-to-content/compare'],
      privacy: { data_stored: false, retention: 'none' },
      latency_ms: Date.now() - t0,
      created_at: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(200).json({ success: false, error: 'upstream_unavailable', detail: err.message, retryable: true });
  }
});
