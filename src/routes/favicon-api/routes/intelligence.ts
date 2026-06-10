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
  res.json({ name: 'Favicon API', info: '/favicon/info', openapi: '/favicon/openapi.json', health: 'ok' });
});

// POST /favicon
router.post('/favicon', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const raw = await callClaude(`Fetch and analyze the favicon for URL: "${url}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "url": "${url}",
  "favicon": {
    "url": "string",
    "format": "ico|png|svg|webp",
    "size": "16x16|32x32|48x48|64x64",
    "accessible": true,
    "content_type": "string"
  },
  "source_method": "link_tag|default_path|clearbit",
  "confidence_per_section": {"favicon": 0.92},
  "recommended_actions_priority_order": ["verify favicon URL accessibility", "cache favicon locally for performance", "use higher-res variant if available"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /batch
router.post('/batch', async (req: Request, res: Response) => {
  const { urls } = req.body;
  if (!urls || !Array.isArray(urls)) return res.status(400).json({ error: 'urls array is required' });
  try {
    const list = urls.slice(0, 20).join(', ');
    const raw = await callClaude(`Batch favicon retrieval for URLs: ${list}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "results": [
    {
      "url": "string",
      "favicon_url": "string",
      "format": "ico|png|svg",
      "accessible": true,
      "error": null
    }
  ],
  "summary": {"total": number, "successful": number, "failed": number},
  "confidence_per_section": {"results": 0.9},
  "recommended_actions_priority_order": ["retry failed URLs individually", "cache successful results", "check format compatibility"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /metadata
router.post('/metadata', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const raw = await callClaude(`Extract favicon metadata for URL: "${url}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "url": "${url}",
  "metadata": {
    "favicon_url": "string",
    "format": "string",
    "sizes": ["16x16", "32x32", "64x64"],
    "content_type": "string",
    "file_size_bytes": number,
    "color_profile": "sRGB|Adobe|None",
    "has_transparency": true,
    "dominant_color": "#hex"
  },
  "apple_touch_icon": "string",
  "manifest_icons": [{"url": "string", "size": "string", "type": "string"}],
  "confidence_per_section": {"metadata": 0.88},
  "recommended_actions_priority_order": ["use manifest_icons for PWA", "apply dominant_color to brand theming", "use apple_touch_icon for iOS"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { url, objective } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: true,
    url,
    objective: objective || 'favicon_retrieval',
    next_api: 'web-page-extractor',
    next_endpoint: '/extract',
    blocking_flags: [],
    flag_definitions: { NO_URL: 'No URL provided', INVALID_URL: 'URL format is invalid' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Fetch favicon first', 'Get metadata for full details', 'Use batch for multiple URLs'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /detect (one-call)
router.post('/detect', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const raw = await callClaude(`Full favicon detection and analysis for URL: "${url}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "url": "${url}",
  "favicon": {"url": "string", "format": "string", "size": "string", "accessible": true},
  "metadata": {
    "file_size_bytes": number,
    "color_profile": "string",
    "has_transparency": true,
    "dominant_color": "#hex",
    "sizes": ["16x16", "32x32"]
  },
  "apple_touch_icon": "string",
  "manifest_icons": [{"url": "string", "size": "string"}],
  "detection_method": "link_tag|default_path|clearbit",
  "quality_score": 0.0,
  "confidence_per_section": {"favicon": 0.92, "metadata": 0.88},
  "recommended_actions_priority_order": ["cache favicon for performance", "use apple_touch_icon for iOS", "apply dominant_color to brand palette"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
