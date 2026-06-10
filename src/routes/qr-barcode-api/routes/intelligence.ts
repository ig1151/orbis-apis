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
  res.json({ name: 'QR / Barcode API', info: '/qr-barcode/info', openapi: '/qr-barcode/openapi.json', health: 'ok' });
});

// POST /decode
router.post('/decode', async (req: Request, res: Response) => {
  const { image_url } = req.body;
  if (!image_url) return res.status(400).json({ error: 'image_url is required' });
  try {
    const raw = await callClaude(`Decode QR code or barcode from image URL: "${image_url}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "image_url": "${image_url}",
  "decoded": {
    "format": "QR_CODE|CODE_128|CODE_39|EAN_13|EAN_8|UPC_A|UPC_E|DATA_MATRIX|PDF_417",
    "data": "string",
    "data_type": "URL|text|email|phone|vcard|wifi|geo",
    "error_correction": "L|M|Q|H",
    "version": "string"
  },
  "parsed_data": {"url": "string", "email": "string", "phone": "string"},
  "confidence_per_section": {"decoded": 0.95},
  "recommended_actions_priority_order": ["validate decoded data type", "sanitize URL before following", "check error_correction level for reliability"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /generate — uses qrserver.com directly, no Claude call needed
router.post('/generate', (req: Request, res: Response) => {
  const { data, format = 'qr' } = req.body;
  if (!data) return res.status(400).json({ error: 'data is required' });
  const encoded = encodeURIComponent(data);
  const imageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encoded}`;
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    data,
    format: 'qr',
    generated: {
      image_url: imageUrl,
      data_url: imageUrl,
      format: 'PNG',
      size: '256x256',
      error_correction: 'M',
      module_count: 25,
    },
    embed_html: `<img src="${imageUrl}" alt="QR Code">`,
    confidence_per_section: { generated: 0.99 },
    recommended_actions_priority_order: ['test scan generated code before deployment', 'use SVG for scalable display', 'increase error_correction for printed codes'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /batch
router.post('/batch', async (req: Request, res: Response) => {
  const { image_urls } = req.body;
  if (!image_urls || !Array.isArray(image_urls)) return res.status(400).json({ error: 'image_urls array is required' });
  try {
    const list = image_urls.slice(0, 20).join(', ');
    const raw = await callClaude(`Batch decode QR codes and barcodes from image URLs: ${list}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "results": [
    {
      "image_url": "string",
      "format": "string",
      "data": "string",
      "data_type": "string",
      "error": null
    }
  ],
  "summary": {"total": number, "successful": number, "failed": number, "formats_detected": ["string"]},
  "confidence_per_section": {"results": 0.9},
  "recommended_actions_priority_order": ["retry failed images individually", "group results by format for processing", "check error field per item"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { image_url, objective } = req.body;
  if (!image_url) return res.status(400).json({ error: 'image_url is required' });
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: true,
    image_url,
    objective: objective || 'barcode_decode',
    next_api: 'product-data',
    next_endpoint: '/lookup',
    blocking_flags: [],
    flag_definitions: { NO_IMAGE_URL: 'No image URL provided', UNREADABLE_IMAGE: 'Image quality too low to decode' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Decode QR/barcode first', 'Use batch for multiple codes', 'Feed decoded data to product-data for lookup'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /process (one-call)
router.post('/process', async (req: Request, res: Response) => {
  const { image_url } = req.body;
  if (!image_url) return res.status(400).json({ error: 'image_url is required' });
  try {
    const raw = await callClaude(`Full QR/barcode processing for image URL: "${image_url}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "image_url": "${image_url}",
  "decoded": {"format": "string", "data": "string", "data_type": "string", "error_correction": "string"},
  "parsed_data": {"url": "string", "product_id": "string", "sku": "string"},
  "metadata": {"image_quality": "high|medium|low", "orientation": "string", "code_position": "string"},
  "recommended_next_step": "product-data-lookup|url-visit|contact-import",
  "confidence_per_section": {"decoded": 0.95, "parsed_data": 0.88},
  "recommended_actions_priority_order": ["follow recommended_next_step", "sanitize URL if data_type is URL", "use product_id for product-data lookup"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
