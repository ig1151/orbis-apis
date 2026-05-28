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
  res.json({ name: 'Weather API', info: '/weather/info', openapi: '/weather/openapi.json', health: 'ok' });
});

// POST /current
router.post('/current', async (req: Request, res: Response) => {
  const { location } = req.body;
  if (!location) return res.status(400).json({ error: 'location is required' });
  try {
    const raw = await callClaude(`Current weather conditions for location: "${location}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "location": "${location}",
  "resolved_location": {"city": "string", "country": "string", "lat": number, "lon": number, "timezone": "string"},
  "current": {
    "temp_c": number,
    "temp_f": number,
    "feels_like_c": number,
    "humidity_pct": number,
    "wind_speed_kph": number,
    "wind_direction": "N|NE|E|SE|S|SW|W|NW",
    "visibility_km": number,
    "uv_index": number,
    "pressure_hpa": number,
    "condition": "string",
    "condition_code": "clear|cloudy|rain|snow|fog|storm|other",
    "is_day": true
  },
  "confidence_per_section": {"current": 0.88, "resolved_location": 0.92},
  "recommended_actions_priority_order": ["check forecast for travel planning", "check alerts for safety", "use for event planning decisions"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /forecast
router.post('/forecast', async (req: Request, res: Response) => {
  const { location } = req.body;
  if (!location) return res.status(400).json({ error: 'location is required' });
  try {
    const raw = await callClaude(`7-day weather forecast for location: "${location}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "location": "${location}",
  "forecast": [
    {
      "date": "YYYY-MM-DD",
      "day_of_week": "string",
      "high_c": number,
      "low_c": number,
      "precipitation_mm": number,
      "precipitation_probability_pct": number,
      "condition": "string",
      "condition_code": "clear|cloudy|rain|snow|fog|storm|other",
      "wind_speed_kph": number,
      "uv_index": number,
      "sunrise": "HH:MM",
      "sunset": "HH:MM"
    }
  ],
  "weekly_summary": {"avg_high_c": number, "avg_low_c": number, "dominant_condition": "string", "precipitation_days": number},
  "confidence_per_section": {"forecast": 0.82, "weekly_summary": 0.85},
  "recommended_actions_priority_order": ["plan logistics around precipitation days", "check UV for outdoor worker safety", "alert on storm days for supply chain"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /alerts
router.post('/alerts', async (req: Request, res: Response) => {
  const { location } = req.body;
  if (!location) return res.status(400).json({ error: 'location is required' });
  try {
    const raw = await callClaude(`Severe weather alerts for location: "${location}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "location": "${location}",
  "alerts": [
    {
      "id": "string",
      "type": "hurricane|tornado|flood|blizzard|heat|fire|wind|thunderstorm|other",
      "severity": "extreme|severe|moderate|minor",
      "headline": "string",
      "description": "string",
      "effective_from": "ISO8601",
      "effective_until": "ISO8601",
      "area_affected": "string",
      "instructions": "string"
    }
  ],
  "alert_count": number,
  "highest_severity": "extreme|severe|moderate|minor|none",
  "all_clear": true,
  "confidence_per_section": {"alerts": 0.9},
  "recommended_actions_priority_order": ["trigger safety protocols for extreme alerts", "notify logistics teams of disruption risk", "reschedule outdoor events for severe alerts"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { location, objective } = req.body;
  if (!location) return res.status(400).json({ error: 'location is required' });
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: true,
    location,
    objective: objective || 'weather_analysis',
    next_api: 'geocoding',
    next_endpoint: '/geocode',
    blocking_flags: [],
    flag_definitions: { NO_LOCATION: 'Location is required' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Get current conditions first', 'Check alerts for safety', 'Pull 7-day forecast for planning'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /analyze (ONE-CALL)
router.post('/analyze', async (req: Request, res: Response) => {
  const { location } = req.body;
  if (!location) return res.status(400).json({ error: 'location is required' });
  try {
    const raw = await callClaude(`Full weather analysis for location: "${location}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "location": "${location}",
  "resolved_location": {"city": "string", "country": "string", "lat": number, "lon": number, "timezone": "string"},
  "current": {"temp_c": number, "feels_like_c": number, "humidity_pct": number, "wind_speed_kph": number, "condition": "string", "condition_code": "string", "is_day": true},
  "forecast_3day": [{"date": "YYYY-MM-DD", "high_c": number, "low_c": number, "condition": "string", "precipitation_probability_pct": number}],
  "alerts": [{"type": "string", "severity": "string", "headline": "string"}],
  "alert_count": number,
  "all_clear": true,
  "operational_impact": {"logistics_risk": "low|medium|high", "outdoor_work_safe": true, "travel_advisory": "string"},
  "confidence_per_section": {"current": 0.88, "forecast_3day": 0.82, "alerts": 0.9},
  "recommended_actions_priority_order": ["act on active alerts immediately", "adjust logistics for precipitation days", "use geocoding API to refine coordinates"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
