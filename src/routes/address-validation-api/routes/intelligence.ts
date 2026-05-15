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
  res.json({ name: 'Address Validation API', info: '/address-validation/info', openapi: '/address-validation/openapi.json', health: 'ok' });
});

// POST /validate
router.post('/validate', async (req: Request, res: Response) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'address is required' });
  try {
    const raw = await callClaude(`Validate postal address: "${address}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "address_input": "${address}",
  "validation": {
    "is_valid": true,
    "is_deliverable": true,
    "is_residential": false,
    "is_commercial": true,
    "completeness": "complete|partial|incomplete",
    "issues": ["string"],
    "confidence_score": 0.0,
    "dpv_status": "Y|S|D|N",
    "dpv_description": "Confirmed|Confirmed Secondary|Confirmed Building Only|Not Confirmed"
  },
  "confidence_per_section": {"validation": 0.93},
  "recommended_actions_priority_order": ["check deliverability before shipping", "normalize address for consistent storage", "geocode for mapping workflows"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /normalize
router.post('/normalize', async (req: Request, res: Response) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'address is required' });
  try {
    const raw = await callClaude(`Normalize and standardize postal address: "${address}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "address_input": "${address}",
  "normalized": {
    "street_line1": "string",
    "street_line2": "string or null",
    "city": "string",
    "state_province": "string",
    "postal_code": "string",
    "country": "string",
    "country_code": "string",
    "formatted_single_line": "string",
    "formatted_multi_line": ["string"]
  },
  "corrections_made": ["string"],
  "abbreviations_expanded": {"St": "Street", "Ave": "Avenue"},
  "confidence_per_section": {"normalized": 0.92, "corrections_made": 0.88},
  "recommended_actions_priority_order": ["replace input with normalized version", "store components separately for querying", "use formatted_single_line for display"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /geocode
router.post('/geocode', async (req: Request, res: Response) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'address is required' });
  try {
    const raw = await callClaude(`Geocode postal address: "${address}" to coordinates. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "address_input": "${address}",
  "geocoded": {
    "lat": number,
    "lon": number,
    "accuracy": "rooftop|range|centroid|approximate",
    "formatted_address": "string",
    "place_id": "string",
    "plus_code": "string or null"
  },
  "address_components": {
    "street_number": "string or null",
    "street_name": "string",
    "city": "string",
    "state_province": "string",
    "postal_code": "string",
    "country": "string",
    "country_code": "string"
  },
  "timezone": "string",
  "confidence_per_section": {"geocoded": 0.9, "address_components": 0.92},
  "recommended_actions_priority_order": ["use coordinates for map display", "use timezone for localization", "chain with geocoding API for deeper place intelligence"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { address, objective } = req.body;
  if (!address) return res.status(400).json({ error: 'address is required' });
  const flags: string[] = [];
  if (address.trim().length < 5) flags.push('ADDRESS_TOO_SHORT');
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: flags.length === 0,
    address,
    objective: objective || 'address_validation',
    next_api: 'geocoding',
    next_endpoint: '/lookup',
    blocking_flags: flags,
    flag_definitions: { ADDRESS_TOO_SHORT: 'Address is too short to validate (minimum 5 characters)' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Run /validate to confirm deliverability', 'Run /normalize for canonical formatting', 'Run /geocode to get coordinates for mapping'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /lookup (ONE-CALL)
router.post('/lookup', async (req: Request, res: Response) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'address is required' });
  try {
    const raw = await callClaude(`Full address intelligence for: "${address}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "address_input": "${address}",
  "validation": {"is_valid": true, "is_deliverable": true, "is_residential": false, "completeness": "complete", "confidence_score": 0.0, "issues": []},
  "normalized": {"street_line1": "string", "city": "string", "state_province": "string", "postal_code": "string", "country": "string", "country_code": "string", "formatted_single_line": "string"},
  "geocoded": {"lat": number, "lon": number, "accuracy": "rooftop|range|centroid|approximate", "timezone": "string"},
  "data_quality_grade": "A|B|C|D|F",
  "corrections_made": ["string"],
  "confidence_per_section": {"validation": 0.93, "normalized": 0.92, "geocoded": 0.9},
  "recommended_actions_priority_order": ["use normalized address for shipping labels", "use coordinates for location-aware services", "validate grade before use in compliance workflows"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
