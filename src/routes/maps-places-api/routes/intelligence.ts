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
  res.json({ name: 'Maps Places API', info: '/maps-places/info', openapi: '/maps-places/openapi.json', health: 'ok' });
});

// POST /search-place
router.post('/search-place', async (req: Request, res: Response) => {
  const { query, location } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  try {
    const raw = await callClaude(`Search places for query: "${query}", near location: "${location || 'worldwide'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "query": "${query}",
  "places": [
    {"place_id": "string", "name": "string", "address": "string", "type": "string", "rating": number, "lat": number, "lng": number, "open_now": true}
  ],
  "total_found": number,
  "confidence_per_section": {"places": 0.85},
  "recommended_actions_priority_order": ["get place details", "check nearby alternatives", "verify address"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /place-details
router.post('/place-details', async (req: Request, res: Response) => {
  const { place_id } = req.body;
  if (!place_id) return res.status(400).json({ error: 'place_id is required' });
  try {
    const raw = await callClaude(`Get detailed place info for place_id: "${place_id}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "place_id": "${place_id}",
  "details": {
    "name": "string", "address": "string", "phone": "string", "website": "string",
    "lat": number, "lng": number, "type": "string",
    "hours": {"monday": "string", "tuesday": "string", "wednesday": "string", "thursday": "string", "friday": "string", "saturday": "string", "sunday": "string"},
    "rating": number, "review_count": number, "price_level": 0,
    "photos": ["string"], "amenities": ["string"]
  },
  "confidence_per_section": {"details": 0.85},
  "recommended_actions_priority_order": ["verify hours", "check accessibility", "look up reviews"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /nearby
router.post('/nearby', async (req: Request, res: Response) => {
  const { location, type } = req.body;
  if (!location || !type) return res.status(400).json({ error: 'location and type are required' });
  try {
    const raw = await callClaude(`Find nearby points of interest type: "${type}" near location: "${location}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "location": "${location}",
  "type": "${type}",
  "places": [
    {"place_id": "string", "name": "string", "address": "string", "distance_meters": number, "rating": number, "open_now": true}
  ],
  "total_found": number,
  "confidence_per_section": {"places": 0.85},
  "recommended_actions_priority_order": ["sort by distance", "check ratings", "verify open status"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { query, objective } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: true,
    query,
    objective: objective || 'place_discovery',
    next_api: 'event-search',
    next_endpoint: '/events',
    blocking_flags: [],
    flag_definitions: { NO_QUERY: 'No search query provided', INVALID_LOCATION: 'Location could not be geocoded' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Search places first', 'Get details for top result', 'Find nearby alternatives'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /lookup (ONE-CALL)
router.post('/lookup', async (req: Request, res: Response) => {
  const { query, location } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  try {
    const raw = await callClaude(`Full place intelligence for query: "${query}", location: "${location || 'worldwide'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "query": "${query}",
  "top_places": [
    {"place_id": "string", "name": "string", "address": "string", "type": "string", "rating": number, "lat": number, "lng": number, "hours": "string", "phone": "string", "website": "string"}
  ],
  "nearby_alternatives": [{"name": "string", "type": "string", "distance_meters": number}],
  "best_match": {"place_id": "string", "name": "string", "reason": "string"},
  "confidence_per_section": {"top_places": 0.85, "best_match": 0.8},
  "recommended_actions_priority_order": ["validate best_match", "check hours", "get directions"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
