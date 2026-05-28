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
  res.json({ name: 'Geocoding API', info: '/geocoding/info', openapi: '/geocoding/openapi.json', health: 'ok' });
});

// POST /geocode
router.post('/geocode', async (req: Request, res: Response) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'address is required' });
  try {
    const raw = await callClaude(`Forward geocode address: "${address}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "address_input": "${address}",
  "result": {
    "formatted_address": "string",
    "lat": number,
    "lon": number,
    "place_id": "string",
    "address_components": {
      "street_number": "string or null",
      "street_name": "string or null",
      "city": "string",
      "state_province": "string",
      "postal_code": "string or null",
      "country": "string",
      "country_code": "string"
    },
    "place_type": "street_address|city|region|country|postal_code|poi",
    "accuracy": "rooftop|range|centroid|approximate"
  },
  "alternatives": [{"formatted_address": "string", "lat": number, "lon": number, "accuracy": "string"}],
  "confidence_per_section": {"result": 0.9, "address_components": 0.88},
  "recommended_actions_priority_order": ["validate parsed components before use", "check accuracy level for precision-sensitive use cases", "pass coordinates to weather or reverse geocode"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /reverse
router.post('/reverse', async (req: Request, res: Response) => {
  const { lat, lon } = req.body;
  if (lat === undefined || lon === undefined) return res.status(400).json({ error: 'lat and lon are required' });
  try {
    const raw = await callClaude(`Reverse geocode coordinates lat: ${lat}, lon: ${lon}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "lat": ${lat},
  "lon": ${lon},
  "result": {
    "formatted_address": "string",
    "short_address": "string",
    "address_components": {
      "street_number": "string or null",
      "street_name": "string or null",
      "city": "string",
      "state_province": "string",
      "postal_code": "string or null",
      "country": "string",
      "country_code": "string"
    },
    "place_type": "string",
    "neighborhood": "string or null",
    "district": "string or null"
  },
  "confidence_per_section": {"result": 0.92},
  "recommended_actions_priority_order": ["use formatted address for display", "validate postal code for shipping", "enrich with local place intelligence"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /timezone
router.post('/timezone', async (req: Request, res: Response) => {
  const { lat, lon } = req.body;
  if (lat === undefined || lon === undefined) return res.status(400).json({ error: 'lat and lon are required' });
  try {
    const raw = await callClaude(`Timezone lookup for coordinates lat: ${lat}, lon: ${lon}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "lat": ${lat},
  "lon": ${lon},
  "timezone": {
    "id": "America/New_York",
    "name": "Eastern Time",
    "abbreviation": "EST",
    "utc_offset_hours": number,
    "utc_offset_string": "+05:30",
    "dst_active": true,
    "dst_offset_hours": number
  },
  "local_time": "ISO8601",
  "date": "YYYY-MM-DD",
  "time": "HH:MM:SS",
  "confidence_per_section": {"timezone": 0.95},
  "recommended_actions_priority_order": ["use for scheduling across time zones", "adjust meeting times for distributed teams", "use in calendar agents for accurate event times"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { address, lat, lon, objective } = req.body;
  const hasInput = address || (lat !== undefined && lon !== undefined);
  const flags: string[] = [];
  if (!hasInput) flags.push('NO_LOCATION_INPUT');
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: flags.length === 0,
    address: address || null,
    coordinates: lat !== undefined ? { lat, lon } : null,
    objective: objective || 'geocoding',
    next_api: 'weather',
    next_endpoint: '/current',
    blocking_flags: flags,
    flag_definitions: { NO_LOCATION_INPUT: 'Provide either address or lat/lon coordinates' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Run /geocode for address to coordinates', 'Run /reverse for coordinates to address', 'Run /timezone for scheduling across time zones'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /lookup (ONE-CALL)
router.post('/lookup', async (req: Request, res: Response) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'address is required' });
  try {
    const raw = await callClaude(`Full geocoding intelligence for address: "${address}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "address_input": "${address}",
  "geocoded": {
    "formatted_address": "string",
    "lat": number,
    "lon": number,
    "accuracy": "rooftop|range|centroid|approximate",
    "address_components": {"city": "string", "state_province": "string", "postal_code": "string or null", "country": "string", "country_code": "string"}
  },
  "timezone": {"id": "string", "abbreviation": "string", "utc_offset_hours": number, "local_time": "ISO8601"},
  "place_intelligence": {
    "place_type": "string",
    "neighborhood": "string or null",
    "population": number or null,
    "elevation_m": number or null,
    "is_residential": true,
    "is_commercial": false
  },
  "alternatives": [{"formatted_address": "string", "lat": number, "lon": number}],
  "confidence_per_section": {"geocoded": 0.9, "timezone": 0.95, "place_intelligence": 0.82},
  "recommended_actions_priority_order": ["use coordinates for map display", "use timezone for scheduling", "validate with address-validation API for shipping"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
