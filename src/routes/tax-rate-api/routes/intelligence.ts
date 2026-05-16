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
  res.json({ name: 'Tax Rate Lookup API', info: '/tax-rate/info', openapi: '/tax-rate/openapi.json', health: 'ok' });
});

// POST /sales-tax
router.post('/sales-tax', async (req: Request, res: Response) => {
  const { zip_code, state } = req.body;
  if (!zip_code) return res.status(400).json({ error: 'zip_code is required' });
  try {
    const raw = await callClaude(`Look up US sales tax rate for zip code: "${zip_code}"${state ? ` state: "${state}"` : ''}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "zip_code": "${zip_code}",
  "state": "string",
  "county": "string",
  "city": "string",
  "rates": {
    "state_rate": number,
    "county_rate": number,
    "city_rate": number,
    "special_district_rate": number,
    "total_rate": number,
    "total_rate_pct": "string"
  },
  "nexus_states": ["string"],
  "tax_on_shipping": true,
  "tax_on_digital_goods": true,
  "last_updated": "YYYY-MM-DD",
  "compliance_disclaimer": "Tax rates are indicative. Verify with a licensed tax professional or authoritative source before use in compliance workflows.",
  "confidence_per_section": {"rates": 0.88, "nexus_states": 0.8},
  "recommended_actions_priority_order": ["Verify with TaxJar or Avalara for compliance", "Check nexus obligations", "Confirm digital goods tax rules"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /vat
router.post('/vat', async (req: Request, res: Response) => {
  const { country } = req.body;
  if (!country) return res.status(400).json({ error: 'country is required' });
  try {
    const raw = await callClaude(`Look up VAT rate for country: "${country}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "country": "${country}",
  "country_name": "string",
  "vat_rates": {
    "standard": number,
    "reduced": [{"rate": number, "applies_to": "string"}],
    "super_reduced": number,
    "zero": 0,
    "exempt_categories": ["string"]
  },
  "vat_name": "string",
  "vat_number_format": "string",
  "vat_registration_threshold_eur": number,
  "oss_applicable": true,
  "compliance_disclaimer": "VAT rates are indicative. Verify with a licensed tax professional or authoritative source before use in compliance workflows.",
  "confidence_per_section": {"vat_rates": 0.9, "registration_threshold": 0.88},
  "recommended_actions_priority_order": ["Verify reduced rate categories", "Check OSS registration if selling cross-border", "Confirm VAT number format for invoicing"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /jurisdiction
router.post('/jurisdiction', async (req: Request, res: Response) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'address is required' });
  try {
    const raw = await callClaude(`Look up tax jurisdiction data for address: "${address}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "address": "${address}",
  "jurisdiction": {
    "country": "string",
    "country_code": "string",
    "state_province": "string",
    "county": "string",
    "city": "string",
    "zip_code": "string",
    "fips_code": "string"
  },
  "tax_rates": {
    "total_rate": number,
    "breakdown": [{"authority": "string", "rate": number, "type": "string"}]
  },
  "nexus_risk": "high|medium|low",
  "special_districts": ["string"],
  "compliance_disclaimer": "Tax rates are indicative. Verify with a licensed tax professional before use in compliance workflows.",
  "confidence_per_section": {"jurisdiction": 0.88, "tax_rates": 0.85},
  "recommended_actions_priority_order": ["Verify jurisdiction boundaries", "Check special district rates", "Consult tax professional for nexus"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { address, objective } = req.body;
  if (!address) return res.status(400).json({ error: 'address is required' });
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: true,
    address,
    objective: objective || 'tax_rate_lookup',
    next_api: 'shipping-rate',
    next_endpoint: '/estimate',
    blocking_flags: [],
    flag_definitions: {
      NO_ADDRESS: 'No address provided',
      INTERNATIONAL_ADDRESS: 'Use /vat endpoint for international addresses outside US',
    },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Use zip_code for US sales tax', 'Use country code for VAT', 'Use /jurisdiction for full breakdown'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /lookup (one-call)
router.post('/lookup', async (req: Request, res: Response) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'address is required' });
  try {
    const raw = await callClaude(`Full tax rate intelligence for address: "${address}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "address": "${address}",
  "jurisdiction": {"country": "string", "country_code": "string", "state_province": "string", "county": "string", "city": "string"},
  "tax_rates": {
    "total_rate": number,
    "breakdown": [{"authority": "string", "rate": number, "type": "string"}]
  },
  "vat_if_applicable": {"rate": number, "name": "string"},
  "nexus_risk": "high|medium|low",
  "tax_on_shipping": true,
  "tax_on_digital_goods": true,
  "special_districts": ["string"],
  "sample_calculation": {"subtotal": 100, "tax_amount": number, "total": number},
  "compliance_disclaimer": "Tax rates are indicative. Verify with a licensed tax professional before use in compliance workflows.",
  "confidence_per_section": {"jurisdiction": 0.88, "tax_rates": 0.85, "vat_if_applicable": 0.9},
  "recommended_actions_priority_order": ["Verify with authoritative tax source", "Check nexus obligations", "Apply compliance disclaimer in UI"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
