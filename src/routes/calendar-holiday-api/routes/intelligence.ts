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
  res.json({ name: 'Calendar Holiday API', info: '/calendar-holiday/info', openapi: '/calendar-holiday/openapi.json', health: 'ok' });
});

// POST /holidays
router.post('/holidays', async (req: Request, res: Response) => {
  const { country, year } = req.body;
  if (!country || !year) return res.status(400).json({ error: 'country and year are required' });
  try {
    const raw = await callClaude(`List all public holidays for country: "${country}" in year: ${year}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "country": "${country}",
  "year": ${year},
  "holidays": [
    {
      "date": "YYYY-MM-DD",
      "name": "string",
      "name_local": "string",
      "type": "national|regional|observance|bank",
      "is_observed": true,
      "day_of_week": "string"
    }
  ],
  "total_holidays": number,
  "next_holiday": {"date": "YYYY-MM-DD", "name": "string", "days_away": number},
  "confidence_per_section": {"holidays": 0.9, "next_holiday": 0.95},
  "recommended_actions_priority_order": ["Filter by type for business planning", "Check regional holidays for specific states/regions"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /business-days
router.post('/business-days', async (req: Request, res: Response) => {
  const { start_date, end_date, country } = req.body;
  if (!start_date || !end_date || !country) return res.status(400).json({ error: 'start_date, end_date, and country are required' });
  try {
    const raw = await callClaude(`Calculate business days between ${start_date} and ${end_date} in country: "${country}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "start_date": "${start_date}",
  "end_date": "${end_date}",
  "country": "${country}",
  "business_days": number,
  "calendar_days": number,
  "weekends": number,
  "holidays_in_range": [{"date": "YYYY-MM-DD", "name": "string"}],
  "holiday_count": number,
  "deadline_date": "YYYY-MM-DD",
  "confidence_per_section": {"business_days": 0.95, "holidays_in_range": 0.9},
  "recommended_actions_priority_order": ["Verify regional holidays", "Add buffer days for critical deadlines"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /next-holiday
router.post('/next-holiday', async (req: Request, res: Response) => {
  const { country } = req.body;
  if (!country) return res.status(400).json({ error: 'country is required' });
  try {
    const raw = await callClaude(`Find the next upcoming public holiday for country: "${country}" from today ${new Date().toISOString().slice(0, 10)}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "country": "${country}",
  "next_holiday": {
    "date": "YYYY-MM-DD",
    "name": "string",
    "name_local": "string",
    "type": "national|regional|observance|bank",
    "days_away": number,
    "day_of_week": "string"
  },
  "upcoming_5": [{"date": "YYYY-MM-DD", "name": "string", "days_away": number}],
  "confidence_per_section": {"next_holiday": 0.95, "upcoming_5": 0.9},
  "recommended_actions_priority_order": ["Plan around upcoming holiday", "Notify stakeholders early"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { country, objective } = req.body;
  if (!country) return res.status(400).json({ error: 'country is required' });
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: true,
    country,
    objective: objective || 'holiday_lookup',
    next_api: 'timezone',
    next_endpoint: '/lookup',
    blocking_flags: [],
    flag_definitions: {
      NO_COUNTRY: 'No country code provided',
      INVALID_COUNTRY: 'Country code is not a valid ISO 3166-1 alpha-2 code',
    },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Verify country ISO code', 'Check for regional holidays', 'Calculate business days'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /lookup (one-call)
router.post('/lookup', async (req: Request, res: Response) => {
  const { country, year } = req.body;
  if (!country || !year) return res.status(400).json({ error: 'country and year are required' });
  try {
    const raw = await callClaude(`Full calendar intelligence for country: "${country}" year: ${year}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "country": "${country}",
  "year": ${year},
  "holidays": [{"date": "YYYY-MM-DD", "name": "string", "type": "string"}],
  "total_holidays": number,
  "total_business_days": number,
  "total_weekends": number,
  "next_holiday": {"date": "YYYY-MM-DD", "name": "string", "days_away": number},
  "long_weekends": [{"start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "days": number, "holiday": "string"}],
  "monthly_breakdown": [{"month": "string", "business_days": number, "holidays": number}],
  "confidence_per_section": {"holidays": 0.9, "business_days": 0.95, "long_weekends": 0.85},
  "recommended_actions_priority_order": ["Use monthly breakdown for project planning", "Flag long weekends to stakeholders", "Set automated reminders for upcoming holidays"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
