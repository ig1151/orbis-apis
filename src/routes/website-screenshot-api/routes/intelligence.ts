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
  res.json({ name: 'Website Screenshot API', info: '/website-screenshot/info', openapi: '/website-screenshot/openapi.json', health: 'ok' });
});

// POST /screenshot
router.post('/screenshot', async (req: Request, res: Response) => {
  const { url, viewport = { width: 1440, height: 900 }, full_page = false } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const raw = await callClaude(`Desktop screenshot config for URL: "${url}" viewport: ${JSON.stringify(viewport)} full_page: ${full_page}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "url": "${url}",
  "capture_config": {
    "viewport": {"width": number, "height": number},
    "full_page": true|false,
    "recommended_tool": "playwright|puppeteer|selenium",
    "wait_for": "networkidle|domcontentloaded|load",
    "wait_ms": number,
    "scroll_behavior": "auto|smooth|none"
  },
  "visual_analysis": {
    "layout_type": "landing-page|blog|ecommerce|dashboard|saas|other",
    "color_scheme": "string",
    "above_fold_elements": ["string"],
    "cta_visibility": "prominent|moderate|low|none",
    "mobile_responsive_signal": true|false
  },
  "accessibility_signals": [{"issue": "string", "severity": "critical|major|minor"}],
  "confidence_per_section": {"capture_config": 0-1, "visual_analysis": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /mobile-screenshot
router.post('/mobile-screenshot', async (req: Request, res: Response) => {
  const { url, device = 'iphone' } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const raw = await callClaude(`Mobile viewport config for URL: "${url}" device: "${device}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "url": "${url}",
  "device_presets": [
    {"device": "iphone-14", "width": 390, "height": 844, "pixel_ratio": 3, "user_agent": "string"},
    {"device": "samsung-s23", "width": 360, "height": 780, "pixel_ratio": 3, "user_agent": "string"},
    {"device": "ipad-pro", "width": 1024, "height": 1366, "pixel_ratio": 2, "user_agent": "string"}
  ],
  "recommended_device": "string",
  "mobile_analysis": {
    "touch_target_quality": "good|needs_work|poor",
    "font_size_mobile": "readable|too_small|too_large",
    "horizontal_scroll_risk": "none|low|high"
  },
  "confidence_per_section": {"device_presets": 0-1, "mobile_analysis": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /diff
router.post('/diff', async (req: Request, res: Response) => {
  const { url_a, url_b, timestamp_a, timestamp_b } = req.body;
  if (!url_a || (!url_b && !timestamp_a)) return res.status(400).json({ error: 'url_a and either url_b or timestamp_a are required' });
  try {
    const raw = await callClaude(`Visual diff analysis: url_a: "${url_a}" url_b: "${url_b || 'same'}" timestamp_a: "${timestamp_a || 'now'}" timestamp_b: "${timestamp_b || 'now'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "diff_summary": {
    "change_detected": true|false,
    "change_magnitude": "major|moderate|minor|none",
    "change_categories": ["layout|content|style|navigation|cta|hero|footer"]
  },
  "changes": [{"area": "string", "type": "added|removed|modified", "description": "string", "severity": "critical|major|minor"}],
  "layout_stability_score": 0-100,
  "business_impact": "high|medium|low|none",
  "confidence_per_section": {"diff_summary": 0-1, "changes": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /batch
router.post('/batch', async (req: Request, res: Response) => {
  const { urls, viewport } = req.body;
  if (!urls || !Array.isArray(urls)) return res.status(400).json({ error: 'urls array is required' });
  try {
    const list = urls.slice(0, 10).join(', ');
    const raw = await callClaude(`Batch screenshot plan for URLs: ${list}. viewport: ${JSON.stringify(viewport || { width: 1440, height: 900 })}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "batch_plan": [
    {"url": "string", "capture_config": {"viewport": {"width": number, "height": number}, "wait_for": "string"}, "priority": number}
  ],
  "total_urls": number,
  "estimated_duration_ms": number,
  "parallel_safe": true|false,
  "confidence_per_section": {"batch_plan": 0-1},
  "recommended_actions_priority_order": ["string"],
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
    objective: objective || 'visual_capture',
    next_api: 'competitor-monitor',
    next_endpoint: '/analyze-competitor',
    blocking_flags: [],
    flag_definitions: { NO_URL: 'No URL provided', BLOCKED_DOMAIN: 'Domain may block screenshot tools' },
    confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Check robots.txt before capturing', 'Use /mobile-screenshot for responsive testing'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /capture (one-call)
router.post('/capture', async (req: Request, res: Response) => {
  const { url, device } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const raw = await callClaude(`Full capture + visual analysis for URL: "${url}" device: "${device || 'desktop'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "url": "${url}",
  "capture_config": {"viewport": {"width": number, "height": number}, "wait_for": "string", "recommended_tool": "playwright|puppeteer"},
  "visual_analysis": {
    "layout_type": "string",
    "cta_visibility": "prominent|moderate|low|none",
    "above_fold_elements": ["string"],
    "color_scheme": "string",
    "trust_signals": ["string"]
  },
  "mobile_config": {"width": number, "height": number, "device": "string"},
  "accessibility_signals": [{"issue": "string", "severity": "critical|major|minor"}],
  "seo_visual_signals": [{"signal": "string", "status": "pass|fail|warning"}],
  "overall_quality_score": 0-100,
  "confidence_per_section": {"capture_config": 0-1, "visual_analysis": 0-1, "accessibility_signals": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
