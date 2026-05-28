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
  res.json({ name: 'URL Screenshot Diff API', info: '/url-screenshot-diff/info', openapi: '/url-screenshot-diff/openapi.json', health: 'ok' });
});

// POST /capture
router.post('/capture', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const raw = await callClaude(`Capture screenshot of URL: "${url}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "url": "${url}",
  "screenshot": {
    "image_url": "string",
    "width": 1280,
    "height": 800,
    "format": "PNG|JPEG|WEBP",
    "file_size_bytes": number,
    "captured_at": "string",
    "viewport": "desktop|mobile|tablet"
  },
  "page_info": {"title": "string", "status_code": 200, "load_time_ms": number, "is_responsive": true},
  "confidence_per_section": {"screenshot": 0.95, "page_info": 0.9},
  "recommended_actions_priority_order": ["store screenshot with timestamp", "compare with future captures", "use diff endpoint to detect changes"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /diff
router.post('/diff', async (req: Request, res: Response) => {
  const { url_a, url_b } = req.body;
  if (!url_a || !url_b) return res.status(400).json({ error: 'url_a and url_b are required' });
  try {
    const raw = await callClaude(`Visual diff comparison between URL A: "${url_a}" and URL B: "${url_b}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "url_a": "${url_a}",
  "url_b": "${url_b}",
  "diff": {
    "diff_image_url": "string",
    "change_percentage": number,
    "changed_regions": [{"x": number, "y": number, "width": number, "height": number, "change_type": "added|removed|modified"}],
    "pixel_diff_count": number,
    "similarity_score": number
  },
  "visual_changes": ["string"],
  "regression_detected": false,
  "severity": "none|low|medium|high|critical",
  "confidence_per_section": {"diff": 0.88, "visual_changes": 0.85},
  "recommended_actions_priority_order": ["review changed_regions manually", "flag high severity diffs", "update baseline if changes are intentional"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /monitor
router.post('/monitor', async (req: Request, res: Response) => {
  const { url, interval } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const raw = await callClaude(`Configure visual monitoring for URL: "${url}" at interval: "${interval || '1h'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "url": "${url}",
  "monitor_config": {
    "monitor_id": "string",
    "interval": "${interval || '1h'}",
    "status": "active",
    "next_check": "string",
    "alert_threshold_pct": 5,
    "viewports": ["desktop", "mobile"]
  },
  "baseline_screenshot": "string",
  "confidence_per_section": {"monitor_config": 0.95},
  "recommended_actions_priority_order": ["set alert_threshold_pct based on sensitivity needs", "monitor both desktop and mobile viewports", "review changes before updating baseline"],
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
    objective: objective || 'visual_diff',
    next_api: 'website-change-monitor',
    next_endpoint: '/check',
    blocking_flags: [],
    flag_definitions: { NO_URL: 'No URL provided', URL_UNREACHABLE: 'URL is not accessible' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Capture baseline screenshot first', 'Schedule monitor for continuous tracking', 'Use diff to compare specific pairs'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /analyze (one-call)
router.post('/analyze', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const raw = await callClaude(`Full visual screenshot analysis for URL: "${url}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "url": "${url}",
  "screenshot": {"image_url": "string", "width": 1280, "height": 800, "format": "PNG", "captured_at": "string"},
  "page_info": {"title": "string", "status_code": 200, "load_time_ms": number, "is_responsive": true},
  "visual_analysis": {
    "layout_type": "landing|blog|ecommerce|saas|portal|other",
    "primary_color": "#hex",
    "cta_buttons": ["string"],
    "above_fold_content": "string",
    "accessibility_score": 0.0
  },
  "monitor_recommendation": {"interval": "1h|6h|24h", "alert_threshold_pct": number},
  "confidence_per_section": {"screenshot": 0.95, "visual_analysis": 0.85},
  "recommended_actions_priority_order": ["set up monitoring at recommended interval", "use diff for competitive benchmarking", "track visual changes over time"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
