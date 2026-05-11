import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
export const compareRouter = Router();
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4-5';

compareRouter.post('/', async (req: Request, res: Response) => {
  const { images, comparison_focus, language = 'en' } = req.body;
  if (!images || !Array.isArray(images) || images.length < 2) {
    res.status(400).json({ error: 'At least 2 images required' }); return;
  }
  if (images.length > 5) { res.status(400).json({ error: 'Max 5 images per comparison' }); return; }
  const trace_id = `cmp_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
  const t0 = Date.now();
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'OPENROUTER_API_KEY not set' }); return; }

  const mimeMap: Record<string, string> = { jpeg: 'image/jpeg', jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  const imageContents = images.map((img: any, i: number) => {
    const url = img.image.startsWith('https://')
      ? img.image
      : `data:${mimeMap[img.image_format ?? 'jpeg'] ?? 'image/jpeg'};base64,${img.image.includes(',') ? img.image.split(',')[1] : img.image}`;
    return { type: 'image_url', image_url: { url }, label: img.label || `Image ${i + 1}` };
  });

  const prompt = `Compare these ${images.length} images. Focus: ${comparison_focus || 'general comparison'}.
Return ONLY valid JSON:
{
  "comparison_summary": "one paragraph summary of key differences and similarities",
  "similarities": ["similarity1", "similarity2"],
  "differences": [{"aspect": "string", "description": "string", "significance": "high|medium|low"}],
  "ranking": [{"image_index": integer, "label": "string", "rank": integer, "reason": "string"}],
  "best_for": {"purpose": "string", "image_index": integer, "reason": "string"},
  "visual_consistency_score": 0.0-1.0,
  "style_match_score": 0.0-1.0,
  "recommended_use_cases": ["use case 1", "use case 2"],
  "confidence": 0.0-1.0
}`;

  try {
    const messageContent = [...imageContents.map((ic: any) => ({ type: 'image_url', image_url: ic.image_url })), { type: 'text', text: prompt }];
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: MODEL, max_tokens: 1200, messages: [{ role: 'user', content: messageContent }], response_format: { type: 'json_object' } }),
    });
    if (!response.ok) { res.status(500).json({ error: 'Model error' }); return; }
    const data = await response.json() as any;
    const parsed = JSON.parse(data.choices[0].message.content.replace(/```json|```/g, '').trim());
    res.status(200).json({
      trace_id, status: 'success', model: MODEL,
      image_count: images.length, comparison_focus: comparison_focus || 'general',
      ...parsed,
      recommended_actions_priority_order: ['select-best-image', 'score-winner', 'use-in-workflow'],
      chain_to: ['/image-to-content/analyze', '/image-gen/score-image'],
      privacy: { data_stored: false, retention: 'none' },
      latency_ms: Date.now() - t0,
      created_at: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
