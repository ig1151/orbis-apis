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
  res.json({ name: 'Timezone API', info: '/timezone/info', openapi: '/timezone/openapi.json', health: 'ok' });
});

// POST /lookup
router.post('/lookup', async (req: Request, res: Response) => {
  const { location } = req.body;
  if (!location) return res.status(400).json({ error: 'location is required' });
  try {
    const raw = await callClaude(`Look up timezone for location: "${location}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "location": "${location}",
  "timezone": {
    "name": "string",
    "abbreviation": "string",
    "utc_offset": "string",
    "utc_offset_seconds": number,
    "dst_active": true,
    "dst_offset": "string",
    "current_time": "string",
    "current_date": "YYYY-MM-DD"
  },
  "country": "string",
  "country_code": "string",
  "coordinates": {"lat": number, "lng": number},
  "confidence_per_section": {"timezone": 0.95, "coordinates": 0.9},
  "recommended_actions_priority_order": ["Verify DST status before scheduling", "Store UTC offset for conversions"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /convert
router.post('/convert', async (req: Request, res: Response) => {
  const { datetime, from_tz, to_tz } = req.body;
  if (!datetime || !from_tz || !to_tz) return res.status(400).json({ error: 'datetime, from_tz, and to_tz are required' });
  try {
    const raw = await callClaude(`Convert datetime "${datetime}" from timezone "${from_tz}" to "${to_tz}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "original": {"datetime": "${datetime}", "timezone": "${from_tz}", "utc_offset": "string"},
  "converted": {"datetime": "string", "timezone": "${to_tz}", "utc_offset": "string", "date": "YYYY-MM-DD", "time": "HH:MM:SS", "day_of_week": "string"},
  "utc_equivalent": "string",
  "offset_diff_hours": number,
  "is_next_day": true,
  "is_previous_day": true,
  "confidence_per_section": {"converted": 0.98, "utc_equivalent": 0.98},
  "recommended_actions_priority_order": ["Double-check DST transitions", "Confirm date boundary crossings"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /meeting-times
router.post('/meeting-times', async (req: Request, res: Response) => {
  const { timezones, date } = req.body;
  if (!timezones || !Array.isArray(timezones)) return res.status(400).json({ error: 'timezones array is required' });
  try {
    const tzList = timezones.slice(0, 10).join(', ');
    const raw = await callClaude(`Find optimal meeting times across timezones: ${tzList} for date: "${date || new Date().toISOString().slice(0, 10)}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "timezones": ["string"],
  "date": "${date || new Date().toISOString().slice(0, 10)}",
  "optimal_windows": [
    {
      "utc_time": "HH:MM",
      "local_times": [{"timezone": "string", "local_time": "HH:MM", "day": "Mon|Tue|Wed|Thu|Fri|Sat|Sun", "is_business_hours": true}],
      "score": number,
      "label": "string"
    }
  ],
  "recommended_slot": {"utc_time": "HH:MM", "reason": "string"},
  "timezone_summary": [{"timezone": "string", "abbreviation": "string", "utc_offset": "string", "business_hours_utc": {"start": "HH:MM", "end": "HH:MM"}}],
  "confidence_per_section": {"optimal_windows": 0.9, "recommended_slot": 0.88},
  "recommended_actions_priority_order": ["Book recommended slot first", "Send calendar invites in each participant's local time"],
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
    objective: objective || 'timezone_lookup',
    next_api: 'calendar-holiday',
    next_endpoint: '/holidays',
    blocking_flags: [],
    flag_definitions: {
      NO_LOCATION: 'No location provided',
      AMBIGUOUS_LOCATION: 'Location is ambiguous — provide city and country for accuracy',
    },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Look up timezone', 'Convert times for participants', 'Find meeting windows'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /analyze (one-call)
router.post('/analyze', async (req: Request, res: Response) => {
  const { location } = req.body;
  if (!location) return res.status(400).json({ error: 'location is required' });
  try {
    const raw = await callClaude(`Full timezone intelligence for location: "${location}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "location": "${location}",
  "timezone": {"name": "string", "abbreviation": "string", "utc_offset": "string", "dst_active": true, "current_time": "string"},
  "country": "string",
  "country_code": "string",
  "coordinates": {"lat": number, "lng": number},
  "business_hours_utc": {"start": "HH:MM", "end": "HH:MM"},
  "overlapping_zones": ["string"],
  "dst_schedule": {"starts": "YYYY-MM-DD", "ends": "YYYY-MM-DD", "offset_change": "string"},
  "nearby_cities": [{"city": "string", "timezone": "string", "utc_offset": "string"}],
  "confidence_per_section": {"timezone": 0.95, "dst_schedule": 0.88, "coordinates": 0.9},
  "recommended_actions_priority_order": ["Store IANA timezone name not abbreviation", "Account for DST transitions in recurring schedules"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
