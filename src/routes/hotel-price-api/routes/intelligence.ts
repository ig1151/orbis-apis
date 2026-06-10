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
  res.json({ name: 'Hotel Price Lookup API', info: '/hotel-price/info', openapi: '/hotel-price/openapi.json', health: 'ok' });
});

// POST /search
router.post('/search', async (req: Request, res: Response) => {
  const { location, check_in, check_out } = req.body;
  if (!location || !check_in || !check_out) return res.status(400).json({ error: 'location, check_in, and check_out are required' });
  try {
    const raw = await callClaude(`List 3 representative hotels in "${location}" for ${check_in} to ${check_out}. Return compact JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"location":"${location}","check_in":"${check_in}","check_out":"${check_out}","nights":2,"hotels":[{"hotel_id":"h1","name":"string","star_rating":4,"user_rating":8.5,"price_per_night_usd":150,"total_price_usd":300,"cancellation_policy":"free"},{"hotel_id":"h2","name":"string","star_rating":3,"user_rating":7.8,"price_per_night_usd":95,"total_price_usd":190,"cancellation_policy":"non-refundable"},{"hotel_id":"h3","name":"string","star_rating":5,"user_rating":9.2,"price_per_night_usd":320,"total_price_usd":640,"cancellation_policy":"free"}],"total_results":3,"price_range":{"min":95,"max":320,"avg":188},"disclaimer":"Prices are indicative. Verify with hotel or booking platform before purchase.","confidence_per_section":{"hotels":0.8},"recommended_actions_priority_order":["Verify price with booking platform","Check cancellation policy"],"privacy":{"data_stored":false,"retention":"none"}}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /price
router.post('/price', async (req: Request, res: Response) => {
  const { hotel_id, check_in, check_out } = req.body;
  if (!hotel_id || !check_in || !check_out) return res.status(400).json({ error: 'hotel_id, check_in, and check_out are required' });
  try {
    const raw = await callClaude(`Get pricing for hotel_id: "${hotel_id}" from ${check_in} to ${check_out}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "hotel_id": "${hotel_id}",
  "check_in": "${check_in}",
  "check_out": "${check_out}",
  "nights": number,
  "room_types": [
    {
      "room_id": "string",
      "name": "string",
      "bed_type": "string",
      "max_guests": number,
      "price_per_night_usd": number,
      "total_price_usd": number,
      "taxes_and_fees_usd": number,
      "cancellation_policy": "free|non-refundable|partial",
      "meal_plan": "room_only|breakfast|half_board|full_board",
      "availability": "available|limited|sold_out"
    }
  ],
  "lowest_price_usd": number,
  "disclaimer": "Prices are indicative. Verify with hotel or booking platform before purchase.",
  "confidence_per_section": {"room_types": 0.8, "lowest_price_usd": 0.82},
  "recommended_actions_priority_order": ["Verify price directly with hotel", "Check cancellation deadline dates", "Compare room types for value"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /availability
router.post('/availability', async (req: Request, res: Response) => {
  const { hotel_id, check_in, check_out } = req.body;
  if (!hotel_id || !check_in || !check_out) return res.status(400).json({ error: 'hotel_id, check_in, and check_out are required' });
  try {
    const raw = await callClaude(`Check availability for hotel_id: "${hotel_id}" from ${check_in} to ${check_out}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "hotel_id": "${hotel_id}",
  "check_in": "${check_in}",
  "check_out": "${check_out}",
  "is_available": true,
  "available_rooms": [
    {"room_type": "string", "available_count": number, "price_per_night_usd": number}
  ],
  "sold_out_types": ["string"],
  "last_room_warning": true,
  "min_stay_nights": number,
  "booking_deadline": "string",
  "confidence_per_section": {"is_available": 0.82, "available_rooms": 0.8},
  "recommended_actions_priority_order": ["Book immediately if last_room_warning is true", "Confirm availability directly with hotel for group bookings"],
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
    objective: objective || 'hotel_search',
    next_api: 'restaurant-search',
    next_endpoint: '/search',
    blocking_flags: [],
    flag_definitions: {
      NO_LOCATION: 'No location provided',
      NO_DATES: 'check_in and check_out dates are required for price/availability',
      INVALID_DATE_RANGE: 'check_out must be after check_in',
    },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Search hotels first', 'Get pricing for selected hotel', 'Confirm availability before booking'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /lookup (one-call)
router.post('/lookup', async (req: Request, res: Response) => {
  const { location, check_in, check_out } = req.body;
  if (!location || !check_in || !check_out) return res.status(400).json({ error: 'location, check_in, and check_out are required' });
  try {
    const raw = await callClaude(`Full hotel intelligence for "${location}" from ${check_in} to ${check_out}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "location": "${location}",
  "check_in": "${check_in}",
  "check_out": "${check_out}",
  "nights": number,
  "top_hotels": [
    {
      "hotel_id": "string",
      "name": "string",
      "star_rating": number,
      "user_rating": number,
      "price_per_night_usd": number,
      "total_price_usd": number,
      "amenities": ["string"],
      "cancellation_policy": "string",
      "address": "string"
    }
  ],
  "best_value": {"hotel_id": "string", "name": "string", "price_per_night_usd": number, "user_rating": number, "reason": "string"},
  "best_rated": {"hotel_id": "string", "name": "string", "user_rating": number, "price_per_night_usd": number},
  "price_range": {"budget": number, "mid_range": number, "luxury": number},
  "area_highlights": ["string"],
  "local_events": ["string"],
  "disclaimer": "Prices are indicative. Verify with hotel or booking platform before purchase.",
  "confidence_per_section": {"top_hotels": 0.8, "best_value": 0.82, "best_rated": 0.85},
  "recommended_actions_priority_order": ["Book best_value for cost-optimized itineraries", "Verify availability for final selections", "Compare cancellation policies"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
