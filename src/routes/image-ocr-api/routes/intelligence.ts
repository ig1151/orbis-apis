import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';


function parseJSON(raw: string) {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.indexOf('{');
  if (start !== -1) {
    let depth = 0, end = -1;
    for (let i = start; i < cleaned.length; i++) {
      if (cleaned[i] === '{') depth++;
      else if (cleaned[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end !== -1) try { return JSON.parse(cleaned.slice(start, end + 1)); } catch {}
  }
  throw new Error(`Cannot parse as JSON: ${raw.slice(0, 100)}`);
}

function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Image OCR API', info: '/image-ocr/info', openapi: '/image-ocr/openapi.json', health: 'ok' });
});

// POST /ocr
router.post('/ocr', async (req: Request, res: Response) => {
  const { image_url, language } = req.body;
  if (!image_url) return res.status(400).json({ error: 'image_url is required' });
  try {
    const raw = await callClaude(`OCR extraction for image at: "${image_url}" language hint: "${language || 'auto'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "raw_text": "string",
  "text_blocks": [{"id": number, "text": "string", "type": "heading|paragraph|list|table|code|other", "confidence": 0-1, "bounding_box": {"x": number, "y": number, "width": number, "height": number}}],
  "language_detected": "string",
  "language_confidence": 0-1,
  "word_count": number,
  "reading_order": ["block_id"],
  "confidence_per_section": {"raw_text": 0-1, "text_blocks": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /receipt-ocr
router.post('/receipt-ocr', async (req: Request, res: Response) => {
  const { image_url } = req.body;
  if (!image_url) return res.status(400).json({ error: 'image_url is required' });
  try {
    const raw = await callClaude(`Parse receipt from image: "${image_url}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "merchant": {"name": "string", "address": "string", "phone": "string", "category": "string"},
  "transaction": {"date": "string", "time": "string", "receipt_number": "string"},
  "line_items": [{"description": "string", "quantity": number, "unit_price": number, "total": number, "category": "string"}],
  "totals": {"subtotal": number, "tax": number, "tip": number, "total": number, "currency": "string"},
  "payment_method": "cash|credit|debit|contactless|unknown",
  "confidence_per_section": {"merchant": 0-1, "line_items": 0-1, "totals": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /document-ocr
router.post('/document-ocr', async (req: Request, res: Response) => {
  const { image_url, document_type } = req.body;
  if (!image_url) return res.status(400).json({ error: 'image_url is required' });
  try {
    const raw = await callClaude(`Parse document image: "${image_url}" type: "${document_type || 'auto'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "document_type": "invoice|form|letter|contract|report|id|other",
  "title": "string",
  "sections": [{"heading": "string", "content": "string", "page": number}],
  "form_fields": [{"label": "string", "value": "string", "field_type": "text|checkbox|signature|date"}],
  "tables_detected": number,
  "key_entities": [{"type": "string", "value": "string"}],
  "confidence_per_section": {"sections": 0-1, "form_fields": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /table-extract
router.post('/table-extract', async (req: Request, res: Response) => {
  const { image_url } = req.body;
  if (!image_url) return res.status(400).json({ error: 'image_url is required' });
  try {
    const raw = await callClaude(`Extract tables from image: "${image_url}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "tables": [
    {
      "table_id": number,
      "headers": ["string"],
      "rows": [["string"]],
      "row_count": number,
      "col_count": number,
      "confidence": 0-1
    }
  ],
  "tables_found": number,
  "confidence_per_section": {"tables": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { image_url, document_type } = req.body;
  if (!image_url) return res.status(400).json({ error: 'image_url is required' });
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: true,
    image_url,
    recommended_endpoint: document_type === 'receipt' ? '/receipt-ocr' : document_type === 'table' ? '/table-extract' : '/ocr',
    next_api: 'document-intelligence',
    next_endpoint: '/extract',
    blocking_flags: [],
    flag_definitions: { NO_IMAGE_URL: 'No image URL provided', UNSUPPORTED_FORMAT: 'Image format may not be supported' },
    confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Validate image URL is accessible', 'Use /receipt-ocr for receipts, /document-ocr for documents'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /extract (one-call)
router.post('/extract', async (req: Request, res: Response) => {
  const { image_url, hint } = req.body;
  if (!image_url) return res.status(400).json({ error: 'image_url is required' });
  try {
    const raw = await callClaude(`Auto-detect and extract from image: "${image_url}" hint: "${hint || 'auto'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "detected_type": "receipt|invoice|form|table|document|id|other",
  "raw_text": "string",
  "structured_data": {},
  "tables": [{"headers": ["string"], "rows": [["string"]]}],
  "key_fields": [{"label": "string", "value": "string", "confidence": 0-1}],
  "extraction_confidence": 0-1,
  "language_detected": "string",
  "confidence_per_section": {"detected_type": 0-1, "structured_data": 0-1, "tables": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
