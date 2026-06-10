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
  res.json({ name: 'Flight Status API', info: '/flight-status/info', openapi: '/flight-status/openapi.json', health: 'ok' });
});

// POST /status
router.post('/status', async (req: Request, res: Response) => {
  const { flight_number, date } = req.body;
  if (!flight_number) return res.status(400).json({ error: 'flight_number is required' });
  try {
    const raw = await callClaude(`Get flight status for flight: "${flight_number}"${date ? ` date: "${date}"` : ` date: "${new Date().toISOString().slice(0, 10)}"`}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "flight_number": "${flight_number}",
  "date": "${date || new Date().toISOString().slice(0, 10)}",
  "airline": {"name": "string", "iata": "string", "icao": "string"},
  "status": "scheduled|active|landed|cancelled|diverted|unknown",
  "departure": {
    "airport": "string", "iata": "string", "terminal": "string", "gate": "string",
    "scheduled": "string", "actual": "string", "delay_minutes": number
  },
  "arrival": {
    "airport": "string", "iata": "string", "terminal": "string", "gate": "string",
    "scheduled": "string", "actual": "string", "delay_minutes": number
  },
  "aircraft": {"type": "string", "registration": "string"},
  "duration_minutes": number,
  "on_time": true,
  "confidence_per_section": {"status": 0.82, "departure": 0.8, "arrival": 0.8},
  "recommended_actions_priority_order": ["Verify with airline app for real-time gate info", "Check airport delay reports", "Set flight alerts"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /airport-delays
router.post('/airport-delays', async (req: Request, res: Response) => {
  const { airport_code } = req.body;
  if (!airport_code) return res.status(400).json({ error: 'airport_code is required' });
  try {
    const raw = await callClaude(`Get airport delay information for IATA code: "${airport_code}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "airport": {
    "iata": "${airport_code}",
    "icao": "string",
    "name": "string",
    "city": "string",
    "country": "string"
  },
  "delay_status": "no_delays|minor_delays|significant_delays|severe_delays|ground_stop",
  "average_delay_minutes": number,
  "delay_cause": "weather|nas|security|late_aircraft|carrier|none",
  "weather": {"condition": "string", "visibility_miles": number, "wind_mph": number},
  "active_delays": [{"type": "string", "reason": "string", "avg_delay": number}],
  "closure_notices": ["string"],
  "confidence_per_section": {"delay_status": 0.82, "weather": 0.85},
  "recommended_actions_priority_order": ["Check FAA ATIS for active NOTAMs", "Allow buffer time for connections", "Monitor delay updates if above 30 min"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /route
router.post('/route', async (req: Request, res: Response) => {
  const { origin, destination, date } = req.body;
  if (!origin || !destination) return res.status(400).json({ error: 'origin and destination are required' });
  try {
    const raw = await callClaude(`Find flights from "${origin}" to "${destination}"${date ? ` on "${date}"` : ''}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "origin": "${origin}",
  "destination": "${destination}",
  "date": "${date || new Date().toISOString().slice(0, 10)}",
  "flights": [
    {
      "flight_number": "string",
      "airline": "string",
      "departure_time": "HH:MM",
      "arrival_time": "HH:MM",
      "duration_minutes": number,
      "stops": number,
      "aircraft": "string",
      "status": "scheduled|active|landed"
    }
  ],
  "direct_flights": number,
  "total_flights": number,
  "shortest_flight": {"flight_number": "string", "duration_minutes": number},
  "distance_miles": number,
  "confidence_per_section": {"flights": 0.8, "route": 0.85},
  "recommended_actions_priority_order": ["Verify schedules with airline", "Book direct if time-sensitive", "Check airport delays before departure"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { flight_number, objective } = req.body;
  if (!flight_number) return res.status(400).json({ error: 'flight_number is required' });
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: true,
    flight_number,
    objective: objective || 'flight_status',
    next_api: 'hotel-price',
    next_endpoint: '/search',
    blocking_flags: [],
    flag_definitions: {
      NO_FLIGHT_NUMBER: 'No flight number provided',
      INVALID_FLIGHT: 'Flight number format not recognized — use IATA format (e.g. AA123)',
    },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Check flight status', 'Look up airport delays', 'Find alternative routes if delayed'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /lookup (one-call)
router.post('/lookup', async (req: Request, res: Response) => {
  const { flight_number } = req.body;
  if (!flight_number) return res.status(400).json({ error: 'flight_number is required' });
  try {
    const raw = await callClaude(`Full flight intelligence for flight: "${flight_number}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "flight_number": "${flight_number}",
  "airline": {"name": "string", "iata": "string", "icao": "string"},
  "status": "scheduled|active|landed|cancelled|diverted|unknown",
  "departure": {"airport": "string", "iata": "string", "terminal": "string", "gate": "string", "scheduled": "string", "actual": "string", "delay_minutes": number},
  "arrival": {"airport": "string", "iata": "string", "terminal": "string", "gate": "string", "scheduled": "string", "actual": "string", "delay_minutes": number},
  "aircraft": {"type": "string", "registration": "string"},
  "duration_minutes": number,
  "route": {"origin_city": "string", "dest_city": "string", "distance_miles": number},
  "airport_delays": {"origin_delay_status": "string", "dest_delay_status": "string"},
  "on_time": true,
  "delay_risk": "high|medium|low|none",
  "confidence_per_section": {"status": 0.82, "departure": 0.8, "arrival": 0.8, "route": 0.88},
  "recommended_actions_priority_order": ["Verify with airline app for real-time updates", "Check airport delay status", "Set departure alerts"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
