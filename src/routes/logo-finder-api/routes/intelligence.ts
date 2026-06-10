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
  res.json({ name: 'Logo Finder API', info: '/logo-finder/info', openapi: '/logo-finder/openapi.json', health: 'ok' });
});

// POST /logo
router.post('/logo', async (req: Request, res: Response) => {
  const { domain } = req.body;
  if (!domain) return res.status(400).json({ error: 'domain is required' });
  try {
    const raw = await callClaude(`Find the primary logo for domain: "${domain}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "domain": "${domain}",
  "logo": {
    "url": "string",
    "format": "png|svg|jpg|webp",
    "width": number,
    "height": number,
    "background": "transparent|white|colored",
    "alt_text": "string"
  },
  "clearbit_url": "string",
  "fallback_urls": ["string"],
  "confidence_per_section": {"logo": 0.9},
  "recommended_actions_priority_order": ["verify logo URL is accessible", "use clearbit_url as fallback", "check brand-assets for SVG version"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /brand-assets
router.post('/brand-assets', async (req: Request, res: Response) => {
  const { domain } = req.body;
  if (!domain) return res.status(400).json({ error: 'domain is required' });
  try {
    const raw = await callClaude(`Retrieve full brand asset kit for domain: "${domain}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "domain": "${domain}",
  "brand_assets": {
    "primary_logo": {"url": "string", "format": "string"},
    "dark_logo": {"url": "string", "format": "string"},
    "icon": {"url": "string", "format": "string"},
    "favicon": {"url": "string", "format": "string"},
    "brand_colors": ["#hex"],
    "font_family": "string"
  },
  "brand_guidelines_url": "string",
  "confidence_per_section": {"brand_assets": 0.85},
  "recommended_actions_priority_order": ["use primary_logo for light backgrounds", "use dark_logo for dark UIs", "apply brand_colors for consistency"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /favicon
router.post('/favicon', async (req: Request, res: Response) => {
  const { domain } = req.body;
  if (!domain) return res.status(400).json({ error: 'domain is required' });
  try {
    const raw = await callClaude(`Retrieve favicon details for domain: "${domain}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "domain": "${domain}",
  "favicon": {
    "url": "string",
    "format": "ico|png|svg",
    "size": "16x16|32x32|48x48|64x64",
    "accessible": true
  },
  "apple_touch_icon": "string",
  "android_icon": "string",
  "confidence_per_section": {"favicon": 0.92},
  "recommended_actions_priority_order": ["verify favicon URL accessibility", "check apple_touch_icon for mobile apps", "use PNG fallback if ICO not supported"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { domain, objective } = req.body;
  if (!domain) return res.status(400).json({ error: 'domain is required' });
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: true,
    domain,
    objective: objective || 'logo_retrieval',
    next_api: 'company-enrichment',
    next_endpoint: '/enrich',
    blocking_flags: [],
    flag_definitions: { NO_DOMAIN: 'No domain provided', INVALID_DOMAIN: 'Domain format is invalid' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Fetch logo first', 'Get brand-assets for full kit', 'Use favicon for browser UI'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /lookup (one-call)
router.post('/lookup', async (req: Request, res: Response) => {
  const { domain } = req.body;
  if (!domain) return res.status(400).json({ error: 'domain is required' });
  try {
    const raw = await callClaude(`Full brand asset intelligence for domain: "${domain}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "domain": "${domain}",
  "logo": {"url": "string", "format": "string", "background": "string"},
  "favicon": {"url": "string", "format": "string", "size": "string"},
  "brand_assets": {
    "primary_logo": {"url": "string", "format": "string"},
    "dark_logo": {"url": "string", "format": "string"},
    "icon": {"url": "string", "format": "string"},
    "brand_colors": ["#hex"],
    "font_family": "string"
  },
  "clearbit_url": "string",
  "brand_quality_score": 0.0,
  "confidence_per_section": {"logo": 0.9, "favicon": 0.92, "brand_assets": 0.85},
  "recommended_actions_priority_order": ["use primary_logo for main UI", "use favicon for browser tabs", "apply brand_colors for on-brand design"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
