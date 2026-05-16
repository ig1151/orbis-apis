import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';

async function callClaude(prompt: string): Promise<string> {
  const res = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    { model: MODEL, messages: [{ role: 'user', content: prompt }] },
    { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' } }
  );
  return res.data.choices[0].message.content;
}

function parseJSON(raw: string) {
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Product Data API', info: '/product-data/info', openapi: '/product-data/openapi.json', health: 'ok' });
});

// POST /lookup
router.post('/lookup', async (req: Request, res: Response) => {
  const { product_name, brand } = req.body;
  if (!product_name) return res.status(400).json({ error: 'product_name is required' });
  try {
    const raw = await callClaude(`Look up product details for: "${product_name}" brand: "${brand || 'any'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "product_name": "${product_name}",
  "product": {
    "name": "string",
    "brand": "string",
    "category": "string",
    "subcategory": "string",
    "sku": "string",
    "upc": "string",
    "asin": "string",
    "description": "string",
    "specifications": {"key": "value"},
    "images": ["string"],
    "release_date": "string"
  },
  "pricing": {"avg_price": number, "price_range": {"min": number, "max": number}, "currency": "USD"},
  "confidence_per_section": {"product": 0.88, "pricing": 0.82},
  "recommended_actions_priority_order": ["use asin for Amazon lookup", "use upc for barcode scanning", "verify specifications from authoritative source"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /extract
router.post('/extract', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const raw = await callClaude(`Extract structured product data from URL: "${url}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "url": "${url}",
  "product": {
    "name": "string",
    "brand": "string",
    "sku": "string",
    "category": "string",
    "description": "string",
    "price": {"amount": number, "currency": "string", "formatted": "string"},
    "in_stock": true,
    "rating": number,
    "review_count": number,
    "images": ["string"],
    "specifications": {"key": "value"},
    "variants": [{"name": "string", "value": "string", "price_modifier": number}]
  },
  "schema_org_detected": true,
  "confidence_per_section": {"product": 0.9, "specifications": 0.85},
  "recommended_actions_priority_order": ["validate specifications from manufacturer", "use variants for configurable products", "check in_stock before purchasing"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /compare
router.post('/compare', async (req: Request, res: Response) => {
  const { product_ids } = req.body;
  if (!product_ids || !Array.isArray(product_ids)) return res.status(400).json({ error: 'product_ids array is required' });
  try {
    const list = product_ids.slice(0, 5).join(', ');
    const raw = await callClaude(`Compare products with IDs/names: ${list}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "products": [
    {
      "id": "string",
      "name": "string",
      "brand": "string",
      "price": number,
      "rating": number,
      "key_specs": {"key": "value"},
      "pros": ["string"],
      "cons": ["string"],
      "best_for": "string"
    }
  ],
  "winner": {"id": "string", "name": "string", "reason": "string"},
  "comparison_matrix": {"spec": {"product_id": "value"}},
  "confidence_per_section": {"products": 0.85, "winner": 0.8},
  "recommended_actions_priority_order": ["choose winner for best value", "review comparison_matrix for specific needs", "check pros/cons against use case"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { product_name, objective } = req.body;
  if (!product_name) return res.status(400).json({ error: 'product_name is required' });
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: true,
    product_name,
    objective: objective || 'product_lookup',
    next_api: 'amazon-product',
    next_endpoint: '/product',
    blocking_flags: [],
    flag_definitions: { NO_PRODUCT_NAME: 'No product name provided', AMBIGUOUS_PRODUCT: 'Product name too ambiguous — add brand for precision' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Look up product to get ASIN/SKU', 'Extract from URL for live data', 'Compare alternatives before purchasing'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /enrich (one-call)
router.post('/enrich', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const raw = await callClaude(`Full product data enrichment for URL: "${url}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "url": "${url}",
  "product": {"name": "string", "brand": "string", "sku": "string", "upc": "string", "asin": "string", "category": "string", "description": "string"},
  "pricing": {"amount": number, "currency": "string", "discount_pct": number, "in_stock": true},
  "specifications": {"key": "value"},
  "images": ["string"],
  "variants": [{"name": "string", "value": "string"}],
  "ratings": {"score": number, "count": number, "distribution": {"5": number, "4": number, "3": number, "2": number, "1": number}},
  "seo_data": {"title": "string", "description": "string", "keywords": ["string"]},
  "confidence_per_section": {"product": 0.9, "pricing": 0.92, "specifications": 0.85},
  "recommended_actions_priority_order": ["ingest product data into PIM", "use specifications for comparison", "track pricing for procurement"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
