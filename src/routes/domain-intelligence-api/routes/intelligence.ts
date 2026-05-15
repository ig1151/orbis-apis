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
  res.json({ name: 'Domain Intelligence API', info: '/domain-intelligence/info', openapi: '/domain-intelligence/openapi.json', health: 'ok' });
});

// POST /whois
router.post('/whois', async (req: Request, res: Response) => {
  const { domain } = req.body;
  if (!domain) return res.status(400).json({ error: 'domain is required' });
  try {
    const raw = await callClaude(`WHOIS lookup for domain: "${domain}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "domain": "${domain}",
  "whois": {
    "registrar": "string",
    "registered_on": "YYYY-MM-DD",
    "expires_on": "YYYY-MM-DD",
    "updated_on": "YYYY-MM-DD",
    "name_servers": ["string"],
    "status": ["clientTransferProhibited"],
    "registrant_country": "string",
    "registrant_org": "string or null",
    "dnssec": "signedDelegation|unsigned"
  },
  "domain_age_days": number,
  "risk_signals": ["newly registered","expiring soon","privacy protected"],
  "confidence_per_section": {"whois": 0.88, "risk_signals": 0.82},
  "recommended_actions_priority_order": ["verify registrar legitimacy", "check expiry for renewal risk", "cross-reference with company-from-domain endpoint"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /tech-stack
router.post('/tech-stack', async (req: Request, res: Response) => {
  const { domain } = req.body;
  if (!domain) return res.status(400).json({ error: 'domain is required' });
  try {
    const raw = await callClaude(`Technology stack detection for domain: "${domain}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "domain": "${domain}",
  "tech_stack": {
    "cms": "string or null",
    "frontend_framework": "string or null",
    "analytics": ["string"],
    "cdn": "string or null",
    "hosting": "string or null",
    "email_provider": "string or null",
    "crm": "string or null",
    "chat_support": "string or null",
    "e_commerce": "string or null",
    "security": ["string"]
  },
  "stack_maturity": "startup|growing|enterprise",
  "detected_categories": ["string"],
  "confidence_per_section": {"tech_stack": 0.85, "stack_maturity": 0.78},
  "recommended_actions_priority_order": ["use for competitive intelligence", "check CRM for outreach compatibility", "enrich with company-enrichment API"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /company-from-domain
router.post('/company-from-domain', async (req: Request, res: Response) => {
  const { domain } = req.body;
  if (!domain) return res.status(400).json({ error: 'domain is required' });
  try {
    const raw = await callClaude(`Identify company from domain: "${domain}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "domain": "${domain}",
  "company": {
    "name": "string",
    "legal_name": "string or null",
    "industry": "string",
    "employee_count_range": "1-10|11-50|51-200|201-500|501-1000|1001-5000|5000+",
    "founded_year": number or null,
    "headquarters": "City, Country",
    "description": "string",
    "linkedin_url": "string or null",
    "twitter_handle": "string or null"
  },
  "match_confidence": 0.0,
  "alternative_companies": [{"name": "string", "confidence": 0.0}],
  "confidence_per_section": {"company": 0.87, "match_confidence": 0.85},
  "recommended_actions_priority_order": ["enrich with company-enrichment API", "find contacts via email-finder", "check due diligence"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { domain, objective } = req.body;
  if (!domain) return res.status(400).json({ error: 'domain is required' });
  const flags: string[] = [];
  if (!domain.includes('.')) flags.push('INVALID_DOMAIN_FORMAT');
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: flags.length === 0,
    domain,
    objective: objective || 'domain_research',
    next_api: 'company-enrichment',
    next_endpoint: '/enrich',
    blocking_flags: flags,
    flag_definitions: { INVALID_DOMAIN_FORMAT: 'Domain must contain a dot (e.g. example.com)' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Run /whois for registration data', 'Run /tech-stack for competitive intelligence', 'Run /company-from-domain to identify the entity'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /lookup (ONE-CALL)
router.post('/lookup', async (req: Request, res: Response) => {
  const { domain } = req.body;
  if (!domain) return res.status(400).json({ error: 'domain is required' });
  try {
    const raw = await callClaude(`Full domain intelligence for: "${domain}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "domain": "${domain}",
  "whois": {"registrar": "string", "registered_on": "YYYY-MM-DD", "expires_on": "YYYY-MM-DD", "domain_age_days": number, "registrant_country": "string"},
  "tech_stack": {"cms": "string or null", "frontend_framework": "string or null", "cdn": "string or null", "analytics": ["string"], "hosting": "string or null"},
  "company": {"name": "string", "industry": "string", "employee_count_range": "string", "headquarters": "string", "description": "string"},
  "risk_signals": ["string"],
  "risk_score": 0.0,
  "domain_quality": "premium|standard|low-quality|suspicious",
  "confidence_per_section": {"whois": 0.88, "tech_stack": 0.85, "company": 0.87},
  "recommended_actions_priority_order": ["enrich company profile", "find contacts via email-finder", "run due diligence if high-value target"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
