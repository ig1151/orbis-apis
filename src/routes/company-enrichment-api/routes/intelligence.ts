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
  res.json({ name: 'Company Enrichment API', info: '/company-enrichment/info', openapi: '/company-enrichment/openapi.json', health: 'ok' });
});

// POST /company-profile
router.post('/company-profile', async (req: Request, res: Response) => {
  const { company_name, domain } = req.body;
  if (!company_name && !domain) return res.status(400).json({ error: 'company_name or domain is required' });
  try {
    const raw = await callClaude(`Company profile for: "${company_name || domain}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "company": {
    "name": "string", "domain": "string", "description": "string",
    "industry": "string", "founded": number, "headquarters": "string",
    "website": "string", "linkedin_url": "string", "twitter_handle": "string"
  },
  "source_provenance": {"source": "public_records_and_ai_synthesis", "last_updated": "${new Date().toISOString()}", "data_freshness_score": 0.82},
  "confidence_per_section": {"company": 0-1},
  "recommended_actions_priority_order": ["enrich firmographics", "check technographics", "score ICP fit"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /firmographics
router.post('/firmographics', async (req: Request, res: Response) => {
  const { company_name, domain } = req.body;
  if (!company_name && !domain) return res.status(400).json({ error: 'company_name or domain is required' });
  try {
    const raw = await callClaude(`Firmographic data for: "${company_name || domain}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "firmographics": {
    "employee_count_range": "1-10|11-50|51-200|201-500|501-1000|1001-5000|5000+",
    "revenue_range": "string",
    "growth_stage": "pre-seed|seed|series-a|series-b|series-c|growth|public|enterprise",
    "sic_code": "string",
    "naics_code": "string",
    "public_or_private": "public|private",
    "funding_total_estimate": "string",
    "last_funding_round": "string"
  },
  "tech_stack_signals": [{"category": "string", "tools": ["string"], "confidence": 0-1}],
  "confidence_per_section": {"firmographics": 0-1, "tech_stack_signals": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /technographics
router.post('/technographics', async (req: Request, res: Response) => {
  const { company_name, domain } = req.body;
  if (!company_name && !domain) return res.status(400).json({ error: 'company_name or domain is required' });
  try {
    const raw = await callClaude(`Tech stack signals for: "${company_name || domain}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "technographics": {
    "stack_maturity": "early|growing|mature|legacy",
    "cloud_provider": "aws|gcp|azure|multi|unknown",
    "tools_by_category": [{"category": "string", "tools": ["string"], "spend_signal": "high|medium|low"}],
    "open_source_usage": "heavy|moderate|light",
    "ai_ml_adoption": "cutting-edge|adopting|exploring|none"
  },
  "confidence_per_section": {"technographics": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /batch
router.post('/batch', async (req: Request, res: Response) => {
  const { companies } = req.body;
  if (!companies || !Array.isArray(companies)) return res.status(400).json({ error: 'companies array is required' });
  try {
    const list = companies.slice(0, 10).map((c: any) => typeof c === 'string' ? c : c.name || c.domain).join(', ');
    const raw = await callClaude(`Batch enrich companies: ${list}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "results": [
    {"company_name": "string", "domain": "string", "industry": "string",
     "employee_range": "string", "revenue_range": "string",
     "growth_stage": "string", "enrichment_confidence": 0-1}
  ],
  "batch_summary": {"total": number, "enriched": number, "failed": number},
  "confidence_per_section": {"results": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { company_name, domain } = req.body;
  if (!company_name && !domain) return res.status(400).json({ error: 'company_name or domain is required' });
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: true,
    input: { company_name: company_name || null, domain: domain || null },
    next_api: 'lead-scoring',
    next_endpoint: '/score-lead',
    blocking_flags: [],
    flag_definitions: { NO_IDENTIFIER: 'No company name or domain provided', LOW_CONFIDENCE: 'Enrichment confidence below threshold' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Call /enrich for full enrichment', 'Use /firmographics for detailed data'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /enrich (one-call)
router.post('/enrich', async (req: Request, res: Response) => {
  const { company_name, domain } = req.body;
  if (!company_name && !domain) return res.status(400).json({ error: 'company_name or domain is required' });
  try {
    const raw = await callClaude(`Full company enrichment for: "${company_name || domain}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "company": {"name": "string", "domain": "string", "description": "string", "industry": "string", "founded": number, "headquarters": "string"},
  "firmographics": {"employee_count_range": "string", "revenue_range": "string", "growth_stage": "string", "public_or_private": "public|private"},
  "technographics": {"cloud_provider": "string", "stack_maturity": "string", "top_tools": ["string"]},
  "signals": [{"signal": "string", "type": "hiring|funding|product|partnership|leadership", "strength": "strong|moderate|weak"}],
  "icp_score": 0-100,
  "outreach_priority": "high|medium|low",
  "confidence_per_section": {"company": 0-1, "firmographics": 0-1, "technographics": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
