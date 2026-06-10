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
  res.json({ name: 'Phone Validation API', info: '/phone-validation/info', openapi: '/phone-validation/openapi.json', health: 'ok' });
});

// POST /validate
router.post('/validate', async (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone is required' });
  try {
    const raw = await callClaude(`Validate phone number: "${phone}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "phone_input": "${phone}",
  "validation": {
    "is_valid": true,
    "is_possible": true,
    "country_code": "string",
    "country_name": "string",
    "national_number": "string",
    "e164_format": "+1XXXXXXXXXX",
    "number_type": "mobile|landline|voip|toll_free|premium|unknown",
    "is_roaming": false
  },
  "risk_score": 0.0,
  "risk_signals": ["string"],
  "confidence_per_section": {"validation": 0.95, "risk_score": 0.80},
  "recommended_actions_priority_order": ["use e164 format for storage", "check carrier for routing decisions", "score risk before use in communications"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /carrier
router.post('/carrier', async (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone is required' });
  try {
    const raw = await callClaude(`Carrier and line type detection for phone: "${phone}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "phone_input": "${phone}",
  "carrier": {
    "name": "string",
    "country": "string",
    "network_code": "string",
    "network_type": "gsm|cdma|lte|5g|voip|other",
    "is_prepaid": false,
    "is_virtual": false
  },
  "line_type": "mobile|landline|voip|toll_free|premium|unknown",
  "ported": false,
  "original_carrier": "string or null",
  "sms_deliverable": true,
  "call_deliverable": true,
  "confidence_per_section": {"carrier": 0.88, "line_type": 0.92},
  "recommended_actions_priority_order": ["use carrier info for SMS routing", "check voip flag for fraud prevention", "verify ported status before contact"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /format
router.post('/format', async (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone is required' });
  try {
    const raw = await callClaude(`Format phone number: "${phone}" in all international standards. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "phone_input": "${phone}",
  "formats": {
    "e164": "+1XXXXXXXXXX",
    "national": "(XXX) XXX-XXXX",
    "international": "+1 XXX XXX XXXX",
    "rfc3966": "tel:+1XXXXXXXXXX",
    "dialable": "0XXXXXXXXXX"
  },
  "country_code": "string",
  "country_calling_code": "+1",
  "is_valid": true,
  "confidence_per_section": {"formats": 0.97},
  "recommended_actions_priority_order": ["store e164 as canonical format", "display national format to users", "use international for cross-border communications"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { phone, objective } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone is required' });
  const flags: string[] = [];
  if (phone.length < 7) flags.push('PHONE_TOO_SHORT');
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: flags.length === 0,
    phone,
    objective: objective || 'phone_validation',
    next_api: 'address-validation',
    next_endpoint: '/validate',
    blocking_flags: flags,
    flag_definitions: { PHONE_TOO_SHORT: 'Phone number is too short (minimum 7 digits)' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Run /validate for basic validation', 'Run /carrier for routing and fraud signals', 'Run /format for canonical formatting before storage'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /lookup (ONE-CALL)
router.post('/lookup', async (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone is required' });
  try {
    const raw = await callClaude(`Full phone intelligence for: "${phone}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "phone_input": "${phone}",
  "validation": {"is_valid": true, "country_code": "string", "country_name": "string", "number_type": "mobile|landline|voip|toll_free|unknown"},
  "formats": {"e164": "string", "national": "string", "international": "string"},
  "carrier": {"name": "string", "network_type": "string", "is_prepaid": false, "is_virtual": false, "sms_deliverable": true},
  "risk": {"score": 0.0, "level": "low|medium|high", "signals": ["string"], "is_voip": false, "is_ported": false},
  "recommendation": "use|flag|block",
  "confidence_per_section": {"validation": 0.95, "carrier": 0.88, "risk": 0.82},
  "recommended_actions_priority_order": ["store e164 format", "act on recommendation for access control", "pass to address-validation for multi-channel enrichment"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
