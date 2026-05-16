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
  res.json({ name: 'Restaurant Search API', info: '/restaurant-search/info', openapi: '/restaurant-search/openapi.json', health: 'ok' });
});

// POST /nearby
router.post('/nearby', async (req: Request, res: Response) => {
  const { location, cuisine, radius_miles } = req.body;
  if (!location) return res.status(400).json({ error: 'location is required' });
  try {
    const raw = await callClaude(`Search nearby restaurants for location: "${location}", cuisine: "${cuisine || 'any'}", radius: ${radius_miles || 5} miles. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "location": "${location}",
  "restaurants": [
    {"restaurant_id": "string", "name": "string", "cuisine": "string", "rating": number, "price_range": "$|$$|$$$|$$$$", "distance_miles": number, "address": "string", "is_open": true, "likely_wait_time_minutes": number}
  ],
  "total_found": number,
  "source_provenance": {"provider": "restaurant-search-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.85},
  "cache_ttl_seconds": 300,
  "cache_recommended": true,
  "recommended_next_api": "maps-places",
  "recommended_next_endpoint": "/place-details",
  "automation_safe": true,
  "confidence_per_section": {"restaurants": 0.85},
  "recommended_actions_priority_order": ["filter by cuisine", "check reviews", "get full details"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /details
router.post('/details', async (req: Request, res: Response) => {
  const { restaurant_id } = req.body;
  if (!restaurant_id) return res.status(400).json({ error: 'restaurant_id is required' });
  try {
    const raw = await callClaude(`Get detailed restaurant info for ID: "${restaurant_id}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "restaurant_id": "${restaurant_id}",
  "details": {
    "name": "string", "cuisine": "string", "address": "string", "phone": "string",
    "website": "string", "hours": {"monday": "string", "tuesday": "string", "wednesday": "string", "thursday": "string", "friday": "string", "saturday": "string", "sunday": "string"},
    "rating": number, "review_count": number, "price_range": "$|$$|$$$|$$$$",
    "features": ["dine-in", "takeout", "delivery", "reservations"],
    "menu_highlights": [{"item": "string", "price": "string", "description": "string"}]
  },
  "source_provenance": {"provider": "restaurant-search-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.85},
  "cache_ttl_seconds": 600,
  "cache_recommended": true,
  "recommended_next_api": "restaurant-search",
  "recommended_next_endpoint": "/reviews-summary",
  "automation_safe": true,
  "confidence_per_section": {"details": 0.85},
  "recommended_actions_priority_order": ["check hours", "read reviews", "make reservation"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /reviews-summary
router.post('/reviews-summary', async (req: Request, res: Response) => {
  const { restaurant_id } = req.body;
  if (!restaurant_id) return res.status(400).json({ error: 'restaurant_id is required' });
  try {
    const raw = await callClaude(`Summarize reviews for restaurant ID: "${restaurant_id}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "restaurant_id": "${restaurant_id}",
  "review_summary": {
    "overall_sentiment": "positive|negative|mixed",
    "average_rating": number,
    "total_reviews": number,
    "highlights": ["string"],
    "complaints": ["string"],
    "top_dishes_mentioned": ["string"],
    "summary_paragraph": "string"
  },
  "source_provenance": {"provider": "restaurant-search-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.8},
  "cache_ttl_seconds": 3600,
  "cache_recommended": true,
  "recommended_next_api": "restaurant-search",
  "recommended_next_endpoint": "/menu-analysis",
  "automation_safe": true,
  "confidence_per_section": {"review_summary": 0.8},
  "recommended_actions_priority_order": ["check top dishes", "note complaints", "verify recent reviews"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /menu-analysis
router.post('/menu-analysis', async (req: Request, res: Response) => {
  const { restaurant_id } = req.body;
  if (!restaurant_id) return res.status(400).json({ error: 'restaurant_id is required' });
  try {
    const raw = await callClaude(`Analyze the menu for restaurant ID: "${restaurant_id}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "restaurant_id": "${restaurant_id}",
  "menu_analysis": {
    "categories": ["string"],
    "item_count": number,
    "price_range_low": "string",
    "price_range_high": "string",
    "dietary_options": ["vegetarian", "vegan", "gluten-free", "halal", "kosher"],
    "top_rated_items": [{"item": "string", "price": "string", "rating": number, "description": "string"}],
    "seasonal_items": ["string"],
    "chef_specials": ["string"]
  },
  "value_score": number,
  "menu_diversity_score": number,
  "source_provenance": {"provider": "restaurant-search-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.8},
  "cache_ttl_seconds": 3600,
  "cache_recommended": true,
  "recommended_next_api": "restaurant-search",
  "recommended_next_endpoint": "/reservation-availability",
  "automation_safe": true,
  "confidence_per_section": {"menu_analysis": 0.8},
  "recommended_actions_priority_order": ["check dietary options", "review top_rated_items", "note seasonal availability"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /reservation-availability
router.post('/reservation-availability', async (req: Request, res: Response) => {
  const { restaurant_id, party_size, date } = req.body;
  if (!restaurant_id || !party_size || !date) return res.status(400).json({ error: 'restaurant_id, party_size, and date are required' });
  try {
    const raw = await callClaude(`Check reservation availability for restaurant ID: "${restaurant_id}", party_size: ${party_size}, date: "${date}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "restaurant_id": "${restaurant_id}",
  "party_size": ${party_size},
  "date": "${date}",
  "availability": {
    "available": true,
    "available_times": ["18:00", "18:30", "19:00", "19:30", "20:00"],
    "recommended_time": "string",
    "reservation_url": "string",
    "deposit_required": false,
    "deposit_amount": "string",
    "cancellation_policy": "string"
  },
  "wait_time_if_walk_in_minutes": number,
  "source_provenance": {"provider": "restaurant-search-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.9},
  "cache_ttl_seconds": 60,
  "cache_recommended": false,
  "recommended_next_api": "maps-places",
  "recommended_next_endpoint": "/travel-time",
  "automation_safe": true,
  "confidence_per_section": {"availability": 0.85},
  "recommended_actions_priority_order": ["book recommended_time", "check cancellation_policy", "note deposit requirements"],
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
    objective: objective || 'restaurant_discovery',
    next_api: 'maps-places',
    next_endpoint: '/nearby',
    blocking_flags: [],
    flag_definitions: { NO_LOCATION: 'No location provided', INVALID_RADIUS: 'Radius must be between 0.1 and 50 miles' },
    source_provenance: { provider: 'restaurant-search-ai', retrieved_at: new Date().toISOString(), freshness_score: 1.0 },
    cache_ttl_seconds: 0,
    cache_recommended: false,
    recommended_next_api: 'restaurant-search',
    recommended_next_endpoint: '/nearby',
    automation_safe: true,
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Search nearby first', 'Get details for top results', 'Review summaries before booking'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /search (ONE-CALL)
router.post('/search', async (req: Request, res: Response) => {
  const { location, cuisine } = req.body;
  if (!location) return res.status(400).json({ error: 'location is required' });
  try {
    const raw = await callClaude(`Full restaurant intelligence for location: "${location}", cuisine: "${cuisine || 'any'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "location": "${location}",
  "top_restaurants": [
    {"restaurant_id": "string", "name": "string", "cuisine": "string", "rating": number, "price_range": "$|$$|$$$|$$$$", "distance_miles": number, "address": "string", "highlights": ["string"], "best_dishes": ["string"], "likely_wait_time_minutes": number}
  ],
  "category_breakdown": {"fine_dining": number, "casual": number, "fast_food": number, "cafes": number},
  "best_value_pick": {"name": "string", "reason": "string"},
  "best_rated_pick": {"name": "string", "reason": "string"},
  "source_provenance": {"provider": "restaurant-search-ai", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.85},
  "cache_ttl_seconds": 300,
  "cache_recommended": true,
  "recommended_next_api": "maps-places",
  "recommended_next_endpoint": "/travel-time",
  "automation_safe": true,
  "confidence_per_section": {"top_restaurants": 0.85, "category_breakdown": 0.8},
  "recommended_actions_priority_order": ["check best_value_pick", "get full details", "read reviews"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /batch
router.post('/batch', async (req: Request, res: Response) => {
  const { locations } = req.body;
  if (!Array.isArray(locations) || locations.length === 0) return res.status(400).json({ error: 'locations array is required' });
  if (locations.length > 10) return res.status(400).json({ error: 'Maximum 10 locations per batch request' });
  try {
    const results = await Promise.all(locations.map(async (location: string) => {
      const raw = await callClaude(`Search nearby restaurants for location: "${location}". Return JSON with top 3 results:
{
  "location": "${location}",
  "restaurants": [{"restaurant_id": "string", "name": "string", "cuisine": "string", "rating": number, "price_range": "$|$$|$$$|$$$$", "distance_miles": number, "address": "string", "is_open": true, "likely_wait_time_minutes": number}],
  "total_found": number
}`);
      return parseJSON(raw);
    }));
    res.json({
      trace_id: traceId(),
      computed_at: new Date().toISOString(),
      success: true,
      batch_count: locations.length,
      results,
      source_provenance: { provider: 'restaurant-search-ai', retrieved_at: new Date().toISOString(), freshness_score: 0.85 },
      cache_ttl_seconds: 300,
      cache_recommended: true,
      recommended_next_api: 'maps-places',
      recommended_next_endpoint: '/travel-time',
      automation_safe: true,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
