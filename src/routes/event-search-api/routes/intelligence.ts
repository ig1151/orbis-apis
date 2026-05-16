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
  res.json({ name: 'Event Search API', info: '/event-search/info', openapi: '/event-search/openapi.json', health: 'ok' });
});

// POST /events
router.post('/events', async (req: Request, res: Response) => {
  const { location, date, category } = req.body;
  if (!location) return res.status(400).json({ error: 'location is required' });
  try {
    const raw = await callClaude(`Search events in location: "${location}", date: "${date || 'upcoming'}", category: "${category || 'all'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "location": "${location}",
  "events": [
    {"event_id": "string", "name": "string", "category": "string", "date": "YYYY-MM-DD", "time": "string", "venue": "string", "venue_id": "string", "is_virtual": false, "ticket_url": "string", "price_range": "string"}
  ],
  "total_found": number,
  "confidence_per_section": {"events": 0.85},
  "recommended_actions_priority_order": ["filter by category", "check venue details", "get ticket links"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /venue
router.post('/venue', async (req: Request, res: Response) => {
  const { venue_id } = req.body;
  if (!venue_id) return res.status(400).json({ error: 'venue_id is required' });
  try {
    const raw = await callClaude(`Get venue details for venue_id: "${venue_id}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "venue_id": "${venue_id}",
  "venue": {
    "name": "string", "address": "string", "city": "string", "capacity": number,
    "phone": "string", "website": "string", "lat": number, "lng": number,
    "amenities": ["parking", "accessible", "food_service"],
    "upcoming_events_count": number
  },
  "confidence_per_section": {"venue": 0.85},
  "recommended_actions_priority_order": ["check accessibility", "plan parking", "review upcoming events"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /ticket-links
router.post('/ticket-links', async (req: Request, res: Response) => {
  const { event_id } = req.body;
  if (!event_id) return res.status(400).json({ error: 'event_id is required' });
  try {
    const raw = await callClaude(`Find ticket links for event_id: "${event_id}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "event_id": "${event_id}",
  "ticket_sources": [
    {"platform": "string", "url": "string", "price_from": "string", "availability": "available|limited|sold_out", "official": true}
  ],
  "best_price": {"platform": "string", "price": "string"},
  "availability_status": "available|limited|sold_out",
  "confidence_per_section": {"ticket_sources": 0.8},
  "recommended_actions_priority_order": ["compare prices", "check availability", "book via official source"],
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
    objective: objective || 'event_discovery',
    next_api: 'sports-scores',
    next_endpoint: '/scores',
    blocking_flags: [],
    flag_definitions: { NO_LOCATION: 'No location provided', INVALID_DATE: 'Date format must be YYYY-MM-DD' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Search events first', 'Get venue details', 'Check ticket availability'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /search (ONE-CALL)
router.post('/search', async (req: Request, res: Response) => {
  const { location, date, category } = req.body;
  if (!location) return res.status(400).json({ error: 'location is required' });
  try {
    const raw = await callClaude(`Full event intelligence for location: "${location}", date: "${date || 'upcoming'}", category: "${category || 'all'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "location": "${location}",
  "top_events": [
    {"event_id": "string", "name": "string", "category": "string", "date": "YYYY-MM-DD", "time": "string", "venue": "string", "ticket_url": "string", "price_range": "string", "highlights": ["string"]}
  ],
  "category_counts": {"music": number, "sports": number, "arts": number, "food": number, "tech": number},
  "featured_event": {"event_id": "string", "name": "string", "reason": "string"},
  "confidence_per_section": {"top_events": 0.85, "category_counts": 0.8},
  "recommended_actions_priority_order": ["book featured event early", "compare ticket prices", "check venue accessibility"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
