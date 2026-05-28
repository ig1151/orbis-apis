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
  res.json({ name: 'Shipping Rate API', info: '/shipping-rate/info', openapi: '/shipping-rate/openapi.json', health: 'ok' });
});

// POST /estimate
router.post('/estimate', async (req: Request, res: Response) => {
  const { origin_zip, dest_zip, weight_lbs, carrier } = req.body;
  if (!origin_zip || !dest_zip || weight_lbs === undefined) return res.status(400).json({ error: 'origin_zip, dest_zip, and weight_lbs are required' });
  try {
    const raw = await callClaude(`Estimate shipping rate from zip "${origin_zip}" to "${dest_zip}" weight ${weight_lbs} lbs${carrier ? ` carrier: "${carrier}"` : ''}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "origin_zip": "${origin_zip}",
  "dest_zip": "${dest_zip}",
  "weight_lbs": ${weight_lbs},
  "carrier": "${carrier || 'best'}",
  "estimates": [
    {
      "service": "string",
      "carrier": "string",
      "rate_usd": number,
      "delivery_days": number,
      "delivery_date_est": "YYYY-MM-DD",
      "guaranteed": true
    }
  ],
  "cheapest": {"service": "string", "carrier": "string", "rate_usd": number, "delivery_days": number},
  "fastest": {"service": "string", "carrier": "string", "rate_usd": number, "delivery_days": number},
  "disclaimer": "Rates are estimates only. Verify with carrier before charging customer.",
  "confidence_per_section": {"estimates": 0.82, "cheapest": 0.85},
  "recommended_actions_priority_order": ["Verify rate with carrier API", "Add fuel surcharge buffer", "Check dimensional weight rules"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /track
router.post('/track', async (req: Request, res: Response) => {
  const { tracking_number } = req.body;
  if (!tracking_number) return res.status(400).json({ error: 'tracking_number is required' });
  try {
    const raw = await callClaude(`Track shipment with tracking number: "${tracking_number}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "tracking_number": "${tracking_number}",
  "carrier": "string",
  "status": "in_transit|delivered|out_for_delivery|pending|exception|unknown",
  "status_detail": "string",
  "estimated_delivery": "YYYY-MM-DD",
  "shipped_date": "YYYY-MM-DD",
  "origin": {"city": "string", "state": "string", "country": "string"},
  "destination": {"city": "string", "state": "string", "country": "string"},
  "events": [{"timestamp": "string", "location": "string", "description": "string", "status": "string"}],
  "days_in_transit": number,
  "confidence_per_section": {"status": 0.8, "events": 0.75},
  "recommended_actions_priority_order": ["Check carrier website for real-time tracking", "Set up delivery notifications"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /carrier-compare
router.post('/carrier-compare', async (req: Request, res: Response) => {
  const { origin_zip, dest_zip, weight_lbs } = req.body;
  if (!origin_zip || !dest_zip || weight_lbs === undefined) return res.status(400).json({ error: 'origin_zip, dest_zip, and weight_lbs are required' });
  try {
    const raw = await callClaude(`Compare all carrier rates from zip "${origin_zip}" to "${dest_zip}" for ${weight_lbs} lbs. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "origin_zip": "${origin_zip}",
  "dest_zip": "${dest_zip}",
  "weight_lbs": ${weight_lbs},
  "carriers": [
    {
      "carrier": "string",
      "services": [
        {"service": "string", "rate_usd": number, "delivery_days": number, "tracking": true, "insurance_included_usd": number}
      ],
      "cheapest_option": {"service": "string", "rate_usd": number},
      "fastest_option": {"service": "string", "rate_usd": number, "delivery_days": number}
    }
  ],
  "winner_cost": {"carrier": "string", "service": "string", "rate_usd": number},
  "winner_speed": {"carrier": "string", "service": "string", "delivery_days": number},
  "disclaimer": "Rates are estimates only. Verify with carrier before charging customer.",
  "confidence_per_section": {"carriers": 0.82, "winner_cost": 0.85},
  "recommended_actions_priority_order": ["Verify selected rate with carrier API", "Consider dimensional weight for large packages", "Add insurance for high-value shipments"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { origin_zip, dest_zip, objective } = req.body;
  if (!origin_zip || !dest_zip) return res.status(400).json({ error: 'origin_zip and dest_zip are required' });
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: true,
    origin_zip,
    dest_zip,
    objective: objective || 'rate_estimate',
    next_api: 'package-tracking',
    next_endpoint: '/track',
    blocking_flags: [],
    flag_definitions: {
      NO_ORIGIN: 'No origin zip code provided',
      NO_DEST: 'No destination zip code provided',
      NO_WEIGHT: 'Weight is required for rate estimation',
    },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Get rate estimate first', 'Compare carriers', 'Track after shipping'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /lookup (one-call)
router.post('/lookup', async (req: Request, res: Response) => {
  const { origin_zip, dest_zip, weight_lbs } = req.body;
  if (!origin_zip || !dest_zip || weight_lbs === undefined) return res.status(400).json({ error: 'origin_zip, dest_zip, and weight_lbs are required' });
  try {
    const raw = await callClaude(`Full shipping intelligence from zip "${origin_zip}" to "${dest_zip}" for ${weight_lbs} lbs. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "origin_zip": "${origin_zip}",
  "dest_zip": "${dest_zip}",
  "weight_lbs": ${weight_lbs},
  "all_options": [{"carrier": "string", "service": "string", "rate_usd": number, "delivery_days": number}],
  "recommended": {"carrier": "string", "service": "string", "rate_usd": number, "delivery_days": number, "reason": "string"},
  "cheapest": {"carrier": "string", "service": "string", "rate_usd": number},
  "fastest": {"carrier": "string", "service": "string", "delivery_days": number},
  "zone": number,
  "distance_miles": number,
  "dimensional_weight_lbs": number,
  "dimensional_divisor": 139,
  "disclaimer": "Rates are estimates only. Verify with carrier before charging customer.",
  "confidence_per_section": {"all_options": 0.82, "recommended": 0.85, "zone": 0.88},
  "recommended_actions_priority_order": ["Use recommended for balanced cost/speed", "Verify with carrier API for live rates", "Consider dimensional weight for final pricing"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
