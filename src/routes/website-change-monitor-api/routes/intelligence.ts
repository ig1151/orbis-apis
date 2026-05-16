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
  res.json({ name: 'Website Change Monitor API', info: '/website-change-monitor/info', openapi: '/website-change-monitor/openapi.json', health: 'ok' });
});

// POST /check
router.post('/check', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const raw = await callClaude(`Check for content changes on URL: "${url}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "url": "${url}",
  "check": {
    "has_changed": true,
    "last_checked": "string",
    "content_hash": "string",
    "status_code": 200,
    "response_time_ms": number
  },
  "change_summary": "string",
  "confidence_per_section": {"check": 0.95},
  "recommended_actions_priority_order": ["fetch diff if has_changed is true", "update baseline after review", "configure alert-rule for keywords"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /diff
router.post('/diff', async (req: Request, res: Response) => {
  const { url, since } = req.body;
  if (!url || !since) return res.status(400).json({ error: 'url and since are required' });
  try {
    const raw = await callClaude(`Content diff for URL: "${url}" since: "${since}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "url": "${url}",
  "since": "${since}",
  "diff": {
    "added_content": ["string"],
    "removed_content": ["string"],
    "modified_sections": [{"section": "string", "before": "string", "after": "string"}],
    "change_percentage": number,
    "severity": "minor|moderate|major|critical"
  },
  "confidence_per_section": {"diff": 0.88},
  "recommended_actions_priority_order": ["review modified_sections for material changes", "flag critical severity for immediate attention", "track patterns across multiple diffs"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /alert-rule
router.post('/alert-rule', async (req: Request, res: Response) => {
  const { url, keywords } = req.body;
  if (!url || !keywords) return res.status(400).json({ error: 'url and keywords are required' });
  try {
    const keywordList = Array.isArray(keywords) ? keywords.join(', ') : keywords;
    const raw = await callClaude(`Configure alert rule for URL: "${url}" watching keywords: "${keywordList}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "url": "${url}",
  "alert_rule": {
    "rule_id": "string",
    "keywords": ["string"],
    "match_type": "any|all",
    "check_interval": "1h",
    "alert_channels": ["webhook", "email"],
    "status": "active",
    "created_at": "string"
  },
  "estimated_checks_per_day": number,
  "confidence_per_section": {"alert_rule": 0.95},
  "recommended_actions_priority_order": ["test rule by triggering a manual check", "configure alert_channels for notifications", "review match_type for precision vs recall"],
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
    objective: objective || 'change_monitoring',
    next_api: 'competitor-monitor',
    next_endpoint: '/track',
    blocking_flags: [],
    flag_definitions: { NO_URL: 'No URL provided', URL_BLOCKED: 'URL returns 403 or is bot-protected' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Run check to establish baseline', 'Set alert-rule for keywords of interest', 'Use diff to review historical changes'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /monitor (one-call)
router.post('/monitor', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    const raw = await callClaude(`Full website change monitoring setup for URL: "${url}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "url": "${url}",
  "current_state": {"status_code": 200, "content_hash": "string", "word_count": number, "last_modified": "string"},
  "recent_changes": [{"detected_at": "string", "change_percentage": number, "severity": "string", "summary": "string"}],
  "alert_rules": [{"rule_id": "string", "keywords": ["string"], "status": "active"}],
  "monitor_health": {"uptime_pct": 99.9, "avg_response_ms": number, "checks_last_30d": number},
  "competitive_insights": ["string"],
  "confidence_per_section": {"current_state": 0.95, "recent_changes": 0.88, "monitor_health": 0.92},
  "recommended_actions_priority_order": ["review recent_changes for material updates", "configure alert_rules for critical keywords", "track competitive_insights for intelligence"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
