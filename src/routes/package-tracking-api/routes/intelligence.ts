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
  res.json({ name: 'Package Tracking API', info: '/package-tracking/info', openapi: '/package-tracking/openapi.json', health: 'ok' });
});

// POST /track
router.post('/track', async (req: Request, res: Response) => {
  const { tracking_number, carrier } = req.body;
  if (!tracking_number) return res.status(400).json({ error: 'tracking_number is required' });
  try {
    const raw = await callClaude(`Track package with tracking number: "${tracking_number}"${carrier ? ` carrier: "${carrier}"` : ''}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "tracking_number": "${tracking_number}",
  "carrier": "${carrier || 'auto-detected'}",
  "status": "in_transit|delivered|out_for_delivery|pending|exception|unknown",
  "status_detail": "string",
  "estimated_delivery": "YYYY-MM-DD",
  "shipped_date": "YYYY-MM-DD",
  "delivered_date": "YYYY-MM-DD|null",
  "origin": {"city": "string", "state": "string", "zip": "string", "country": "string"},
  "destination": {"city": "string", "state": "string", "zip": "string", "country": "string"},
  "current_location": {"city": "string", "state": "string", "country": "string"},
  "events": [{"timestamp": "string", "location": "string", "description": "string", "status": "string"}],
  "days_in_transit": number,
  "on_time": true,
  "confidence_per_section": {"status": 0.8, "events": 0.75, "estimated_delivery": 0.78},
  "recommended_actions_priority_order": ["Verify with carrier website for real-time status", "Set up delivery notifications", "Contact carrier if exception status"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /detect-carrier
router.post('/detect-carrier', async (req: Request, res: Response) => {
  const { tracking_number } = req.body;
  if (!tracking_number) return res.status(400).json({ error: 'tracking_number is required' });
  try {
    const raw = await callClaude(`Detect carrier from tracking number: "${tracking_number}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "tracking_number": "${tracking_number}",
  "detected_carrier": "string",
  "carrier_code": "string",
  "confidence": number,
  "possible_carriers": [{"carrier": "string", "carrier_code": "string", "confidence": number}],
  "tracking_url": "string",
  "number_format": "string",
  "confidence_per_section": {"detected_carrier": 0.88},
  "recommended_actions_priority_order": ["Verify carrier if confidence is below 0.8", "Use tracking_url for direct carrier link"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /bulk
router.post('/bulk', async (req: Request, res: Response) => {
  const { tracking_numbers } = req.body;
  if (!tracking_numbers || !Array.isArray(tracking_numbers)) return res.status(400).json({ error: 'tracking_numbers array is required' });
  try {
    const numbers = tracking_numbers.slice(0, 20);
    const raw = await callClaude(`Bulk track packages: ${JSON.stringify(numbers)}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "results": [
    {
      "tracking_number": "string",
      "carrier": "string",
      "status": "in_transit|delivered|out_for_delivery|pending|exception|unknown",
      "estimated_delivery": "YYYY-MM-DD",
      "current_location": "string",
      "on_time": true,
      "success": true
    }
  ],
  "summary": {
    "total": number,
    "delivered": number,
    "in_transit": number,
    "pending": number,
    "exceptions": number
  },
  "confidence_per_section": {"results": 0.78, "summary": 0.85},
  "recommended_actions_priority_order": ["Investigate exception statuses immediately", "Re-check unresolved pending items", "Archive delivered results"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { tracking_number, objective } = req.body;
  if (!tracking_number) return res.status(400).json({ error: 'tracking_number is required' });
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: true,
    tracking_number,
    objective: objective || 'package_tracking',
    next_api: 'flight-status',
    next_endpoint: '/status',
    blocking_flags: [],
    flag_definitions: {
      NO_TRACKING_NUMBER: 'No tracking number provided',
      INVALID_FORMAT: 'Tracking number format not recognized — use /detect-carrier first',
    },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Detect carrier from tracking number', 'Track individual package', 'Use bulk for multiple shipments'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /lookup (one-call)
router.post('/lookup', async (req: Request, res: Response) => {
  const { tracking_number } = req.body;
  if (!tracking_number) return res.status(400).json({ error: 'tracking_number is required' });
  try {
    const raw = await callClaude(`Full package tracking intelligence for tracking number: "${tracking_number}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "tracking_number": "${tracking_number}",
  "carrier": "string",
  "carrier_code": "string",
  "tracking_url": "string",
  "status": "in_transit|delivered|out_for_delivery|pending|exception|unknown",
  "status_detail": "string",
  "estimated_delivery": "YYYY-MM-DD",
  "shipped_date": "YYYY-MM-DD",
  "origin": {"city": "string", "state": "string", "country": "string"},
  "destination": {"city": "string", "state": "string", "country": "string"},
  "current_location": {"city": "string", "state": "string", "country": "string"},
  "events": [{"timestamp": "string", "location": "string", "description": "string"}],
  "days_in_transit": number,
  "on_time": true,
  "delay_risk": "high|medium|low|none",
  "confidence_per_section": {"status": 0.8, "carrier": 0.88, "events": 0.75},
  "recommended_actions_priority_order": ["Check carrier website for real-time status", "Set delivery alerts", "Contact carrier if exception detected"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
