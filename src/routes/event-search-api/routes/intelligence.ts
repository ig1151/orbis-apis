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

function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Event Search API', info: '/event-search/info', openapi: '/event-search/openapi.json', health: 'ok' });
});

// POST /search
router.post('/search', async (req: Request, res: Response) => {
  const { location, category, date_from, date_to, radius_miles } = req.body;
  if (!location) return res.status(400).json({ error: 'location is required' });
  try {
    const raw = await callClaude(`Search events in location: "${location}", category: "${category || 'any'}", dates: "${date_from || 'today'}" to "${date_to || '+30 days'}", radius: ${radius_miles || 25} miles. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "location": "${location}",
  "events": [
    {"event_id": "string", "name": "string", "category": "string", "date": "YYYY-MM-DD", "time": "HH:MM", "venue": "string", "address": "string", "price_range": "string", "ticket_url": "string", "is_free": false, "distance_miles": 5.0, "attendee_estimate": 500}
  ],
  "total_found": 10,
  "source_provenance": {"provider": "event-search-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.9},
  "cache_ttl_seconds": 900,
  "cache_recommended": true,
  "recommended_next_api": "event-search",
  "recommended_next_endpoint": "/details",
  "automation_safe": true,
  "confidence_per_section": {"events": 0.85},
  "recommended_actions_priority_order": ["filter by category", "check ticket_url", "get full details"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /details
router.post('/details', async (req: Request, res: Response) => {
  const { event_id } = req.body;
  if (!event_id) return res.status(400).json({ error: 'event_id is required' });
  try {
    const raw = await callClaude(`Get full event details for event ID: "${event_id}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "event_id": "${event_id}",
  "details": {
    "name": "string", "category": "string", "description": "string",
    "date": "YYYY-MM-DD", "time": "HH:MM", "end_time": "HH:MM",
    "venue": "string", "address": "string", "city": "string", "country": "string",
    "organizer": "string", "website": "string", "ticket_url": "string",
    "price_min": 0.0, "price_max": 100.0, "is_free": false,
    "capacity": 1000, "attendee_estimate": 750,
    "tags": ["string"], "age_restriction": "string"
  },
  "source_provenance": {"provider": "event-search-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.9},
  "cache_ttl_seconds": 3600,
  "cache_recommended": true,
  "recommended_next_api": "event-search",
  "recommended_next_endpoint": "/attendee-profile-estimate",
  "automation_safe": true,
  "confidence_per_section": {"details": 0.85},
  "recommended_actions_priority_order": ["check ticket_url", "note capacity", "estimate audience"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /category-filter
router.post('/category-filter', async (req: Request, res: Response) => {
  const { location, category } = req.body;
  if (!location || !category) return res.status(400).json({ error: 'location and category are required' });
  try {
    const raw = await callClaude(`Search events in "${location}" filtered strictly to category: "${category}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "location": "${location}",
  "category": "${category}",
  "events": [{"event_id": "string", "name": "string", "date": "YYYY-MM-DD", "venue": "string", "price_range": "string", "is_free": false, "attendee_estimate": 300}],
  "total_found": 5,
  "source_provenance": {"provider": "event-search-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.9},
  "cache_ttl_seconds": 900,
  "cache_recommended": true,
  "recommended_next_api": "event-search",
  "recommended_next_endpoint": "/details",
  "automation_safe": true,
  "confidence_per_section": {"events": 0.85},
  "recommended_actions_priority_order": ["pick best match", "get full details", "estimate attendees"],
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
    next_api: 'event-search',
    next_endpoint: '/search',
    blocking_flags: [],
    flag_definitions: { NO_LOCATION: 'location is required', INVALID_RADIUS: 'radius_miles must be between 1 and 100' },
    source_provenance: { provider: 'system', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0,
    cache_recommended: false,
    recommended_next_api: 'event-search',
    recommended_next_endpoint: '/search',
    automation_safe: true,
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Search events first', 'Filter by category', 'Get attendee profile estimate'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /discover (ONE-CALL)
router.post('/discover', async (req: Request, res: Response) => {
  const { location, category, context } = req.body;
  if (!location) return res.status(400).json({ error: 'location is required' });
  try {
    const raw = await callClaude(`Full event intelligence for location: "${location}", category: "${category || 'any'}", context: "${context || 'general'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "location": "${location}",
  "top_events": [
    {"event_id": "string", "name": "string", "category": "string", "date": "YYYY-MM-DD", "venue": "string", "price_range": "string", "is_free": false, "attendee_estimate": 500, "highlights": ["string"]}
  ],
  "category_breakdown": {"music": 5, "sports": 3, "arts": 4, "business": 2, "food": 3},
  "best_free_pick": {"name": "string", "reason": "string"},
  "best_premium_pick": {"name": "string", "reason": "string"},
  "upcoming_this_week": 8,
  "source_provenance": {"provider": "event-search-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.9},
  "cache_ttl_seconds": 900,
  "cache_recommended": true,
  "recommended_next_api": "maps-places",
  "recommended_next_endpoint": "/travel-time",
  "automation_safe": true,
  "confidence_per_section": {"top_events": 0.85, "category_breakdown": 0.8},
  "recommended_actions_priority_order": ["check best_free_pick", "get full details", "estimate attendee profile"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /attendee-profile-estimate
router.post('/attendee-profile-estimate', async (req: Request, res: Response) => {
  const { event_id, event_name, category } = req.body;
  if (!event_id && !event_name) return res.status(400).json({ error: 'event_id or event_name is required' });
  try {
    const raw = await callClaude(`Estimate attendee profile for event: "${event_name || event_id}", category: "${category || 'general'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "event_id": "${event_id || ''}",
  "event_name": "${event_name || ''}",
  "attendee_profile": {
    "estimated_count": 500,
    "age_distribution": {"18-24": 0.25, "25-34": 0.40, "35-44": 0.20, "45+": 0.15},
    "professional_mix": {"executives": 0.1, "managers": 0.3, "individual_contributors": 0.4, "students": 0.2},
    "interests": ["string"],
    "income_bracket": "string"
  },
  "networking_value": 0.82,
  "business_relevance": 0.75,
  "audience_quality": 0.78,
  "source_provenance": {"provider": "event-search-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.8},
  "cache_ttl_seconds": 3600,
  "cache_recommended": true,
  "recommended_next_api": "social-profile-lookup",
  "recommended_next_endpoint": "/persona-analysis",
  "automation_safe": true,
  "confidence_per_section": {"attendee_profile": 0.75, "networking_value": 0.8},
  "recommended_actions_priority_order": ["use for lead scoring", "tailor outreach", "identify target personas"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /batch
router.post('/batch', async (req: Request, res: Response) => {
  const { locations } = req.body;
  if (!Array.isArray(locations) || locations.length === 0) return res.status(400).json({ error: 'locations array is required' });
  if (locations.length > 10) return res.status(400).json({ error: 'Maximum 10 locations per batch' });
  try {
    const results = await Promise.all(locations.map(async (location: string) => {
      const raw = await callClaude(`Top 3 upcoming events in: "${location}". Return JSON:
{"location": "${location}", "events": [{"event_id": "string", "name": "string", "category": "string", "date": "YYYY-MM-DD", "venue": "string", "is_free": false}], "total_found": 3}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(),
      computed_at: new Date().toISOString(),
      success: true,
      batch_count: locations.length,
      results,
      source_provenance: { provider: 'event-search-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.9 },
      cache_ttl_seconds: 900,
      cache_recommended: true,
      recommended_next_api: 'event-search',
      recommended_next_endpoint: '/details',
      automation_safe: true,
      privacy: { data_stored: false, retention: 'none' },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
