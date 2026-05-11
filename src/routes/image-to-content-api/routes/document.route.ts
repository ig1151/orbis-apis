import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
const router = Router();
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4-5';

router.post('/', async (req: Request, res: Response) => {
  const { image, image_format, extract_tables = true, extract_forms = true, extract_headings = true, language = 'en' } = req.body;
  if (!image) { res.status(400).json({ error: 'image is required' }); return; }
  const trace_id = `doc_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
  const t0 = Date.now();
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'OPENROUTER_API_KEY not set' }); return; }

  const mimeMap: Record<string, string> = { jpeg: 'image/jpeg', jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' };
  const mediaType = mimeMap[image_format ?? 'jpeg'] ?? 'image/jpeg';
  const imageContent = image.startsWith('https://')
    ? { type: 'image_url', image_url: { url: image } }
    : { type: 'image_url', image_url: { url: `data:${mediaType};base64,${image.includes(',') ? image.split(',')[1] : image}` } };

  const prompt = `Extract structured document content from this image. Return ONLY valid JSON:
{
  "document_type": "invoice|form|report|article|table|letter|receipt|contract|other",
  "title": "string or null",
  "language": "BCP-47 code",
  "layout": {
    "sections": [{"heading": "string or null", "content": "string", "position": "top|middle|bottom"}],
    "has_tables": boolean,
    "has_forms": boolean,
    "has_headers_footers": boolean,
    "column_count": integer
  },
  "tables": [{"headers": ["col1","col2"], "rows": [["val1","val2"]], "caption": "string or null"}],
  "form_fields": [{"label": "string", "value": "string or null", "field_type": "text|checkbox|signature|date"}],
  "key_value_pairs": [{"key": "string", "value": "string"}],
  "full_text": "complete extracted text",
  "summary": "one sentence document summary",
  "confidence": 0.0-1.0
}`;

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: MODEL, max_tokens: 1500, messages: [{ role: 'user', content: [imageContent, { type: 'text', text: prompt }] }], response_format: { type: 'json_object' } }),
    });
    if (!response.ok) { const err = await response.text(); res.status(500).json({ error: `Model error: ${response.status} ${err}` }); return; }
    const data = await response.json() as any;
    const parsed = JSON.parse(data.choices[0].message.content.replace(/```json|```/g, '').trim());
    res.status(200).json({
      trace_id, status: 'success', model: MODEL,
      ...parsed,
      recommended_actions_priority_order: ['review-form-fields', 'extract-key-values', 'entity-link'],
      chain_to: ['/image-to-content/entity-link', '/image-to-content/analyze'],
      privacy: { data_stored: false, retention: 'none' },
      latency_ms: Date.now() - t0,
      created_at: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
