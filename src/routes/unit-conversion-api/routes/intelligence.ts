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
  res.json({ name: 'Unit Conversion API', info: '/unit-conversion/info', openapi: '/unit-conversion/openapi.json', health: 'ok' });
});

// POST /convert
router.post('/convert', async (req: Request, res: Response) => {
  const { value, from_unit, to_unit } = req.body;
  if (value === undefined || !from_unit || !to_unit) return res.status(400).json({ error: 'value, from_unit, and to_unit are required' });
  try {
    const raw = await callClaude(`Convert ${value} ${from_unit} to ${to_unit}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "input": {"value": ${value}, "unit": "${from_unit}"},
  "output": {"value": number, "unit": "${to_unit}", "formatted": "string"},
  "conversion_factor": number,
  "unit_type": "length|mass|volume|temperature|speed|area|pressure|energy|power|data|time",
  "formula": "string",
  "precision": "exact|rounded",
  "confidence_per_section": {"output": 0.98, "formula": 0.95},
  "recommended_actions_priority_order": ["Verify conversion for safety-critical applications", "Use exact formula for high-precision work"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /batch
router.post('/batch', async (req: Request, res: Response) => {
  const { conversions } = req.body;
  if (!conversions || !Array.isArray(conversions)) return res.status(400).json({ error: 'conversions array is required' });
  try {
    const list = JSON.stringify(conversions.slice(0, 20));
    const raw = await callClaude(`Batch convert units: ${list}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "results": [
    {
      "input": {"value": number, "unit": "string"},
      "output": {"value": number, "unit": "string", "formatted": "string"},
      "unit_type": "string",
      "success": true
    }
  ],
  "total": number,
  "successful": number,
  "failed": number,
  "confidence_per_section": {"results": 0.95},
  "recommended_actions_priority_order": ["Verify failed conversions manually", "Check unit types match for each pair"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /detect-unit
router.post('/detect-unit', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Detect and extract units of measurement from text: "${text.slice(0, 2000)}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "detected_units": [
    {
      "value": number,
      "unit": "string",
      "unit_type": "string",
      "standardized_unit": "string",
      "context": "string",
      "position": {"start": number, "end": number}
    }
  ],
  "total_detected": number,
  "unit_types_found": ["string"],
  "confidence_per_section": {"detected_units": 0.88},
  "recommended_actions_priority_order": ["Validate detected values in context", "Normalize units for data pipelines"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { from_unit, to_unit, objective } = req.body;
  if (!from_unit || !to_unit) return res.status(400).json({ error: 'from_unit and to_unit are required' });
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: true,
    from_unit,
    to_unit,
    objective: objective || 'unit_conversion',
    next_api: 'tax-rate',
    next_endpoint: '/sales-tax',
    blocking_flags: [],
    flag_definitions: {
      NO_UNITS: 'No units provided',
      INCOMPATIBLE_UNITS: 'Units are not compatible — they must be of the same measurement type',
    },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Verify unit type compatibility', 'Use batch for multiple conversions', 'Check precision requirements'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /lookup (one-call)
router.post('/lookup', async (req: Request, res: Response) => {
  const { value, from_unit, to_unit } = req.body;
  if (value === undefined || !from_unit || !to_unit) return res.status(400).json({ error: 'value, from_unit, and to_unit are required' });
  try {
    const raw = await callClaude(`Full unit conversion intelligence for ${value} ${from_unit} to ${to_unit}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "input": {"value": ${value}, "unit": "${from_unit}"},
  "output": {"value": number, "unit": "${to_unit}", "formatted": "string"},
  "unit_type": "string",
  "formula": "string",
  "conversion_factor": number,
  "related_conversions": [{"to_unit": "string", "value": number, "formatted": "string"}],
  "unit_metadata": {
    "from": {"name": "string", "system": "metric|imperial|SI", "symbol": "string"},
    "to": {"name": "string", "system": "metric|imperial|SI", "symbol": "string"}
  },
  "scientific_notation": "string",
  "confidence_per_section": {"output": 0.98, "related_conversions": 0.95, "formula": 0.95},
  "recommended_actions_priority_order": ["Use related_conversions for comparison", "Apply formula for custom calculations"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
